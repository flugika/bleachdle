// src/lib/auth/resolvePlayer.ts
//
// Every protected API route calls resolvePlayerFromCookie(req) FIRST, before
// touching the request body. This is the only place player_id gets resolved
// from a credential — there is no other path (no player_id accepted as a
// body/query param anywhere in this feature). That's the whole point: even
// if someone reads a player_id UUID off the wire, it's useless to them
// without the matching device_secret cookie, which is httpOnly and never
// exposed to JS.
//
// Uses the project's existing `supabaseServer` client (src/lib/supabase-server.ts)
// rather than a separate factory — that client already has the correct env
// var fallback chain (SUPABASE_URL → NEXT_PUBLIC_SUPABASE_URL) and a
// 'server-only' import guard, no need to duplicate that logic here.

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { verifyDeviceSecret, hashDeviceSecret, generateDeviceSecret } from './hmac';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';

export const DEVICE_SECRET_COOKIE = 'bl_device_secret'; // httpOnly, the actual bearer credential

export const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 400, // ~400 days, browser cap anyway
};

// device_id cookie doesn't need httpOnly (it's not a secret, just an
// identifier) but there's no upside to letting JS read it either — keep it
// httpOnly too for consistency and to reduce XSS-readable surface area.
export const DEVICE_ID_COOKIE_OPTS = COOKIE_OPTS;

/**
 * Resolves player_id from the request's cookies. Returns null if there's no
 * cookie pair, the device isn't linked to a player, or the secret doesn't
 * match the stored hash. Callers must treat null as "unauthenticated" — do
 * not fall back to any other identity source.
 */
export async function resolvePlayerFromCookie(req: NextRequest): Promise<string | null> {
    const deviceId = req.cookies.get(DEVICE_ID_COOKIE)?.value;
    const deviceSecret = req.cookies.get(DEVICE_SECRET_COOKIE)?.value;
    if (!deviceId || !deviceSecret) return null;

    const { data, error } = await supabaseServer
        .from('player_devices')
        .select('player_id, device_secret_hash')
        .eq('device_id', deviceId)
        .maybeSingle();

    if (error || !data) return null;
    if (!verifyDeviceSecret(deviceSecret, data.device_secret_hash)) return null;

    // best-effort last_seen touch, don't block the request on it
    supabaseServer
        .from('player_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('device_id', deviceId)
        .then(() => { }, () => { });

    return data.player_id as string;
}

/**
 * First-visit bootstrap: creates a new player + device + secret, returns the
 * raw secret (caller sets it as an httpOnly cookie — this function never
 * writes response headers itself, keeps it testable/pure).
 */
export async function provisionNewPlayerDevice(deviceLabel?: string | null): Promise<{
    playerId: string;
    deviceId: string;
    deviceSecret: string;
}> {
    const { data: player, error: playerErr } = await supabaseServer
        .from('players')
        .insert({})
        .select('id')
        .single();
    if (playerErr || !player) throw new Error('failed to provision player');

    const deviceId = crypto.randomUUID();
    const deviceSecret = generateDeviceSecret();
    const deviceSecretHash = hashDeviceSecret(deviceSecret);

    const { error: deviceErr } = await supabaseServer.from('player_devices').insert({
        device_id: deviceId,
        player_id: player.id,
        device_secret_hash: deviceSecretHash,
        device_label: deviceLabel ?? null,
    });
    if (deviceErr) throw new Error('failed to provision device');

    return { playerId: player.id as string, deviceId, deviceSecret };
}