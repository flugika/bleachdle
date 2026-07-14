// app/(admin)/monitor/page.tsx
import { Shippori_Mincho, Inter, JetBrains_Mono } from "next/font/google";
import { supabaseServer } from "@/src/lib/supabase/supabase-server";
import { getTodayStr } from "@/src/lib/utils/format";
import MonitorClient from "@/src/features/admin/components/MonitorClient";
import { requestTimestamp } from "@/src/lib/utils/time";

export const revalidate = 0; // this page is live telemetry, never statically cached

const display = Shippori_Mincho({ subsets: ["latin"], weight: ["600"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

// 🔐 Auth is handled entirely by proxy.ts (middleware) now — it checks the
// key/cookie/header and rewrites unauthorized requests to /monitor/sealed
// before this page ever runs. Nothing here needs to re-check MONITOR_SECRET.
export default async function MonitorPage({
    searchParams,
}: {
    searchParams: Promise<{ key?: string; hours?: string }>;
}) {
    const { hours: hoursParam } = await searchParams;

    const now = requestTimestamp();
    const hours = Number(hoursParam) || 24;
    const today = getTodayStr();
    const rangeStart = new Date(now - hours * 3600_000).toISOString();
    const rangeEnd = new Date(now).toISOString();

    const [health, dailyStats, events, statsHistory] = await Promise.all([
        supabaseServer.rpc("get_api_health", { p_hours: hours }),
        supabaseServer.rpc("get_daily_stats", { p_date: today }),
        supabaseServer.rpc("get_api_events", { p_start: rangeStart, p_end: rangeEnd, p_level: null, p_limit: 200 }),
        supabaseServer.rpc("get_stats_history", { p_days: 7 }),
    ]);

    return (
        <main className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen`}>
            <MonitorClient
                initialHealth={health.error ? null : health.data}
                initialDailyStats={dailyStats.error ? null : dailyStats.data}
                initialEvents={events.error ? [] : events.data}
                initialStatsHistory={statsHistory.error ? [] : statsHistory.data}
                initialHours={hours}
                monitorKey=""
            />
        </main>
    );
}