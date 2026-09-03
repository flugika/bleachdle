// app/api/sync/reincarnate/route.ts
//
// Called when the local pool is exhausted and the player confirms
// "reincarnate" in Central46ConfidentialArchive — server counterpart of
// hardReset()/resetStreakKeepMax(). Resets current_streak to 0 (keeps
// max_streak), wipes player_completed for this mode/unlimited so the pool
// refills, and increments reincarnation_count. All in one RPC transaction
// (see reincarnate() in 005_completion_and_reincarnation.sql) so a partial
// failure can't leave streak reset but completed-pool not cleared, etc.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';

const GAME_MODES = ['character', 'song', 'silhouette', 'release', 'emoji', 'quote'] as const;

const Schema = z.object({
    gameMode: z.enum(GAME_MODES),
});

export async function POST(req: NextRequest) {
    if (!verifySameOrigin(req)) {
        return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    }

    // reincarnation is a rare, deliberate action (only reachable after
    // exhausting an entire mode's pool) — tight limit is fine and mostly
    // just guards against a broken retry loop, not a real attack surface
    if (!edgeRateLimit(getRateLimitKey(req), 5, 60_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { data, error } = await supabaseServer.rpc('reincarnate', {
        p_player_id: playerId,
        p_game_mode: parsed.data.gameMode,
    });

    if (error) {
        console.error('[sync/reincarnate] rpc failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    return NextResponse.json(data);
}