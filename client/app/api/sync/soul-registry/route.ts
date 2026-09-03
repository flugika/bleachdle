// app/api/sync/soul-registry/route.ts
//
// Returns every player_soul_registry row (reincarnation_count per mode) for
// the authenticated player. Used by syncStateOnLoad.ts to reconcile
// SOUL_REGISTRY.*.count in localStorage — previously reincarnation_count
// only ever moved forward optimistically on the client and was NEVER
// corrected from server truth on load, unlike stats/completed which are.
// A failed (offline) reincarnate() call would leave local count permanently
// ahead of server with no way to self-heal until now.
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
        .from('player_soul_registry')
        .select('game_mode, reincarnation_count')
        .eq('player_id', playerId);

    if (error) {
        console.error('[sync/soul-registry] query failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    return NextResponse.json({ registry: data ?? [] });
}