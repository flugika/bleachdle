// app/api/pair/confirm/route.ts
//
// 🆕 v3 changes:
//   1. Now calls carry_over_pairing_data() before confirm_pairing() — fixes
//      a real bug where modes device B had played SOLO (no conflict with A,
//      the UI's "carries over as-is" cases) were never actually copied to
//      player A. Also fixes player_completed never being merged at all
//      (any choice), and player_soul_registry.reincarnation_count never
//      being merged. See 15_pairing_full_carryover.sql.
//   2. Origin header check added (defense-in-depth on top of SameSite=Lax).
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import {
    resolvePlayerFromCookie,
    DEVICE_SECRET_COOKIE,
    COOKIE_OPTS,
} from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { generateDeviceSecret, hashDeviceSecret } from '@/src/lib/auth/hmac';
import { parseUserAgent } from '@/src/lib/auth/parseUserAgent';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';

const Schema = z.object({
    code: z.string().regex(/^\d{6}$/),
    keepChoices: z
        .array(
            z.object({
                gameMode: z.string(),
                gameType: z.enum(['daily', 'unlimited']),
                keep: z.enum(['A', 'B']),
            })
        )
        .max(50),
});

export async function POST(req: NextRequest) {
    if (!verifySameOrigin(req)) {
        return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    }

    if (!edgeRateLimit(getRateLimitKey(req), 5, 60_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerBId = await resolvePlayerFromCookie(req);
    if (!playerBId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const deviceBId = req.cookies.get(DEVICE_ID_COOKIE)?.value;
    if (!deviceBId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { data: codeRow, error: codeErr } = await supabaseServer
        .from('pairing_codes')
        .select('player_id, consumed_at, expires_at, attempt_count, max_attempts')
        .eq('code', parsed.data.code)
        .maybeSingle();

    if (codeErr || !codeRow || codeRow.consumed_at || new Date(codeRow.expires_at) < new Date()) {
        return NextResponse.json({ error: 'invalid or expired code' }, { status: 400 });
    }

    if (codeRow.attempt_count >= codeRow.max_attempts) {
        return NextResponse.json({ error: 'code locked after too many attempts' }, { status: 400 });
    }

    const playerAId = codeRow.player_id as string;

    // 🆕 the actual fix — one RPC call handles solo-B carry-over,
    // player_completed union, and reincarnation_count max-merge, all
    // BEFORE the device gets re-pointed. keepChoices filtered to only the
    // 'B' entries since that's the only signal this RPC needs (an 'A'
    // choice is a no-op server-side).
    const keepBModes = parsed.data.keepChoices
        .filter((c) => c.keep === 'B')
        .map((c) => ({ gameMode: c.gameMode, gameType: c.gameType }));

    const { error: carryOverErr } = await supabaseServer.rpc('carry_over_pairing_data', {
        p_player_a_id: playerAId,
        p_player_b_id: playerBId,
        p_keep_b_modes: keepBModes,
    });

    if (carryOverErr) {
        console.error('[pair/confirm] carry-over failed:', carryOverErr);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    const newSecret = generateDeviceSecret();
    const newSecretHash = hashDeviceSecret(newSecret);
    const deviceLabel = parseUserAgent(req.headers.get('user-agent'));

    const { data: linkedPlayerId, error: linkErr } = await supabaseServer.rpc('confirm_pairing', {
        p_code: parsed.data.code,
        p_device_b_id: deviceBId,
        p_device_b_secret_hash: newSecretHash,
        p_device_b_label: deviceLabel,
    });

    if (linkErr || !linkedPlayerId) {
        console.error('[pair/confirm] link failed:', linkErr);
        return NextResponse.json({ error: 'pairing failed, please try again' }, { status: 409 });
    }

    // 🆕 don't echo player_id back to the client — every endpoint resolves
    // it server-side from the cookie, the client has no legitimate use for
    // it, and returning it violates the "player_id never reaches JS"
    // principle every other route in this feature follows
    const res = NextResponse.json({ status: 'linked' });
    res.cookies.set(DEVICE_SECRET_COOKIE, newSecret, COOKIE_OPTS);
    return res;
}