// app/api/sync/result/route.ts
//
// 🆕 roundKey is now required and passed straight through to
// apply_game_result(), which enforces the actual replay protection via a
// unique constraint (see 003_replay_protection.sql). This route's job is
// just format validation of round_key so obviously-malformed values don't
// even reach the RPC — the RPC is what actually stops duplicates, this is
// a cheap pre-filter.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';

const GAME_MODES = ['character', 'song', 'silhouette', 'release', 'emoji', 'quote'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const Schema = z
    .object({
        gameMode: z.enum(GAME_MODES),
        gameType: z.enum(['daily', 'unlimited']),
        roundKey: z.string().min(1).max(128),
        isWin: z.boolean(),
        guessCount: z.number().int().min(0).max(20),
    })
    .refine(
        (data) => (data.gameType === 'daily' ? DATE_RE.test(data.roundKey) : true),
        { message: 'roundKey must be a YYYY-MM-DD date for daily rounds', path: ['roundKey'] }
    );

export async function POST(req: NextRequest) {
    if (!edgeRateLimit(getRateLimitKey(req), 10, 10_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { data, error } = await supabaseServer.rpc('apply_game_result', {
        p_player_id: playerId,
        p_game_mode: parsed.data.gameMode,
        p_game_type: parsed.data.gameType,
        p_round_key: parsed.data.roundKey,
        p_is_win: parsed.data.isWin,
        p_guess_count: parsed.data.guessCount,
    });

    if (error) {
        console.error('[sync/result] rpc failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    // data = { stats, replay: boolean } — replay:true means this exact round
    // was already recorded server-side; the client should treat it as a
    // normal success (idempotent), not surface an error to the player.
    return NextResponse.json(data);
}