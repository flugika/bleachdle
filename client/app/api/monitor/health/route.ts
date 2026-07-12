// app/api/monitor/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase/supabase-server";
import { isAuthorizedForMonitor } from "@/src/features/admin/monitorAuth";
import { getTodayStr } from "@/src/lib/utils/format";

export const runtime = "nodejs";

const VALID_LEVELS = new Set(["success", "warning", "error"]);

export async function GET(req: NextRequest) {
    if (!isAuthorizedForMonitor(req)) {
        return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;

    const hoursParam = Number(params.get("hours"));
    const hours = Number.isFinite(hoursParam) && hoursParam > 0 && hoursParam <= 168 ? hoursParam : 24;

    // ── Event log filters ────────────────────────────────────────────────
    // level: success | warning | error, omit/invalid = all levels
    const levelParam = params.get("level");
    const level = levelParam && VALID_LEVELS.has(levelParam) ? levelParam : null;

    // from/to: ISO timestamps for a custom range. If both are absent, the
    // event log falls back to "last `hours` hours" (same window as health).
    const fromParam = params.get("from");
    const toParam = params.get("to");
    const from = fromParam && !Number.isNaN(Date.parse(fromParam)) ? fromParam : null;
    const to = toParam && !Number.isNaN(Date.parse(toParam)) ? toParam : null;
    const rangeStart = from ?? new Date(Date.now() - hours * 3600_000).toISOString();
    const rangeEnd = to ?? new Date().toISOString();

    // days: how many days of per-mode history to summarize (default 7)
    const daysParam = Number(params.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90 ? daysParam : 7;

    const [health, dailyStats, events, statsHistory] = await Promise.all([
        supabaseServer.rpc("get_api_health", { p_hours: hours }),
        supabaseServer.rpc("get_daily_stats", { p_date: getTodayStr() }),
        supabaseServer.rpc("get_api_events", {
            p_start: rangeStart,
            p_end: rangeEnd,
            p_level: level,
            p_limit: 200,
        }),
        supabaseServer.rpc("get_stats_history", { p_days: days }),
    ]);

    if (health.error) {
        console.error("[/api/monitor/health] RPC failed:", health.error);
        return NextResponse.json({ ok: false, error: "Failed to load health data." }, { status: 500 });
    }

    if (events.error) {
        console.error("[/api/monitor/health] get_api_events RPC failed:", events.error);
    }
    if (statsHistory.error) {
        console.error("[/api/monitor/health] get_stats_history RPC failed:", statsHistory.error);
    }

    return NextResponse.json({
        ok: true,
        health: health.data,
        dailyStats: dailyStats.error ? null : dailyStats.data,
        events: events.error ? [] : events.data,
        statsHistory: statsHistory.error ? [] : statsHistory.data,
        appliedFilters: { hours, level, from: rangeStart, to: rangeEnd, days },
        generatedAt: new Date().toISOString(),
    });
}