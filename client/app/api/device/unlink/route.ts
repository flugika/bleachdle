// app/api/device/unlink/route.ts
//
// "Unlink this device" — the device stops being part of the current
// player's account and gets reprovisioned as a fresh, solo player+device,
// same as a brand-new first visit. This is the safe default for "I paired
// with the wrong person" / "I want to start fresh on this device": it
// never touches the OTHER device's link (device A keeps its player_id
// untouched), and never deletes the player row itself (other devices still
// linked to that player are unaffected) — it only removes THIS device's
// row and gives it a new identity.
//
// Deliberately does not accept a player_id or device_id in the body: the
// device being unlinked is always "whoever's cookie is making this
// request," same rule as every other endpoint in this feature.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import {
    resolvePlayerFromCookie,
    provisionNewPlayerDevice,
    DEVICE_SECRET_COOKIE,
    COOKIE_OPTS,
} from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';

export async function POST(req: NextRequest) {
    if (!verifySameOrigin(req)) {
        return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    }

    if (!edgeRateLimit(getRateLimitKey(req), 5, 60_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    const deviceId = req.cookies.get(DEVICE_ID_COOKIE)?.value;
    if (!playerId || !deviceId) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const { error: deleteError } = await supabaseServer
        .from('player_devices')
        .delete()
        .eq('device_id', deviceId);

    if (deleteError) {
        console.error('[device/unlink] delete failed:', deleteError);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    // Reprovision immediately so the device isn't left in a broken
    // "cookie set but no matching row" state — next request would just
    // 401 forever otherwise. This mirrors exactly what /api/device/init
    // does for a true first visit.
    try {
        const fresh = await provisionNewPlayerDevice();
        const res = NextResponse.json({ status: 'unlinked' });
        res.cookies.set(DEVICE_ID_COOKIE, fresh.deviceId, COOKIE_OPTS);
        res.cookies.set(DEVICE_SECRET_COOKIE, fresh.deviceSecret, COOKIE_OPTS);
        return res;
    } catch (err) {
        console.error('[device/unlink] reprovision failed:', err);
        // device row is already gone at this point — clear cookies so the
        // client doesn't keep sending a dead device_id, and let the next
        // page load's bootstrap call /api/device/init to fix itself
        const res = NextResponse.json({ error: 'unlinked but reprovision failed, reload the page' }, { status: 500 });
        res.cookies.delete(DEVICE_ID_COOKIE);
        res.cookies.delete(DEVICE_SECRET_COOKIE);
        return res;
    }
}