// app/api/sync/stats/route.ts
//
// Returns every player_stats row for the authenticated player, across all
// game modes and types. Used by pullServerStats.ts right after a successful
// pairing confirm — that's the one moment stats genuinely need to jump
// (device B just got attached to device A's/player's account and the
// numbers on screen are stale local ones).
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';

export async function GET(req: NextRequest) {
    if (!edgeRateLimit(getRateLimitKey(req), 10, 10_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const { data, error } = await supabaseServer
        .from('player_stats')
        .select('game_mode, game_type, current_streak, max_streak, played_count, passed_count, guess_distribution')
        .eq('player_id', playerId);

    if (error) {
        console.error('[sync/stats] query failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    return NextResponse.json({ stats: data ?? [] });
}