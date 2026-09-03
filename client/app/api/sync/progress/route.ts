// app/api/sync/progress/route.ts

// 🆕 force-dynamic — this route reads/writes live player_progress on every
// request and must never be cached (statically optimized or ISR'd). Without
// this, GET can return a stale snapshot to the client after POST already
// wrote a newer target_id — this is what was causing "sync says done, but
// shows the old target until F5".
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 🆕 guesses schema relaxed to z.array(z.unknown()) — previously required
// { guess, status: 'correct'|'wrong' } which excluded character mode
// (shape is { guess, result: ComparisonOutcome }). This is safe to relax
// because progress is never read by any streak/anti-cheat logic — it's
// purely "let a second device see where a round stands." Size/count caps
// still apply so this can't be used to smuggle an arbitrarily large blob.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';

const GAME_MODES = ['character', 'song', 'silhouette', 'release', 'emoji', 'quote'] as const;

const PostSchema = z.object({
    gameMode: z.enum(GAME_MODES),
    gameType: z.enum(['daily', 'unlimited']),
    targetId: z.string().max(128).nullable(),
    // 🆕 generic — capped count + capped serialized size, not shape-validated
    guesses: z.array(z.unknown()).max(50),
});

const MAX_PAYLOAD_BYTES = 20_000; // generous for 50 guesses of any mode's shape

const GetQuerySchema = z.object({
    gameMode: z.enum(GAME_MODES),
    gameType: z.enum(['daily', 'unlimited']),
});

export async function POST(req: NextRequest) {
    if (!edgeRateLimit(getRateLimitKey(req), 20, 10_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const rawBody = await req.text();
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
        return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    }

    const parsed = PostSchema.safeParse(JSON.parse(rawBody || 'null'));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { gameMode, gameType, targetId, guesses } = parsed.data;

    // 🆕 only bump target_started_at when target_id actually changed — a
    // debounced re-push of the SAME round must NOT reset the clock, or the
    // apply_game_result timing check becomes trivially bypassable (push
    // progress right before submitting, every time).
    const { data: existing } = await supabaseServer
        .from('player_progress')
        .select('target_id, target_started_at')
        .eq('player_id', playerId)
        .eq('game_mode', gameMode)
        .eq('game_type', gameType)
        .maybeSingle();

    const targetChanged = !existing || existing.target_id !== targetId;
    const targetStartedAt = targetChanged ? new Date().toISOString() : existing.target_started_at;

    const { error } = await supabaseServer.from('player_progress').upsert({
        player_id: playerId,
        game_mode: gameMode,
        game_type: gameType,
        target_id: targetId,
        target_started_at: targetStartedAt,
        guesses,
        updated_at: new Date().toISOString(),
    });

    if (error) {
        console.error('[sync/progress POST] upsert failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok' });
}

export async function GET(req: NextRequest) {
    if (!edgeRateLimit(getRateLimitKey(req), 30, 10_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const url = new URL(req.url);
    const parsed = GetQuerySchema.safeParse({
        gameMode: url.searchParams.get('gameMode'),
        gameType: url.searchParams.get('gameType'),
    });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { data, error } = await supabaseServer
        .from('player_progress')
        .select('target_id, guesses, updated_at')
        .eq('player_id', playerId)
        .eq('game_mode', parsed.data.gameMode)
        .eq('game_type', parsed.data.gameType)
        .maybeSingle();

    if (error) {
        console.error('[sync/progress GET] query failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    return NextResponse.json({ progress: data ?? null });
}