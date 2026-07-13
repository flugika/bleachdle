// src/features/admin/components/FeedbackPanel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { COLORS, CornerSeal, SectionHeading } from "./MonitorClient";

type TicketStatus = "new" | "seen" | "resolved" | "ignored";
type TicketCategory = "bug" | "feedback" | "suggestion" | "other";

type Ticket = {
    id: string;
    created_at: string;
    category: TicketCategory;
    message: string;
    client_ref: string | null;
    status: TicketStatus;
};

type Counts = { new: number; seen: number; resolved: number; ignored: number; total: number };

const STATUS_TABS: { label: string; value: TicketStatus | null; kanji: string }[] = [
    { label: "New", value: "new", kanji: "新" },
    { label: "Seen", value: "seen", kanji: "見" },
    { label: "Resolved", value: "resolved", kanji: "解" },
    { label: "Ignored", value: "ignored", kanji: "却" },
    { label: "All", value: null, kanji: "全" },
];

const CATEGORY_TABS: { label: string; value: TicketCategory | null; kanji: string }[] = [
    { label: "All", value: null, kanji: "全" },
    { label: "Bug", value: "bug", kanji: "虫" },
    { label: "Feedback", value: "feedback", kanji: "声" },
    { label: "Suggestion", value: "suggestion", kanji: "案" },
    { label: "Other", value: "other", kanji: "他" },
];

function statusColor(status: TicketStatus) {
    if (status === "new") return COLORS.crimson;
    if (status === "seen") return COLORS.amber;
    if (status === "resolved") return COLORS.jade;
    return COLORS.muted; // ignored
}

function categoryKanji(category: TicketCategory) {
    if (category === "bug") return "虫";
    if (category === "feedback") return "声";
    if (category === "suggestion") return "案";
    return "他";
}

