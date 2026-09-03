// app/api/pair/devices/route.ts
//
// Device management: list every device linked to the current player
// (GET), and remove a specific OTHER device from the account (DELETE).
// This is the counterpart to /api/device/unlink — that endpoint removes
// *this* device from the account; this endpoint lets you remove *another*
// device (e.g. "I lost my old phone, kick it off my account").
//
// Deliberately cannot remove the device making the request (use
// /api/device/unlink for that) — prevents a confusing state where a
// device deletes its own row via this path and then has no cookie
// resolution but also didn't get reprovisioned.
//
// 🆕 GET now also returns device_label so the client can show "Chrome ·
// Windows" instead of a bare device UUID.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';

const DeleteSchema = z.object({
    deviceId: z.string().uuid(),
});

export async function GET(req: NextRequest) {
    if (!edgeRateLimit(getRateLimitKey(req), 20, 10_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const currentDeviceId = req.cookies.get(DEVICE_ID_COOKIE)?.value ?? null;

    const { data, error } = await supabaseServer
        .from('player_devices')
        .select('device_id, device_label, linked_at, last_seen_at')
        .eq('player_id', playerId)
        .order('last_seen_at', { ascending: false });

    if (error) {
        console.error('[pair/devices GET] query failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    const devices = (data ?? []).map((d) => ({ ...d, isCurrentDevice: d.device_id === currentDeviceId }));

    return NextResponse.json({ devices });
}

export async function DELETE(req: NextRequest) {
    if (!verifySameOrigin(req)) {
        return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    }

    if (!edgeRateLimit(getRateLimitKey(req), 10, 60_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const currentDeviceId = req.cookies.get(DEVICE_ID_COOKIE)?.value;

    const parsed = DeleteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.deviceId === currentDeviceId) {
        return NextResponse.json(
            { error: 'cannot remove the device you are currently using — use device/unlink instead' },
            { status: 400 }
        );
    }

    const { error, count } = await supabaseServer
        .from('player_devices')
        .delete({ count: 'exact' })
        .eq('device_id', parsed.data.deviceId)
        .eq('player_id', playerId);

    if (error) {
        console.error('[pair/devices DELETE] delete failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    if (!count) {
        return NextResponse.json({ error: 'device not found on this account' }, { status: 404 });
    }

    return NextResponse.json({ status: 'removed' });
}