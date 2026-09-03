// app/api/device/init/route.ts
//
// 🆕 v3 changes:
//   - Two-phase Turnstile: a request with no cookie AND no turnstileToken
//     gets a 400 {error:'turnstile_required'} response instead of being
//     provisioned or hard-rejected — the client then solves a Turnstile
//     challenge and retries with the token. Returning visitors (valid
//     cookie already) NEVER see this — no unnecessary challenge on every
//     page load, only genuinely new devices trigger it. This is the actual
//     bot defense: the IP-based DB cap (013) limits *volume* from a given
//     source, Turnstile stops *scriptability* of provisioning entirely.
//   - device_label backfill: if an already-provisioned device has no label
//     (e.g. provisioned before device_label existed), opportunistically
//     fill it in from the current User-Agent on this check-in — self-heals
//     "DEVICE 402BEB18"-style entries in Manage without a migration job.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import {
    resolvePlayerFromCookie,
    provisionNewPlayerDevice,
    DEVICE_SECRET_COOKIE,
    COOKIE_OPTS,
} from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { hashIp } from '@/src/lib/auth/hmac';
import { parseUserAgent } from '@/src/lib/auth/parseUserAgent';
import { verifyTurnstileToken } from '@/src/lib/turnstile/verifyTurnstileToken';
import { edgeRateLimit, getClientIp, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';

const Schema = z.object({
    turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
    if (!verifySameOrigin(req)) {
        return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    }

    if (!edgeRateLimit(getRateLimitKey(req), 10, 10_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const clientIp = getClientIp(req);
    const deviceLabel = parseUserAgent(req.headers.get('user-agent'));

    const existingPlayerId = await resolvePlayerFromCookie(req);
    if (existingPlayerId) {
        // 🆕 opportunistic label backfill — cheap, only writes when null
        const existingDeviceId = req.cookies.get(DEVICE_ID_COOKIE)?.value;
        if (existingDeviceId) {
            supabaseServer
                .from('player_devices')
                .update({ device_label: deviceLabel })
                .eq('device_id', existingDeviceId)
                .is('device_label', null)
                .then(() => { }, () => { });
        }
        return NextResponse.json({ status: 'existing' });
    }

    const parsed = Schema.safeParse(await req.json().catch(() => ({})));
    const token = parsed.success ? parsed.data.turnstileToken : undefined;

    // 🆕 phase 1: no token yet → tell the client to go solve a challenge,
    // don't provision and don't reject outright
    if (!token) {
        return NextResponse.json({ error: 'turnstile_required' }, { status: 400 });
    }

    // 🆕 phase 2: token present → verify before provisioning
    const turnstileOk = await verifyTurnstileToken(token, clientIp);
    if (!turnstileOk) {
        return NextResponse.json({ error: 'verification failed' }, { status: 403 });
    }

    const ipHash = hashIp(clientIp);
    const { data: allowed, error: capError } = await supabaseServer.rpc(
        'check_and_log_provision_attempt',
        { p_ip_hash: ipHash }
    );

    if (capError) {
        console.error('[device/init] provisioning cap check failed:', capError);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
    if (!allowed) {
        return NextResponse.json(
            { error: 'too many new devices from this network recently, please try again later' },
            { status: 429 }
        );
    }

    try {
        const { deviceId, deviceSecret } = await provisionNewPlayerDevice(deviceLabel);

        const res = NextResponse.json({ status: 'created' });
        res.cookies.set(DEVICE_ID_COOKIE, deviceId, COOKIE_OPTS);
        res.cookies.set(DEVICE_SECRET_COOKIE, deviceSecret, COOKIE_OPTS);
        return res;
    } catch (err) {
        console.error('[device/init] provisioning failed:', err);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
}