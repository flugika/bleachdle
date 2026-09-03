// app/api/sync/completed/route.ts
//
// Returns every player_completed row for the authenticated player, grouped
// by (game_mode, game_type). Used exclusively by syncStateOnLoad.ts to
// reconcile localStorage's completedData against server truth on every
// page load — this is the piece that was missing before: player_completed
// was being WRITTEN on every win (via apply_game_result), but nothing ever
// read it back into the client.
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
        .from('player_completed')
        .select('game_mode, game_type, completed_key')
        .eq('player_id', playerId);

    if (error) {
        console.error('[sync/completed] query failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    return NextResponse.json({ completed: data ?? [] });
}