export default function FeedbackPanel({ monitorKey }: { monitorKey: string }) {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [counts, setCounts] = useState<Counts>({ new: 0, seen: 0, resolved: 0, ignored: 0, total: 0 });
    const [statusFilter, setStatusFilter] = useState<TicketStatus | null>("new");
    const [categoryFilter, setCategoryFilter] = useState<TicketCategory | null>(null);
    const [loading, setLoading] = useState(false);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const LIMIT = 30;

    const load = useCallback(
        async (status: TicketStatus | null, category: TicketCategory | null, nextOffset: number, append: boolean) => {
            setLoading(true);
            try {
                const qs = new URLSearchParams({ limit: String(LIMIT), offset: String(nextOffset) });
                if (status) qs.set("status", status);
                if (category) qs.set("category", category);

                const res = await fetch(`/api/monitor/feedback?${qs.toString()}`, {
                    headers: monitorKey ? { "x-monitor-key": monitorKey } : undefined,
                    cache: "no-store",
                });
                const json = await res.json();
                if (json.ok) {
                    setTickets((prev) => (append ? [...prev, ...(json.tickets ?? [])] : json.tickets ?? []));
                    if (json.counts) setCounts(json.counts);
                    setHasMore(!!json.has_more);
                    setOffset(nextOffset);
                }
            } catch {
                // silent — keep last known-good list rather than blanking the panel
            } finally {
                setLoading(false);
            }
        },
        [monitorKey]
    );

    useEffect(() => {
        load(statusFilter, categoryFilter, 0, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, categoryFilter]);

    const markStatus = async (id: string, status: TicketStatus) => {
        setPendingId(id);
        const prevTickets = tickets;
        // Optimistic update: if the ticket no longer belongs in the current
        // filter, drop it from view; otherwise just update its status pill.
        setTickets((cur) =>
            statusFilter && statusFilter !== status
                ? cur.filter((t) => t.id !== id)
                : cur.map((t) => (t.id === id ? { ...t, status } : t))
        );

        try {
            const res = await fetch("/api/monitor/feedback", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(monitorKey ? { "x-monitor-key": monitorKey } : {}),
                },
                body: JSON.stringify({ id, status }),
            });
            const json = await res.json();
            if (!json.ok) throw new Error(json.error ?? "update failed");
            // Refresh counts quietly in the background.
            load(statusFilter, categoryFilter, 0, false);
        } catch {
            setTickets(prevTickets); // revert on failure
        } finally {
            setPendingId(null);
        }
    };

    return (
        <div className="relative">
            {/* Status tabs with live counts */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {STATUS_TABS.map((tab) => {
                    const active = statusFilter === tab.value;
                    const count = tab.value ? counts[tab.value] : counts.total;
                    return (
                        <button
                            key={tab.label}
                            onClick={() => setStatusFilter(tab.value)}
                            className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-xs px-3 py-2 rounded-sm transition-colors"
                            style={{
                                border: `1px solid ${active ? COLORS.gold : COLORS.hairline}`,
                                background: active ? COLORS.raised : "transparent",
                                color: active ? COLORS.gold : COLORS.muted,
                            }}
                        >
                            <span className="font-[family-name:var(--font-display)]">{tab.kanji}</span>
                            {tab.label}
                            <span
                                className="px-1.5 py-0.5 rounded-full text-[10px]"
                                style={{ background: `${COLORS.hairline}`, color: active ? COLORS.gold : COLORS.muted }}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
                {CATEGORY_TABS.map((tab) => {
                    const active = categoryFilter === tab.value;
                    return (
                        <button
                            key={tab.label}
                            onClick={() => setCategoryFilter(tab.value)}
                            className="font-[family-name:var(--font-mono)] text-[11px] px-2.5 py-1.5 rounded-sm transition-colors"
                            style={{
                                border: `1px solid ${active ? COLORS.indigo : COLORS.hairline}`,
                                color: active ? COLORS.bone : COLORS.muted,
                                background: active ? `${COLORS.indigo}30` : "transparent",
                            }}
                        >
                            {tab.kanji} {tab.label}
                        </button>
                    );
                })}
            </div>

            <SectionHeading kanji="声" title="Support tickets" />

            {tickets.length === 0 && !loading ? (
                <div
                    className="relative rounded-sm px-5 py-14 text-center"
                    style={{ border: `1px solid ${COLORS.hairline}`, background: COLORS.surface }}
                >
                    <CornerSeal color={COLORS.gold} />
                    <p className="font-[family-name:var(--font-display)] text-sm" style={{ color: COLORS.muted }}>
                        No tickets in this view yet.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {tickets.map((t) => (
                        <TicketCard key={t.id} ticket={t} pending={pendingId === t.id} onMark={markStatus} />
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => load(statusFilter, categoryFilter, offset + LIMIT, true)}
                        disabled={loading}
                        className="font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded-sm transition-colors"
                        style={{ border: `1px solid ${COLORS.gold}`, color: COLORS.gold, opacity: loading ? 0.5 : 1 }}
                    >
                        {loading ? "Loading…" : "Load more"}
                    </button>
                </div>
            )}
        </div>
    );
}

function TicketCard({
    ticket,
    pending,
    onMark,
}: {
    ticket: Ticket;
    pending: boolean;
    onMark: (id: string, status: TicketStatus) => void;
}) {
    const color = statusColor(ticket.status);

    return (
        <div
            className="relative rounded-sm px-5 py-4 overflow-hidden"
            style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.hairline}`,
                borderLeftWidth: "3px",
                borderLeftColor: color,
                opacity: pending ? 0.5 : 1,
                transition: "opacity 0.2s ease",
            }}
        >
            <CornerSeal color={COLORS.gold} />

            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                    <span
                        className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm"
                        style={{ color, border: `1px solid ${color}40`, background: `${color}14` }}
                    >
                        {ticket.status}
                    </span>
                    <span
                        className="font-[family-name:var(--font-display)] text-xs flex items-center gap-1.5"
                        style={{ color: COLORS.gold }}
                    >
                        <span>{categoryKanji(ticket.category)}</span>
                        {ticket.category}
                    </span>
                </div>
                <span className="font-[family-name:var(--font-mono)] text-[11px] shrink-0" style={{ color: COLORS.muted }}>
                    {new Date(ticket.created_at).toLocaleString("en-US", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </span>
            </div>

            <p
                className="font-[family-name:var(--font-display)] text-sm leading-relaxed mb-4 whitespace-pre-wrap"
                style={{ color: COLORS.bone }}
            >
                {ticket.message}
            </p>

            <div className="flex items-center justify-between gap-4">
                <span className="font-[family-name:var(--font-mono)] text-[10px] truncate" style={{ color: COLORS.hairline }}>
                    {ticket.client_ref ? `ref · ${ticket.client_ref.slice(0, 12)}…` : ""}
                </span>
                <div className="flex gap-2 shrink-0">
                    {(["seen", "resolved", "ignored"] as TicketStatus[])
                        .filter((s) => s !== ticket.status)
                        .map((s) => (
                            <button
                                key={s}
                                onClick={() => onMark(ticket.id, s)}
                                disabled={pending}
                                className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-sm transition-colors"
                                style={{ border: `1px solid ${statusColor(s)}50`, color: statusColor(s) }}
                            >
                                mark {s}
                            </button>
                        ))}
                </div>
            </div>
        </div>
    );
}