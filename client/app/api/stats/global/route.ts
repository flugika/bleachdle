// src/app/api/stats/global/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';
import { getRateLimitKey, edgeRateLimit } from '@/src/lib/rateLimit';
import { VALID_STAT_MODES, type StatMode } from '@/src/entities/stats/types';
import { logApiEvent } from "@/src/services/monitor/logEvent";
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer'; // 🆕

export const revalidate = 60;

const ENDPOINT = 'stats.global';

type RawModeStat = {
    played: number;
    passed: number;
    guess_distribution: Record<string, number>;
};

type RawGlobalStats = Partial<Record<StatMode, RawModeStat>>;

function winRate(s: RawModeStat | undefined): number {
    if (!s) return 0;
    const total = s.played + s.passed;
    return total === 0 ? 0 : Math.round((s.played / total) * 1000) / 10;
}

function avgGuesses(s: RawModeStat | undefined): number | null {
    if (!s) return null;
    let totalGuesses = 0;
    let totalSolves = 0;
    for (const [bucket, count] of Object.entries(s.guess_distribution ?? {})) {
        if (bucket === 'fail') continue;
        const n = Number(bucket);
        if (!Number.isFinite(n)) continue;
        totalGuesses += n * count;
        totalSolves += count;
    }
    return totalSolves === 0 ? null : Math.round((totalGuesses / totalSolves) * 10) / 10;
}

function buildTickerStats(global: RawGlobalStats) {
    const ticker: Record<string, { played: number; passed: number; win_rate: number; avg_guesses: number | null }> = {};
    for (const mode of VALID_STAT_MODES) {
        const s = global[mode];
        if (!s) continue;
        ticker[mode] = {
            played: s.played,
            passed: s.passed,
            win_rate: winRate(s),
            avg_guesses: avgGuesses(s),
        };
    }
    return ticker;
}

export async function GET(req: NextRequest) {
    const limitKey = getRateLimitKey(req);
    const isAllowed = edgeRateLimit(limitKey, 30, 10000);
    if (!isAllowed) {
        console.warn(`[stats/global] Rate limit exceeded for IP: ${limitKey}`);
        logApiEvent(ENDPOINT, 'warning', 429, 'rate_limited');
        return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429 });
    }

    const dimensionParam = req.nextUrl.searchParams.get('dimension');
    const dimension: 'daily' | 'unlimited' = dimensionParam === 'unlimited' ? 'unlimited' : 'daily';

    // ── DAILY: unchanged — this stays a true cross-player aggregate,
    // because daily is one shared puzzle everyone plays that day. ──
    if (dimension === 'daily') {
        const { data, error } = await supabaseServer.rpc('get_global_stats_today', { p_date: getTodayStr() });
        if (error) {
            console.error('[stats/global] RPC get_global_stats_today failed:', error);
            logApiEvent(ENDPOINT, 'error', 500, error.message);
            return NextResponse.json({ error: 'Failed to load global stats' }, { status: 500 });
        }
        const global: RawGlobalStats = data ?? {};
        logApiEvent(ENDPOINT, 'success', 200);
        return NextResponse.json({
            dimension,
            global,
            globalTickerStats: buildTickerStats(global),
            topSouls: [] as { name: string; cycles: number }[],
        });
    }

    // ── UNLIMITED: per-player only. No SUM across players — each player's
    // unlimited progress is their own, not a shared daily puzzle. ──
    const playerId = await resolvePlayerFromCookie(req); // 🆕 real impl, not the guessed one

    if (!playerId) {
        // No linked device yet — not an error, just nothing to show server-side.
        // Client already has a localStorage fallback for this case.
        logApiEvent(ENDPOINT, 'success', 200, 'no_linked_player');
        return NextResponse.json({
            dimension,
            global: {},
            globalTickerStats: {},
            topSouls: [] as { name: string; cycles: number }[],
        });
    }

    const { data, error } = await supabaseServer.rpc('get_player_stats', {
        p_player_id: playerId,
        p_game_type: 'unlimited',
    });

    if (error) {
        console.error('[stats/global] RPC get_player_stats failed:', error);
        logApiEvent(ENDPOINT, 'error', 500, error.message);
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }

    const global: RawGlobalStats = data ?? {};

    logApiEvent(ENDPOINT, 'success', 200);
    return NextResponse.json({
        dimension,
        global,
        globalTickerStats: buildTickerStats(global),
        // Leaderboard across players is a separate concern from "my ticker" —
        // still legitimately empty until a real leaderboard query is built.
        topSouls: [] as { name: string; cycles: number }[],
    });
}