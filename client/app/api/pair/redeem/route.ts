// app/api/pair/redeem/route.ts
//
// 🆕 v2: Turnstile required — closes the distributed-guessing gap (many
// IPs each trying one random code, bypassing the per-code attempt_count
// lock since each IP only tries a given code once). Also added Origin
// header check (defense-in-depth).
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { verifyTurnstileToken } from '@/src/lib/turnstile/verifyTurnstileToken';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import { edgeRateLimit, getClientIp, getRateLimitKey } from '@/src/lib/rateLimit';

const Schema = z.object({
    code: z.string().regex(/^\d{6}$/, 'must be a 6-digit code'),
    turnstileToken: z.string().min(1, 'turnstile token required'),
});

export async function POST(req: NextRequest) {
    if (!verifySameOrigin(req)) {
        return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    }

    if (!edgeRateLimit(getRateLimitKey(req), 8, 60_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerBId = await resolvePlayerFromCookie(req);
    if (!playerBId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const turnstileOk = await verifyTurnstileToken(parsed.data.turnstileToken, getClientIp(req));
    if (!turnstileOk) {
        return NextResponse.json({ error: 'verification failed' }, { status: 403 });
    }

    const { data: playerAId, error } = await supabaseServer.rpc('check_pairing_code', {
        p_code: parsed.data.code,
    });

    if (error) {
        console.error('[pair/redeem] rpc failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
    if (!playerAId) {
        return NextResponse.json({ error: 'invalid or expired code' }, { status: 400 });
    }

    if (playerAId === playerBId) {
        return NextResponse.json({ error: 'cannot pair a device with itself' }, { status: 400 });
    }

    const [{ data: statsA }, { data: statsB }, { data: codeRow }] = await Promise.all([
        supabaseServer.from('player_stats').select('*').eq('player_id', playerAId),
        supabaseServer.from('player_stats').select('*').eq('player_id', playerBId),
        supabaseServer
            .from('pairing_codes')
            .select('created_by_device_id')
            .eq('code', parsed.data.code)
            .maybeSingle(),
    ]);

    let deviceALabel: string | null = null;
    if (codeRow?.created_by_device_id) {
        const { data: deviceARow } = await supabaseServer
            .from('player_devices')
            .select('device_label')
            .eq('device_id', codeRow.created_by_device_id)
            .maybeSingle();
        deviceALabel = deviceARow?.device_label ?? null;
    }

    return NextResponse.json({
        valid: true,
        code: parsed.data.code,
        deviceA: { stats: statsA ?? [], deviceLabel: deviceALabel },
        deviceB: { stats: statsB ?? [] },
    });
}