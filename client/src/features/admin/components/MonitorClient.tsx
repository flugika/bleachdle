// src/features/admin/components/MonitorClient.tsx

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import FeedbackPanel from "./FeedbackPanel";

type HourBucket = { hour: string; success: number; warning: number; error: number };
type EndpointRow = { endpoint: string; total: number; success: number; warning: number; error: number };
type Health = {
    hours: number;
    total: number;
    success: number;
    warning: number;
    error: number;
    success_rate: number;
    timeline: HourBucket[];
    endpoints: EndpointRow[];
};
type ModeStat = { played: number; passed: number; win_rate: number; avg_guesses: number | null };
type DailyStats = Record<string, ModeStat>;

type EventLevel = "success" | "warning" | "error";
type ApiEvent = {
    id: number;
    endpoint: string;
    level: EventLevel;
    status_code: number | null;
    note: string | null;
    created_at: string;
};

type DayHistory = {
    date: string; // YYYY-MM-DD
    total_played: number;
    total_passed: number;
    modes: DailyStats;
};

const VIEW_TABS: { label: string; value: "system" | "feedback"; kanji: string }[] = [
    { label: "System", value: "system", kanji: "陣" },
    { label: "Feedback", value: "feedback", kanji: "声" },
];

const RANGE_OPTIONS = [
    { label: "1H", hours: 1 },
    { label: "24H", hours: 24 },
    { label: "7D", hours: 168 },
];

const LEVEL_OPTIONS: { label: string; value: EventLevel | null; kanji: string }[] = [
    { label: "All", value: null, kanji: "全" },
    { label: "Success", value: "success", kanji: "成" },
    { label: "Warning", value: "warning", kanji: "警" },
    { label: "Error", value: "error", kanji: "破" },
];

export const COLORS = {
    void: "#07060A",
    surface: "#120F16",
    raised: "#1C1620",
    bone: "#EDE3CE",
    muted: "#8C8398",
    gold: "#C9A15E",
    crimson: "#C8102E",
    amber: "#E0A339",
    jade: "#3FA796",
    indigo: "#4C3B7C",
    hairline: "rgba(201, 162, 94, 0.27)",
};

function pulseColor(rate: number) {
    if (rate >= 97) return COLORS.jade;
    if (rate >= 85) return COLORS.amber;
    return COLORS.crimson;
}

function levelColor(level: EventLevel) {
    if (level === "success") return COLORS.jade;
    if (level === "warning") return COLORS.amber;
    return COLORS.crimson;
}

