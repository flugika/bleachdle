// src/app/api/stats/global/route.ts
//
// GET /api/stats/global?dimension=daily|unlimited
//
// Backs the Stats Hub page. "daily" reads today's row from `daily_stats`.
// "unlimited" currently falls back to an all-time SUM across every stored
// day (see get_global_stats.sql note) because Unlimited has no server-side
// table of its own yet — it's local-only. That distinction is surfaced via
// the `dimension` field in the response rather than hidden, so the client
// (or a future dev) doesn't mistake it for true Unlimited telemetry.
//
// Response shape:
//   {
//     dimension: "daily" | "unlimited",
//     global: Record<SubFeatureKey, { played, passed, guess_distribution }>,
//     globalTickerStats: Record<string, { played, passed, win_rate, avg_guesses }>,
//     topSouls: []   // always empty for now — no server-side soul registry table exists;
//                    // see note below if you want a real cross-player leaderboard
//   }

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';
import { getRateLimitKey, edgeRateLimit } from '@/src/lib/rateLimit';
import { VALID_STAT_MODES, type StatMode } from '@/src/entities/stats/types';
import { logApiEvent } from "@/src/services/monitor/logEvent";

export const revalidate = 60; // matches app/api/stats/daily/route.ts — stats don't need realtime

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
        if (bucket === 'fail') continue; // 🩹 same bug as SQL's _stat_summary: 'fail' isn't a numeric guess count
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
    // 🛡️ Rate limit first, same pattern as /api/stats/daily
    const limitKey = getRateLimitKey(req);
    const isAllowed = edgeRateLimit(limitKey, 10, 10000); // 10 req / 10s per IP
    if (!isAllowed) {
        console.warn(`[stats/global] Rate limit exceeded for IP: ${limitKey}`);
        logApiEvent(ENDPOINT, 'warning', 429, 'rate_limited');
        return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429 });
    }

    const dimensionParam = req.nextUrl.searchParams.get('dimension');
    const dimension: 'daily' | 'unlimited' = dimensionParam === 'unlimited' ? 'unlimited' : 'daily';

    const rpcName = dimension === 'daily' ? 'get_global_stats_today' : 'get_global_stats_alltime';
    const rpcArgs = dimension === 'daily' ? { p_date: getTodayStr() } : undefined;

    const { data, error } = await supabaseServer.rpc(rpcName, rpcArgs);

    if (error) {
        console.error(`[stats/global] RPC ${rpcName} failed:`, error);
        logApiEvent(ENDPOINT, 'error', 500, error.message);
        return NextResponse.json({ error: 'Failed to load global stats' }, { status: 500 });
    }

    const global: RawGlobalStats = data ?? {};

    logApiEvent(ENDPOINT, 'success', 200);
    return NextResponse.json({
        dimension,
        global,
        globalTickerStats: buildTickerStats(global),
        // No server-side soul registry table exists yet (Unlimited progress is
        // local-only, no submission endpoint). Returning [] rather than
        // fabricating names. If you want a real leaderboard, you'll need a
        // table Unlimited writes to on full clear, plus a submit endpoint
        // with the same rate-limit/validation treatment as /api/stats/finalize.
        topSouls: [] as { name: string; cycles: number }[],
    });
}