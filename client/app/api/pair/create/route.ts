// app/api/pair/create/route.ts
//
// 🆕 Turnstile required on every call — unlike device/init, this is
// already gated behind a deliberate button click ("Generate Code"), not a
// passive page load, so there's no "don't challenge returning visitors"
// concern here. Always require a token.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { verifyTurnstileToken } from '@/src/lib/turnstile/verifyTurnstileToken';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import { edgeRateLimit, getClientIp, getRateLimitKey } from '@/src/lib/rateLimit';

const Schema = z.object({
    turnstileToken: z.string().min(1, 'turnstile token required'),
});

export async function POST(req: NextRequest) {
    if (!verifySameOrigin(req)) {
        return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    }

    if (!edgeRateLimit(getRateLimitKey(req), 5, 60_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const deviceId = req.cookies.get(DEVICE_ID_COOKIE)?.value;
    if (!deviceId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: 'verification required' }, { status: 400 });
    }

    const turnstileOk = await verifyTurnstileToken(parsed.data.turnstileToken, getClientIp(req));
    if (!turnstileOk) {
        return NextResponse.json({ error: 'verification failed' }, { status: 403 });
    }

    const { data, error } = await supabaseServer.rpc('create_pairing_code', {
        p_player_id: playerId,
        p_device_id: deviceId,
    });

    if (error) {
        if (error.message?.includes('too many pairing codes')) {
            return NextResponse.json(
                { error: 'too many pairing codes created recently — please try again later' },
                { status: 429 }
            );
        }
        console.error('[pair/create] rpc failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    if (!data?.[0]) {
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    const { code, expires_at } = data[0];
    return NextResponse.json({ code, expiresAt: expires_at });
}