// ---------------------------------------------------------------------------
// Ambient background: seigaiha wave lattice + kanji watermark + vignette.
// Pure decoration, aria-hidden, carries no time/random-derived text so it
// can never cause a hydration mismatch.
// ---------------------------------------------------------------------------
function KidoField() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                    backgroundImage:
                        "repeating-linear-gradient(0deg, rgba(237,227,206,0.4) 0px, transparent 1px, transparent 3px)",
                    mixBlendMode: "overlay",
                }}
            />

            <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse at 50% 40%, transparent 40%, ${COLORS.void} 95%)` }}
            />
        </div>
    );
}

export function CornerSeal({ color }: { color: string }) {
    return (
        <>
            <svg aria-hidden className="absolute -top-px -left-px w-5 h-5" viewBox="0 0 20 20">
                <path d="M0 8 L0 0 L8 0" fill="none" stroke={color} strokeWidth="1.5" />
            </svg>
            <svg aria-hidden className="absolute -top-px -right-px w-5 h-5" viewBox="0 0 20 20">
                <path d="M20 8 L20 0 L12 0" fill="none" stroke={color} strokeWidth="1.5" />
            </svg>
            <svg aria-hidden className="absolute -bottom-px -left-px w-5 h-5" viewBox="0 0 20 20">
                <path d="M0 12 L0 20 L8 20" fill="none" stroke={color} strokeWidth="1.5" />
            </svg>
            <svg aria-hidden className="absolute -bottom-px -right-px w-5 h-5" viewBox="0 0 20 20">
                <path d="M20 12 L20 20 L12 20" fill="none" stroke={color} strokeWidth="1.5" />
            </svg>
        </>
    );
}

export function SectionHeading({ kanji, title }: { kanji: string; title: string }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <span className="font-[family-name:var(--font-display)] text-lg" style={{ color: COLORS.gold }}>
                {kanji}
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide" style={{ color: COLORS.bone }}>
                {title}
            </h2>
            <span className="flex-1 h-px" style={{ background: COLORS.hairline }} />
        </div>
    );
}

// Format an ISO string -> "YYYY-MM-DDTHH:mm" for a <input type="datetime-local">.
// Pure function of its input, so it's identical on server and client — safe
// to use directly in JSX without hydration risk (unlike `new Date()` alone).
function toLocalInputValue(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MonitorClient({
    initialHealth,
    initialDailyStats,
    initialEvents,
    initialStatsHistory,
    initialHours,
    monitorKey,
}: {
    initialHealth: Health | null;
    initialDailyStats: DailyStats | null;
    initialEvents: ApiEvent[];
    initialStatsHistory: DayHistory[];
    initialHours: number;
    monitorKey: string;
}) {
    const [health, setHealth] = useState<Health | null>(initialHealth);
    const [dailyStats] = useState<DailyStats | null>(initialDailyStats);
    const [events, setEvents] = useState<ApiEvent[]>(initialEvents ?? []);
    const [statsHistory, setStatsHistory] = useState<DayHistory[]>(initialStatsHistory ?? []);
    const [hours, setHours] = useState(initialHours);
    const [levelFilter, setLevelFilter] = useState<EventLevel | null>(null);
    const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
    // NOTE: never seed a Date on first render — the server renders once at
    // request time and the client re-renders slightly later, so the two
    // formatted-time strings differ and React flags a hydration mismatch.
    // Start null (renders a non-breaking space) and stamp it after mount.
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<"system" | "feedback">("system");

    const refresh = useCallback(
        async (targetHours: number, level: EventLevel | null, range: { from: string; to: string } | null) => {
            setLoading(true);
            try {
                const qs = new URLSearchParams({ hours: String(targetHours) });
                if (level) qs.set("level", level);
                if (range) {
                    qs.set("from", new Date(range.from).toISOString());
                    qs.set("to", new Date(range.to).toISOString());
                }
                const res = await fetch(`/api/monitor/health?${qs.toString()}`, {
                    headers: monitorKey ? { "x-monitor-key": monitorKey } : undefined,
                    cache: "no-store",
                });
                const json = await res.json();
                if (json.ok) {
                    setHealth(json.health);
                    setEvents(json.events ?? []);
                    setStatsHistory(json.statsHistory ?? []);
                    setLastUpdated(new Date());
                }
            } catch {
                // silent — keep showing last known-good data rather than erroring the dashboard itself
            } finally {
                setLoading(false);
            }
        },
        [monitorKey]
    );

    // Stamp the initial "updated" time client-side only, once mounted.
    useEffect(() => {
        setLastUpdated(new Date());
    }, []);

    useEffect(() => {
        const id = setInterval(() => refresh(hours, levelFilter, customRange), 30000);
        return () => clearInterval(id);
    }, [hours, levelFilter, customRange, refresh]);

    const rate = health?.success_rate ?? 100;
    const ring = pulseColor(rate);
    const maxBucket = useMemo(() => {
        if (!health?.timeline?.length) return 1;
        return Math.max(1, ...health.timeline.map((b) => b.success + b.warning + b.error));
    }, [health]);

    const activeModes = Object.entries(dailyStats ?? {}).filter(([, s]) => s && s.played > 0);

    // Discover every mode that shows up anywhere in the history window, so
    // the summary table has a stable set of columns even on sparse days.
    const historyModes = useMemo(() => {
        const set = new Set<string>();
        for (const day of statsHistory) {
            for (const mode of Object.keys(day.modes ?? {})) set.add(mode);
        }
        return Array.from(set).sort();
    }, [statsHistory]);

    const historyTotals = useMemo(() => {
        return statsHistory.reduce(
            (acc, d) => ({ played: acc.played + d.total_played, passed: acc.passed + d.total_passed }),
            { played: 0, passed: 0 }
        );
    }, [statsHistory]);

    return (
        <div className="relative px-6 md:px-10 py-10 max-w-[1200px] mx-auto">
            <KidoField />

            {/* Hero */}
            <div
                className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 mb-14 pb-8"
                style={{ borderBottom: `1px solid ${COLORS.hairline}` }}
            >
                <div>
                    <p
                        className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.4em] uppercase mb-3 flex items-center gap-2"
                        style={{ color: COLORS.gold }}
                    >
                        <span className="inline-block w-4 h-px" style={{ background: COLORS.gold }} />
                        Kido Barrier · System Monitor
                    </p>
                    <h1
                        className="font-[family-name:var(--font-display)] text-4xl md:text-5xl tracking-wide"
                        style={{ color: COLORS.bone, textShadow: `0 0 24px rgba(201,161,94,0.25)` }}
                    >
                        霊圧観測
                        <span className="text-lg md:text-xl align-middle ml-3 tracking-[0.2em]" style={{ color: COLORS.muted }}>
                            reiatsu watch
                        </span>
                    </h1>
                    <p className="font-[family-name:var(--font-display)] text-sm mt-4 max-w-md leading-relaxed" style={{ color: COLORS.muted }}>
                        Live read on every ticket, stat submit, and puzzle load — errors, warnings, and clean passes,
                        sealed within one barrier.
                    </p>
                </div>

                <div className="flex items-center gap-7">
                    <RangeSwitch
                        hours={hours}
                        onChange={(h) => {
                            setHours(h);
                            setCustomRange(null);
                            refresh(h, levelFilter, null);
                        }}
                    />
                    <PulseRing rate={rate} color={ring} loading={loading} />
                </div>
            </div>

            {/* View tabs */}
            <div className="relative flex items-center gap-2 mb-10">
                {VIEW_TABS.map((tab) => {
                    const active = view === tab.value;
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setView(tab.value)}
                            className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-xs px-4 py-2.5 rounded-sm transition-colors"
                            style={{
                                border: `1px solid ${active ? COLORS.gold : COLORS.hairline}`,
                                background: active ? COLORS.raised : "transparent",
                                color: active ? COLORS.gold : COLORS.muted,
                                textShadow: active ? `0 0 8px rgba(201,161,94,0.5)` : "none",
                            }}
                        >
                            <span className="font-[family-name:var(--font-display)]">{tab.kanji}</span>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {view === "feedback" ? (
                <FeedbackPanel monitorKey={monitorKey} />
            ) : (
            <>
            {/* Status cards */}
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                <StatusCard
                    label="Passed clean"
                    kanji="成功"
                    value={health?.success ?? 0}
                    color={COLORS.jade}
                    timeline={health?.timeline ?? []}
                    field="success"
                    max={maxBucket}
                />
                <StatusCard
                    label="Warnings"
                    kanji="警告"
                    value={health?.warning ?? 0}
                    color={COLORS.amber}
                    timeline={health?.timeline ?? []}
                    field="warning"
                    max={maxBucket}
                />
                <StatusCard
                    label="Errors"
                    kanji="破損"
                    value={health?.error ?? 0}
                    color={COLORS.crimson}
                    timeline={health?.timeline ?? []}
                    field="error"
                    max={maxBucket}
                />
            </div>

            <div className="relative flex items-center justify-between mb-10 px-1">
                <p className="font-[family-name:var(--font-mono)] text-[11px]" style={{ color: COLORS.muted }}>
                    <span className="font-[family-name:var(--font-mono)]" style={{ color: COLORS.bone }}>
                        {(health?.total ?? 0).toLocaleString()}
                    </span>{" "}
                    requests total · last {hours}h
                </p>
                <p
                    className="font-[family-name:var(--font-mono)] text-[11px]"
                    style={{ color: COLORS.muted }}
                    suppressHydrationWarning
                >
                    {lastUpdated ? `updated ${lastUpdated.toLocaleTimeString()}` : "\u00A0"}
                </p>
            </div>

            {/* Endpoint breakdown */}
            <section className="relative mb-14">
                <SectionHeading kanji="経" title="Roll call by route" />
                <div
                    className="relative rounded-sm overflow-hidden"
                    style={{ border: `1px solid ${COLORS.hairline}`, background: COLORS.surface }}
                >
                    <CornerSeal color={COLORS.gold} />
                    {(health?.endpoints?.length ?? 0) === 0 ? (
                        <p className="font-[family-name:var(--font-display)] text-sm px-5 py-10 text-center" style={{ color: COLORS.muted }}>
                            No events logged in this window yet.
                        </p>
                    ) : (
                        health!.endpoints.map((row, i) => (
                            <EndpointRowView key={row.endpoint} row={row} isLast={i === health!.endpoints.length - 1} />
                        ))
                    )}
                </div>
            </section>

            {/* Event log: level + custom date range filter */}
            <section className="relative mb-14">
                <SectionHeading kanji="録" title="Event log" />

                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                    <div className="flex rounded-sm overflow-hidden" style={{ border: `1px solid ${COLORS.hairline}` }}>
                        {LEVEL_OPTIONS.map((opt) => {
                            const active = levelFilter === opt.value;
                            const color = opt.value ? levelColor(opt.value) : COLORS.gold;
                            return (
                                <button
                                    key={opt.label}
                                    onClick={() => {
                                        setLevelFilter(opt.value);
                                        refresh(hours, opt.value, customRange);
                                    }}
                                    className="font-[family-name:var(--font-mono)] text-xs px-3 py-2 transition-colors flex items-center gap-1.5"
                                    style={{
                                        background: active ? COLORS.raised : "transparent",
                                        color: active ? color : COLORS.muted,
                                    }}
                                >
                                    <span className="font-[family-name:var(--font-display)]">{opt.kanji}</span>
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    <DateRangeFields
                        hours={hours}
                        value={customRange}
                        onApply={(range) => {
                            setCustomRange(range);
                            refresh(hours, levelFilter, range);
                        }}
                        onClear={() => {
                            setCustomRange(null);
                            refresh(hours, levelFilter, null);
                        }}
                    />
                </div>

                <div
                    className="relative rounded-sm overflow-hidden"
                    style={{ border: `1px solid ${COLORS.hairline}`, background: COLORS.surface }}
                >
                    <CornerSeal color={COLORS.gold} />
                    {events.length === 0 ? (
                        <p className="font-[family-name:var(--font-display)] text-sm px-5 py-10 text-center" style={{ color: COLORS.muted }}>
                            No events match this filter.
                        </p>
                    ) : (
                        <div className="max-h-[420px] overflow-y-auto">
                            {events.map((ev, i) => (
                                <EventRow key={ev.id} event={ev} isLast={i === events.length - 1} />
                            ))}
                        </div>
                    )}
                </div>
                <p className="font-[family-name:var(--font-mono)] text-[11px] mt-2 px-1" style={{ color: COLORS.muted }}>
                    showing <span style={{ color: COLORS.bone }}>{events.length}</span> events (max 200 per fetch)
                </p>
            </section>

            {/* Daily puzzle stats — today */}
            {activeModes.length > 0 && (
                <section className="relative mb-14">
                    <SectionHeading kanji="陣" title="Today's puzzles" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {activeModes.map(([mode, s]) => (
                            <div
                                key={mode}
                                className="relative rounded-sm px-4 py-4"
                                style={{ border: `1px solid ${COLORS.hairline}`, background: COLORS.surface }}
                            >
                                <CornerSeal color={COLORS.gold} />
                                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: COLORS.muted }}>
                                    {mode}
                                </p>
                                <p className="font-[family-name:var(--font-mono)] text-2xl" style={{ color: COLORS.bone }}>
                                    {s.win_rate}%
                                </p>
                                <p className="font-[family-name:var(--font-display)] text-xs mt-1" style={{ color: COLORS.muted }}>
                                    <span className="font-[family-name:var(--font-mono)]">
                                        {s.passed}/{s.played}
                                    </span>{" "}
                                    passed
                                    {s.avg_guesses != null ? (
                                        <>
                                            {" · avg "}
                                            <span className="font-[family-name:var(--font-mono)]">{s.avg_guesses}</span>
                                        </>
                                    ) : (
                                        ""
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Daily history summary — last N days, per mode */}
            {statsHistory.length > 0 && (
                <section className="relative">
                    <SectionHeading kanji="暦" title={`Daily recap · last ${statsHistory.length} days`} />
                    <p className="font-[family-name:var(--font-display)] text-xs mb-4" style={{ color: COLORS.muted }}>
                        <span className="font-[family-name:var(--font-mono)]" style={{ color: COLORS.bone }}>
                            {historyTotals.played.toLocaleString()}
                        </span>{" "}
                        plays total ·{" "}
                        <span className="font-[family-name:var(--font-mono)]" style={{ color: COLORS.bone }}>
                            {historyTotals.passed.toLocaleString()}
                        </span>{" "}
                        passed across the window
                    </p>
                    <div
                        className="relative rounded-sm overflow-hidden"
                        style={{ border: `1px solid ${COLORS.hairline}`, background: COLORS.surface }}
                    >
                        <CornerSeal color={COLORS.gold} />
                        <table className="w-full min-w-[640px] border-collapse">
                            <thead>
                                <tr style={{ borderBottom: `1px solid ${COLORS.hairline}` }}>
                                    <th className="text-left px-4 py-3 font-[family-name:var(--font-display)] text-xs tracking-wide" style={{ color: COLORS.muted }}>
                                        Date
                                    </th>
                                    <th className="text-right px-4 py-3 font-[family-name:var(--font-display)] text-xs tracking-wide" style={{ color: COLORS.muted }}>
                                        Total
                                    </th>
                                    {historyModes.map((mode) => (
                                        <th
                                            key={mode}
                                            className="text-right px-4 py-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em]"
                                            style={{ color: COLORS.muted }}
                                        >
                                            {mode}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[...statsHistory].reverse().map((day, i) => (
                                    <tr
                                        key={day.date}
                                        style={{ borderBottom: i === statsHistory.length - 1 ? "none" : `1px solid ${COLORS.hairline}` }}
                                    >
                                        <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-sm" style={{ color: COLORS.bone }}>
                                            {day.date}
                                        </td>
                                        <td className="px-4 py-3 text-right font-[family-name:var(--font-mono)] text-sm" style={{ color: COLORS.gold }}>
                                            {day.total_played.toLocaleString()}
                                        </td>
                                        {historyModes.map((mode) => {
                                            const s = day.modes[mode];
                                            return (
                                                <td key={mode} className="px-4 py-3 text-right font-[family-name:var(--font-mono)] text-xs" style={{ color: s ? COLORS.muted : COLORS.hairline }}>
                                                    {s ? `${s.passed}/${s.played}` : "—"}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
            </>
            )}
        </div>
    );
}

function DateRangeFields({
    hours,
    value,
    onApply,
    onClear,
}: {
    hours: number;
    value: { from: string; to: string } | null;
    onApply: (range: { from: string; to: string }) => void;
    onClear: () => void;
}) {
    const defaultFrom = useMemo(() => toLocalInputValue(new Date(Date.now() - hours * 3600_000).toISOString()), [hours]);
    const defaultTo = useMemo(() => toLocalInputValue(new Date().toISOString()), []);
    const [from, setFrom] = useState(value?.from ?? defaultFrom);
    const [to, setTo] = useState(value?.to ?? defaultTo);

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="font-[family-name:var(--font-mono)] text-xs px-2 py-2 rounded-sm bg-transparent"
                style={{ border: `1px solid ${COLORS.hairline}`, color: COLORS.bone, colorScheme: "dark" }}
            />
            <span className="font-[family-name:var(--font-mono)] text-xs" style={{ color: COLORS.muted }}>
                to
            </span>
            <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="font-[family-name:var(--font-mono)] text-xs px-2 py-2 rounded-sm bg-transparent"
                style={{ border: `1px solid ${COLORS.hairline}`, color: COLORS.bone, colorScheme: "dark" }}
            />
            <button
                onClick={() => onApply({ from, to })}
                className="font-[family-name:var(--font-mono)] text-xs px-3 py-2 rounded-sm transition-colors"
                style={{ border: `1px solid ${COLORS.gold}`, color: COLORS.gold }}
            >
                Apply
            </button>
            {value && (
                <button
                    onClick={onClear}
                    className="font-[family-name:var(--font-mono)] text-xs px-3 py-2 rounded-sm transition-colors"
                    style={{ color: COLORS.muted }}
                >
                    Clear
                </button>
            )}
        </div>
    );
}

function EventRow({ event, isLast }: { event: ApiEvent; isLast: boolean }) {
    const color = levelColor(event.level);
    return (
        <div
            className="flex items-center gap-4 px-5 py-2.5"
            style={{ borderBottom: isLast ? "none" : `1px solid ${COLORS.hairline}` }}
        >
            <span
                className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.15em] w-16 shrink-0 px-1.5 py-0.5 rounded-sm text-center"
                style={{ color, border: `1px solid ${color}40`, background: `${color}14` }}
            >
                {event.level}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-xs w-40 shrink-0 truncate" style={{ color: COLORS.bone }}>
                {event.endpoint}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-xs w-12 shrink-0" style={{ color: COLORS.muted }}>
                {event.status_code ?? "—"}
            </span>
            <span className="font-[family-name:var(--font-display)] text-xs flex-1 truncate" style={{ color: COLORS.muted }}>
                {event.note ?? ""}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[11px] shrink-0" style={{ color: COLORS.muted }}>
                {new Date(event.created_at).toLocaleString("en-US", {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                })}
            </span>
        </div>
    );
}

function RangeSwitch({ hours, onChange }: { hours: number; onChange: (h: number) => void }) {
    return (
        <div className="flex rounded-sm overflow-hidden" style={{ border: `1px solid ${COLORS.hairline}` }}>
            {RANGE_OPTIONS.map((opt) => (
                <button
                    key={opt.hours}
                    onClick={() => onChange(opt.hours)}
                    className="font-[family-name:var(--font-mono)] text-xs px-3 py-2 transition-colors"
                    style={{
                        background: hours === opt.hours ? COLORS.raised : "transparent",
                        color: hours === opt.hours ? COLORS.gold : COLORS.muted,
                        textShadow: hours === opt.hours ? `0 0 8px rgba(201,161,94,0.5)` : "none",
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

function PulseRing({ rate, color, loading }: { rate: number; color: string; loading: boolean }) {
    const r = 30;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - rate / 100);

    return (
        <div className="relative w-24 h-24 shrink-0">
            <svg
                viewBox="0 0 72 72"
                className="absolute inset-0 w-24 h-24 opacity-40"
                style={{ animation: "monitor-spin 18s linear infinite" }}
            >
                <circle cx="36" cy="36" r="34" fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="0.5 3" />
            </svg>
            <svg viewBox="0 0 72 72" className="absolute inset-0 w-24 h-24 -rotate-90">
                <circle cx="36" cy="36" r={r} fill="none" stroke={COLORS.hairline} strokeWidth="4" />
                <circle
                    cx="36"
                    cy="36"
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        filter: `drop-shadow(0 0 8px ${color}b0)`,
                        transition: "stroke-dashoffset 0.6s ease, stroke 0.6s ease",
                        animation: loading ? "none" : "monitor-breathe 3s ease-in-out infinite",
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-[family-name:var(--font-mono)] text-sm" style={{ color: COLORS.bone, textShadow: `0 0 10px ${color}80` }}>
                    {rate}%
                </span>
            </div>
        </div>
    );
}

function StatusCard({
    label,
    kanji,
    value,
    color,
    timeline,
    field,
    max,
}: {
    label: string;
    kanji: string;
    value: number;
    color: string;
    timeline: HourBucket[];
    field: "success" | "warning" | "error";
    max: number;
}) {
    return (
        <div
            className="relative rounded-sm px-5 py-5 overflow-hidden"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.hairline}`, borderLeftWidth: "3px", borderLeftColor: color }}
        >
            <span
                aria-hidden
                className="absolute -right-4 -bottom-6 font-[family-name:var(--font-display)] select-none pointer-events-none"
                style={{ fontSize: "84px", color, opacity: 0.06, lineHeight: 1 }}
            >
                {kanji}
            </span>

            <div className="relative flex items-baseline justify-between mb-4">
                <div>
                    <p className="font-[family-name:var(--font-display)] text-xs mb-1 tracking-wide" style={{ color: COLORS.muted }}>
                        {label}
                    </p>
                    <p className="font-[family-name:var(--font-mono)] text-3xl" style={{ color: COLORS.bone }}>
                        {value.toLocaleString()}
                    </p>
                </div>
                <span className="font-[family-name:var(--font-display)] text-lg" style={{ color, textShadow: `0 0 10px ${color}70` }}>
                    {kanji}
                </span>
            </div>
            <div className="relative flex items-end gap-[2px] h-10">
                {timeline.length === 0
                    ? Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="flex-1 rounded-[1px]" style={{ height: "2px", background: COLORS.hairline }} />
                    ))
                    : timeline.map((b, i) => {
                        const h = Math.max(2, Math.round((b[field] / max) * 40));
                        return (
                            <div
                                key={i}
                                className="flex-1 rounded-[1px]"
                                style={{
                                    height: `${h}px`,
                                    background: b[field] > 0 ? color : COLORS.hairline,
                                    opacity: b[field] > 0 ? 0.9 : 1,
                                    boxShadow: b[field] > 0 ? `0 0 6px ${color}60` : "none",
                                }}
                                title={`${b.hour} · ${b[field]}`}
                            />
                        );
                    })}
            </div>
        </div>
    );
}

function EndpointRowView({ row, isLast }: { row: EndpointRow; isLast: boolean }) {
    const successPct = row.total === 0 ? 0 : (row.success / row.total) * 100;
    const warningPct = row.total === 0 ? 0 : (row.warning / row.total) * 100;
    const errorPct = row.total === 0 ? 0 : (row.error / row.total) * 100;

    return (
        <div className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: isLast ? "none" : `1px solid ${COLORS.hairline}` }}>
            <p className="font-[family-name:var(--font-mono)] text-sm w-40 shrink-0 truncate" style={{ color: COLORS.bone }}>
                {row.endpoint}
            </p>
            <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: COLORS.raised }}>
                <div style={{ width: `${successPct}%`, background: COLORS.jade }} />
                <div style={{ width: `${warningPct}%`, background: COLORS.amber }} />
                <div style={{ width: `${errorPct}%`, background: COLORS.crimson }} />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-xs w-16 text-right shrink-0" style={{ color: COLORS.muted }}>
                {row.total.toLocaleString()}
            </p>
        </div>
    );
}