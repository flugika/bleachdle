// src/features/stats/components/StatsHubPage.tsx
//
// ============================================================================
// STATS HUB — "REIATSU DOSSIER"
//
// Personal + global stats page for Bleachdle. Reuses the visual language
// already established in Central46ConfidentialArchive.tsx (sealed-document
// aesthetic, kanji labels, gold/dark palette) and DailyStatsBar.tsx (mode
// accent colors, ticker). No login exists — "personal" here means whatever
// is in localStorage (STORAGE_KEYS.*_STATS / SOUL_REGISTRY), "global" means
// whatever daily_stats aggregates server-side across all players.
//
// Data contract expected from the page/server component that renders this:
//
//   type ModeStat = {
//     played: number;
//     passed: number;
//     guess_distribution: Record<string, number>; // "1".."6" -> count, "6" = 6+
//   };
//
//   type StatsHubProps = {
//     soulName: string | null;              // from SOUL_REGISTRY, null = unregistered
//     reincarnationCount: number;
//     personal: Record<SubFeatureKey, ModeStat>;   // derived from *_STATS localStorage
//     global: Record<SubFeatureKey, ModeStat>;     // from daily_stats (or an all-time rollup)
//     badgeTiers: BadgeTier[];
//   };
//
// Layout (top to bottom):
//   §00 Seal banner            — security-strip header, matches archive top
//   §01 Global pulse ticker    — reuses DailyStatsBar verbatim
//   §02 Personal overview grid — 4 hero metric cards
//   §03 Per-mode archive cards — 6 cards, one per SubFeatureKey, each with a
//                                guess-distribution histogram + you-vs-global line
//   §04 Soul registry roll     — lightweight "who else has cleared unlimited"
//   §05 Badge / tier wall      — locked (silhouette) vs unlocked badges
//   §06 Footer                 — archive footer, matches Central46 footer
// ============================================================================

"use client";

import React, { useMemo, useState } from "react";
import { MODE_ACCENT, SubFeatureKey } from "@/src/config/mode";
import { DailyStatsBar } from "@/src/shared/ui/daily-hub/DailyStatsBar";

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────

export interface ModeStat {
    played: number;
    passed: number;
    guess_distribution: Record<string, number>; // keys "1".."5", "6" means "6+"
    currentStreak?: number;
    maxStreak?: number;
    // Per-mode reincarnation count from SOUL_REGISTRY[mode].count — populated
    // for the unlimited variant only. Distinct from the header's combined
    // `reincarnationCount`, which sums this across all modes.
    cycleCount?: number;
}

export interface BadgeTier {
    id: string;
    label: string;
    kanji: string;
    // Split so the UI can render the number big/accented and the description
    // small/muted, instead of one flat 10px string where the number can't
    // be visually emphasized at all.
    requirementValue: string; // e.g. "1", "5" — the number that matters
    requirementLabel: string; // e.g. "FULL CYCLE · EVERY DISCIPLINE"
    unlocked: boolean;
}

export interface StatsHubProps {
    variant: "daily" | "unlimited";
    soulName: string | null;
    // True when SOUL_REGISTRY has more than one distinct name across modes
    // (e.g. player renamed between sessions). Surfaced rather than silently
    // resolved so the player understands why the shown name might not match
    // what they see in a given mode.
    nameMismatch?: boolean;
    reincarnationCount: number;
    personal: Partial<Record<SubFeatureKey, ModeStat>>;
    global: Partial<Record<SubFeatureKey, ModeStat>>;
    globalTickerStats: Record<string, { played: number; passed: number; win_rate: number; avg_guesses: number | null }>;
    // Two separate badge tracks — see page.tsx buildTotalCycleTiers /
    // buildMasteryTiers for the reasoning. Kept as two arrays rather than one
    // so a mode with a tiny roster can no longer "buy" a top-tier badge that
    // implies all-around mastery.
    totalCycleTiers: BadgeTier[];
    masteryTiers: BadgeTier[];
    // Per-mode soul registry: which name was etched in THIS discipline and
    // how many times it's been cycled — distinct from masteryTiers (which
    // only surfaces the single best count as a badge threshold).
    disciplineRegistry?: Partial<Record<SubFeatureKey, { name: string | null; cycles: number }>>;
    // Called when the player edits a discipline's etched name from the §05
    // registry card. Optional so daily variant / callers without persistence
    // wiring can omit it — the card simply won't offer the edit affordance.
    onRenameDiscipline?: (mode: SubFeatureKey, newName: string) => void;
    topSouls?: { name: string; cycles: number }[];
}

// ─────────────────────────────────────────────
//  DESIGN TOKENS (mirrors Central46ConfidentialArchive.tsx)
// ─────────────────────────────────────────────

const T = {
    bg: "#050506",
    border: "#3a352e",
    borderDim: "#8a7657",
    label: "#c9bfae",
    body: "#e8ddd0",
    value: "#faf4ea",
    gold: "#e0bd7e",
    goldBright: "#ffe4a3",
    green: "#8fd66a",
    section: "#d4c4a8",
    muted: "#cdc0aa",
    mutedMid: "#a8998a",
} as const;

const MODE_ORDER: SubFeatureKey[] = ["character", "quote", "silhouette", "emoji", "song", "release"];

const MODE_KANJI: Record<string, string> = {
    character: "士",
    quote: "言",
    silhouette: "像",
    emoji: "絵",
    song: "曲",
    release: "解",
};

const MODE_LABELS: Record<string, string> = {
    character: "CHARACTER",
    quote: "QUOTE",
    silhouette: "SILHOUETTE",
    emoji: "EMOJI",
    song: "SONG",
    release: "RELEASE",
};

// technical scan-method flavor text, reused from Central46 to keep vocab consistent
const MODE_METHOD: Record<string, string> = {
    character: "ZANPAKUTŌ RESONANCE SCAN",
    song: "HADŌ RESONANCE SCAN",
    quote: "KOTODAMA VOICEPRINT SCAN",
    silhouette: "SHIKAKU VISUAL SCAN",
    emoji: "REISHI CIPHER SCAN",
    release: "KAIHŌ INVOCATION SCAN",
};

const FALLBACK_ACCENT = { base: "#c8a96e", bright: "#f2cf8a", glow: "rgba(200,169,110,0.45)" };

// ─────────────────────────────────────────────
//  MATH HELPERS
// ─────────────────────────────────────────────

function winRate(s: ModeStat | undefined): number | null {
    if (!s) return null;
    const total = s.played;
    if (total === 0) return null;
    return Math.round((s.played / total) * 1000) / 10; // 1 decimal
}

function avgGuesses(s: ModeStat | undefined): number | null {
    if (!s) return null;
    const dist = s.guess_distribution || {};
    let totalGuesses = 0;
    let totalSolves = 0;
    for (const [k, count] of Object.entries(dist)) {
        if (!/^[0-9]+$/.test(k)) continue; // skip "fail" and any other non-numeric bucket
        const n = k === "6" ? 6 : Number(k);
        totalGuesses += n * count;
        totalSolves += count;
    }
    if (totalSolves === 0) return null;
    return Math.round((totalGuesses / totalSolves) * 10) / 10;
}

function totalSolvesAcrossModes(personal: StatsHubProps["personal"]): number {
    const safe = personal ?? {};
    return MODE_ORDER.reduce((sum, m) => sum + (safe[m]?.played ?? 0), 0);
}

function overallWinRate(personal: StatsHubProps["personal"]): number | null {
    const safe = personal ?? {};
    let played = 0;
    let passed = 0;
    for (const m of MODE_ORDER) {
        played += safe[m]?.played ?? 0;
        passed += safe[m]?.passed ?? 0;
    }
    if (played + passed === 0) return null;
    return Math.round((played / (played + passed)) * 1000) / 10;
}

function bestMode(personal: StatsHubProps["personal"]): SubFeatureKey | null {
    const safe = personal ?? {};
    let best: SubFeatureKey | null = null;
    let bestRate = -1;
    for (const m of MODE_ORDER) {
        const s = safe[m];
        if (!s || s.played < 3) continue; // ignore modes with too few attempts
        const rate = winRate(s) ?? -1;
        if (rate > bestRate) {
            bestRate = rate;
            best = m;
        }
    }
    return best;
}

// ─────────────────────────────────────────────
//  PRIMITIVES (mirrors Central46 Field/Rule/SectionHead)
// ─────────────────────────────────────────────

function Rule({ dim = false }: { dim?: boolean }) {
    return <div style={{ width: "100%", height: "1px", background: dim ? T.borderDim : T.border }} />;
}

function SectionHead({ children }: { children: React.ReactNode }) {
    return (
        <p
            style={{
                fontSize: "13px",
                letterSpacing: "0.36em",
                color: T.section,
                textTransform: "uppercase",
                margin: "0 0 18px",
            }}
        >
            {children}
        </p>
    );
}

function SecurityStrip() {
    return (
        <div
            className="overflow-hidden whitespace-nowrap font-[family-name:var(--font-display)]"
            style={{
                width: "100%",
                fontSize: "10px",
                letterSpacing: "0.18em",
                color: T.gold,
                padding: "7px 0",
                borderBottom: `1px solid ${T.borderDim}`,
                opacity: 0.4,
            }}
        >
            <span className="inline-block bd-stats-marquee">
                {Array(6).fill("SPIRITUAL RECORD ARCHIVE · 霊圧記録保管庫 · CLASSIFIED · ").join("")}
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────
//  §02 HERO METRIC CARD
// ─────────────────────────────────────────────

function HeroMetric({
    label,
    value,
    sub,
    accent,
}: {
    label: string;
    value: React.ReactNode;
    sub?: string;
    accent?: string;
}) {
    return (
        <div
            className="relative p-5 flex flex-col justify-between min-h-[110px] backdrop-blur-md"
            style={{
                border: `1px solid ${T.border}`,
                background: "linear-gradient(155deg, rgba(8,7,6,0.82) 0%, rgba(8,7,6,0.6) 100%)",
            }}
        >
            <span
                className="absolute top-0 left-0 w-4 h-[2px]"
                style={{ background: accent ?? T.gold }}
            />
            <span
                className="absolute top-0 left-0 w-[2px] h-4"
                style={{ background: accent ?? T.gold }}
            />
            <p
                style={{
                    fontSize: "12px",
                    letterSpacing: "0.24em",
                    color: T.label,
                    textTransform: "uppercase",
                    margin: "0 0 10px",
                }}
            >
                {label}
            </p>
            <p
                style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: accent ?? T.value,
                    margin: 0,
                    lineHeight: 1.1,
                }}
            >
                {value}
            </p>
            {sub && (
                <p style={{ fontSize: "12px", color: T.mutedMid, letterSpacing: "0.1em", margin: "6px 0 0" }}>
                    {sub}
                </p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
//  §03 GUESS DISTRIBUTION HISTOGRAM
// ─────────────────────────────────────────────

function GuessDistribution({
    dist,
    accent,
}: {
    dist: Record<string, number>;
    accent: { base: string; bright: string };
}) {
    const buckets = ["1", "2", "3", "4", "5", "6"];
    const total = buckets.reduce((sum, b) => sum + (dist[b] ?? 0), 0);
    const max = Math.max(1, ...buckets.map((b) => dist[b] ?? 0));

    if (total === 0) {
        return (
            <p style={{ fontSize: "11px", color: T.mutedMid, letterSpacing: "0.1em", margin: "8px 0" }}>
                NO DATA RECORDED YET
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-[6px] mt-2">
            {buckets.map((b) => {
                const count = dist[b] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
                const widthPct = Math.max(count > 0 ? 4 : 0, Math.round((count / max) * 100));
                const isMax = count === max && count > 0;
                return (
                    <div key={b} className="flex items-center gap-2">
                        <span
                            style={{
                                width: "14px",
                                fontSize: "12px",
                                color: T.mutedMid,
                                flexShrink: 0,
                            }}
                        >
                            {b === "6" ? "6+" : b}
                        </span>
                        <div className="flex-1 relative" style={{ height: "14px", background: "rgba(255,255,255,0.03)" }}>
                            <div
                                style={{
                                    width: `${widthPct}%`,
                                    height: "100%",
                                    background: isMax ? accent.bright : `${accent.base}88`,
                                    transition: "width 500ms ease",
                                }}
                            />
                        </div>

                        {/* 🛠️ แก้ไขจุดนี้: แยกออกเป็น Grid/Flex Column ให้ตรงกันเป๊ะ */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                width: "86px",
                                fontSize: "12px",
                                fontFamily: "monospace",
                                flexShrink: 0,
                            }}
                        >
                            <span
                                style={{
                                    flex: 1,
                                    textAlign: "right",
                                    color: isMax ? accent.bright : T.mutedMid,
                                }}
                            >
                                {count.toLocaleString()}
                            </span>
                            <span
                                style={{
                                    width: "54px",
                                    textAlign: "right",
                                    color: isMax ? accent.bright : T.mutedMid,
                                    opacity: isMax ? 1 : 0.6,
                                }}
                            >
                                ({pct}%)
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────
//  §03 MAX STREAK BADGE
// ─────────────────────────────────────────────

function StreakBadge({
    maxStreak,
    accent,
}: {
    maxStreak: number;
    accent: { base: string; bright: string };
}) {
    const isLit = maxStreak > 0;
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 flex-shrink-0"
            style={{
                border: `1px solid ${isLit ? accent.base + "66" : T.borderDim}`,
                background: isLit ? `${accent.base}14` : "rgba(255,255,255,0.02)",
            }}
            title="Best win streak recorded for this mode"
        >
            <span style={{ fontSize: "11px", color: isLit ? accent.bright : "#4a4640" }}>連</span>
            <span
                style={{
                    fontSize: "12px",
                    letterSpacing: "0.1em",
                    color: isLit ? T.value : "#4a4640",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                }}
            >
                MAX STREAK {maxStreak.toLocaleString()}
            </span>
        </span>
    );
}

// ─────────────────────────────────────────────
//  §03 SEALED ARCHIVE (empty-state ofuda panel)
// ─────────────────────────────────────────────
//
// A blank card reads as broken. An unopened archive shouldn't look empty —
// it should look *deliberately sealed*, like an ofuda talisman binding a
// door in Soul Society lore. Fills whatever height the grid row gives it
// instead of leaving dead space.

function SealedArchive({ accent }: { accent: { base: string; bright: string } }) {
    return (
        <div className="relative flex-1 flex flex-col items-center justify-center gap-4 overflow-hidden" style={{ minHeight: "150px", padding: "18px 0" }}>
            {/* faint seigaiha wave texture, mode-tinted */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    opacity: 0.05,
                    backgroundImage: `repeating-radial-gradient(circle at 50% 120%, transparent 0px, transparent 9px, ${accent.base} 10px, transparent 11px, transparent 22px)`,
                    backgroundSize: "44px 44px",
                }}
            />

            {/* vertical ofuda strips flanking the seal, like talisman paper bound over a doorway */}
            <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                    left: "12%",
                    width: "1px",
                    background: `linear-gradient(to bottom, transparent, ${accent.base}30 15%, ${accent.base}30 85%, transparent)`,
                }}
            />
            <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                    right: "12%",
                    width: "1px",
                    background: `linear-gradient(to bottom, transparent, ${accent.base}30 15%, ${accent.base}30 85%, transparent)`,
                }}
            />

            {/* hanko-style double-ring seal stamp */}
            <div className="relative flex items-center justify-center">
                <span
                    className="absolute rounded-full"
                    style={{
                        width: "64px",
                        height: "64px",
                        border: `1px solid ${accent.base}35`,
                    }}
                />
                <span
                    className="relative flex items-center justify-center rounded-full"
                    style={{
                        width: "50px",
                        height: "50px",
                        border: `1px solid ${accent.base}55`,
                        background: `radial-gradient(circle, ${accent.base}12, transparent 70%)`,
                        boxShadow: `0 0 18px ${accent.base}22`,
                    }}
                >
                    <span style={{ fontSize: "22px", color: `${accent.base}90`, lineHeight: 1 }}>封</span>
                </span>
            </div>

            <div className="relative flex flex-col items-center gap-1">
                <p style={{ fontSize: "12px", letterSpacing: "0.32em", color: T.mutedMid, textTransform: "uppercase", margin: 0 }}>
                    ARCHIVE SEALED
                </p>
                <p style={{ fontSize: "10px", letterSpacing: "0.14em", color: "#6b645b", textTransform: "uppercase", margin: 0, textAlign: "center" }}>
                    NO RECORD ON FILE — AWAITING FIRST INQUIRY
                </p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
//  §03 PER-MODE ARCHIVE CARD
// ─────────────────────────────────────────────

function ModeArchiveCard({
    mode,
    personalStat,
    globalStat,
    variant,
}: {
    mode: SubFeatureKey;
    personalStat?: ModeStat;
    globalStat?: ModeStat;
    variant?: "daily" | "unlimited" | undefined;
}) {
    const accent = MODE_ACCENT[mode] ?? FALLBACK_ACCENT;
    const pWin = winRate(personalStat);
    const pAvg = avgGuesses(personalStat);
    const gAvg = avgGuesses(globalStat);
    const played = personalStat?.played ?? 0;
    const passed = personalStat?.passed ?? 0;
    const currentStreak = personalStat?.currentStreak ?? 0;
    const maxStreak = personalStat?.maxStreak ?? 0;
    const cycleCount = personalStat?.cycleCount;
    const isOpened = played + passed > 0;

    return (
        <div
            className="relative p-5 md:p-6 h-full flex flex-col backdrop-blur-md transition-opacity"
            style={{
                border: `1px solid ${T.border}`,
                background: isOpened
                    ? "linear-gradient(165deg, rgba(8,7,6,0.86) 0%, rgba(8,7,6,0.66) 55%, rgba(8,7,6,0.78) 100%)"
                    : "linear-gradient(165deg, rgba(8,7,6,0.7) 0%, rgba(8,7,6,0.5) 100%)",
                opacity: isOpened ? 1 : 0.94,
            }}
        >
            {/* corner brackets, mode-accented */}
            <span className="absolute top-0 left-0 w-6 h-[3px]" style={{ background: accent.bright }} />
            <span className="absolute top-0 left-0 w-[3px] h-6" style={{ background: accent.bright }} />
            <span className="absolute bottom-0 right-0 w-6 h-[3px]" style={{ background: accent.bright }} />
            <span className="absolute bottom-0 right-0 w-[3px] h-6" style={{ background: accent.bright }} />

            <div className="flex items-start justify-between mb-3 gap-3">
                <div>
                    <p
                        style={{
                            fontSize: "10px",
                            letterSpacing: "0.24em",
                            color: accent.base,
                            textTransform: "uppercase",
                            margin: "0 0 4px",
                        }}
                    >
                        {MODE_METHOD[mode]}
                    </p>
                    <h4 className="font-[family-name:var(--font-display)]" style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.1em", color: T.value, margin: 0 }}>
                        {MODE_LABELS[mode]}
                    </h4>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                    {isOpened ? (
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {maxStreak > 0 && <StreakBadge maxStreak={maxStreak} accent={accent} />}
                            {cycleCount != null && cycleCount > 0 && <CycleBadge cycleCount={cycleCount} accent={accent} />}
                        </div>
                    ) : (
                        <span style={{ fontSize: "10px", letterSpacing: "0.2em", color: T.mutedMid, textTransform: "uppercase", opacity: 0.8, whiteSpace: "nowrap" }}>
                            UNRECORDED
                        </span>
                    )}
                    <span className="text-4xl font-black select-none" style={{ color: accent.base, opacity: 0.15 }}>
                        {MODE_KANJI[mode]}
                    </span>
                </div>
            </div>

            <Rule dim />

            {played + passed === 0 ? (
                <SealedArchive accent={accent} />
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-4 gap-3 py-4">
                        <div>
                            <p style={{ fontSize: "12px", color: T.label, letterSpacing: "0.2em", margin: "0 0 4px" }}>SOLVED</p>
                            <p style={{ fontSize: "18px", fontWeight: 700, color: T.value, margin: 0 }}>{played.toLocaleString()}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: "12px", color: T.label, letterSpacing: "0.2em", margin: "0 0 4px" }}>MISSED</p>
                            <p style={{ fontSize: "18px", fontWeight: 700, color: T.mutedMid, margin: 0 }}>{passed.toLocaleString()}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: "12px", color: T.label, letterSpacing: "0.2em", margin: "0 0 4px" }}>WIN RATE</p>
                            <p style={{ fontSize: "18px", fontWeight: 700, color: accent.bright, margin: 0 }}>
                                {pWin != null ? `${pWin}%` : "—"}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: "12px", color: T.label, letterSpacing: "0.2em", margin: "0 0 4px" }}>STREAK</p>
                            <p style={{ fontSize: "18px", fontWeight: 700, color: T.value, margin: 0 }}>
                                {currentStreak.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <Rule dim />

                    <p style={{ fontSize: "12px", letterSpacing: "0.24em", color: T.label, textTransform: "uppercase", margin: "14px 0 4px" }}>
                        GUESS DISTRIBUTION
                    </p>
                    <GuessDistribution dist={personalStat?.guess_distribution ?? {}} accent={accent} />

                    {pAvg != null && (
                        <p style={{ fontSize: "12px", color: T.mutedMid, letterSpacing: "0.08em", margin: "10px 0 0" }}>
                            YOU: <span style={{ color: accent.bright, fontWeight: 700 }}>{pAvg} guesses avg</span>
                            {variant === "daily" && gAvg != null && (
                                <>
                                    {" · "}GLOBAL: <span style={{ color: T.body }}>{gAvg} guesses avg</span>
                                </>
                            )}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
//  §03 PER-MODE CYCLE BADGE (unlimited only)
// ─────────────────────────────────────────────

function CycleBadge({
    cycleCount,
    accent,
}: {
    cycleCount: number;
    accent: { base: string; bright: string };
}) {
    const isLit = cycleCount > 0;
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 flex-shrink-0"
            style={{
                border: `1px solid ${isLit ? accent.base + "66" : T.borderDim}`,
                background: isLit ? `${accent.base}14` : "rgba(255,255,255,0.02)",
            }}
            title="Times this discipline's Unlimited roster has been fully cleared"
        >
            <span style={{ fontSize: "10px", letterSpacing: "0.14em", color: isLit ? accent.bright : T.mutedMid }}>
                CYCLE {cycleCount.toLocaleString()}
            </span>
        </span>
    );
}

// ─────────────────────────────────────────────
//  §05 BADGE / TIER WALL
// ─────────────────────────────────────────────

// Deterministic (no Math.random — avoids SSR/client hydration mismatch)
// pseudo-scatter for particle positions/timing, seeded by rank + index.
function reiatsuParticleStyle(rank: number, i: number): React.CSSProperties {
    const left = ((i * 29 + rank * 17) % 86) + 4; // 4–90%
    const delay = ((i * 0.41 + rank * 0.23) % 2.6).toFixed(2);
    const duration = (2.1 + ((i + rank * 2) % 3) * 0.55).toFixed(2);
    const size = 2 + rank + ((i * 7 + rank * 3) % 3); // grows with rank: ~2–4px at rank 0, ~5–7px at rank 3
    const drift = ((i % 2 === 0 ? 1 : -1) * (6 + rank * 4 + ((i * 5 + rank) % 10))).toFixed(0);
    return {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        "--bd-drift": `${drift}px`,
    } as React.CSSProperties;
}

// Higher tiers = denser, brighter reiatsu bleed-off — a Soul King badge
// should visibly radiate more spiritual pressure than a First Awakening one.
const RANK_PARTICLE_COUNT = [3, 8, 14, 22];
const RANK_GLOW = [
    { core: "rgba(160,140,100,0.22)", spark: "#a8916a", ring: "#a8916a55", label: "bronze" },
    { core: "rgba(224,189,126,0.4)", spark: "#e0bd7e", ring: "#e0bd7e90", label: "silver-gold" },
    { core: "rgba(255,206,70,0.6)", spark: "#ffce46", ring: "#ffce46c0", label: "gold" },
    { core: "rgba(255,228,163,0.85)", spark: "#ffe4a3", ring: "#ffe4a3ff", label: "radiant" },
];

function ReiatsuParticles({ rank }: { rank: number }) {
    const count = RANK_PARTICLE_COUNT[Math.min(rank, RANK_PARTICLE_COUNT.length - 1)];
    const glow = RANK_GLOW[Math.min(rank, RANK_GLOW.length - 1)];
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: count }).map((_, i) => (
                <span
                    key={i}
                    className="absolute rounded-full bd-reiatsu-mote"
                    style={{
                        bottom: "8%",
                        background: glow.spark,
                        boxShadow: `0 0 6px 1px ${glow.core}`,
                        ...reiatsuParticleStyle(rank, i),
                    }}
                />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
//  §05 DISCIPLINE REGISTRY — per-mode soul name + cycle count
//  Reuses the BadgeCell ritual (particles, rank-scaled glow) but the
//  "unlock" state and glow intensity are driven by that mode's own
//  cycle count, not a shared badge threshold — every discipline gets its
//  own etched name and its own reiatsu bleed-off.
// ─────────────────────────────────────────────

function rankForCycles(cycles: number): number {
    if (cycles >= 100) return 3;
    if (cycles >= 10) return 2;
    if (cycles >= 3) return 1;
    return 0;
}

function DisciplineRegistryCell({
    mode,
    name,
    cycles,
    onRename,
}: {
    mode: SubFeatureKey;
    name: string | null;
    cycles: number;
    onRename?: (newName: string) => void;
}) {
    const accent = MODE_ACCENT[mode] ?? FALLBACK_ACCENT;
    const claimed = cycles > 0 && !!name;
    const rank = rankForCycles(cycles);
    const isMaxRank = rank >= RANK_GLOW.length - 1;
    const kanjiSize = 24 + rank * 3;
    const shadowSpread = 10 + rank * 10;
    const canEdit = claimed && !!onRename;

    const [hovered, setHovered] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(name ?? "");

    const startEdit = () => {
        if (!canEdit) return;
        setDraft(name ?? "");
        setEditing(true);
    };

    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== name && onRename) onRename(trimmed);
        setEditing(false);
    };

    return (
        <div
            className={`relative overflow-hidden flex flex-col items-center justify-center gap-1.5 p-4 text-center backdrop-blur-md transition-colors ${claimed && isMaxRank ? "bd-badge-pulse" : ""
                }`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                border: `${claimed ? 1 + rank * 0.5 : 1}px solid ${claimed ? accent.base + Math.min(255, 100 + rank * 45).toString(16) : "#4a453d"}`,
                background: claimed
                    ? `linear-gradient(180deg, ${accent.glow}, rgba(8,7,6,0.78) 65%)`
                    : "linear-gradient(180deg, rgba(8,7,6,0.68), rgba(8,7,6,0.5))",
                minHeight: "132px",
                boxShadow: claimed
                    ? `0 0 ${shadowSpread}px -4px ${accent.glow}, inset 0 0 ${10 + rank * 6}px -6px ${accent.glow}`
                    : "none",
                cursor: canEdit && !editing ? "pointer" : "default",
                // @ts-expect-error custom property read by the pulse keyframe
                "--bd-pulse-color": accent.bright,
            }}
        >
            {claimed && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% 34%, ${accent.glow} 0%, transparent ${55 + rank * 6}%)`,
                        opacity: 0.35 + rank * 0.18,
                    }}
                />
            )}

            {claimed && <ReiatsuParticles rank={rank} />}

            {/* ── HOVER EDIT AFFORDANCE — only when there's a real name to edit
                 and the parent actually wired persistence via onRename. Clicking
                 anywhere on a claimed card (or the pencil) opens inline rename. ── */}
            {canEdit && !editing && (
                <button
                    type="button"
                    onClick={startEdit}
                    aria-label={`Re-etch name for ${MODE_LABELS[mode]}`}
                    className="absolute inset-0 flex items-start justify-end p-2 transition-opacity"
                    style={{
                        opacity: hovered ? 1 : 0,
                        background: hovered ? "rgba(8,7,6,0.35)" : "transparent",
                        cursor: "pointer",
                        border: "none",
                    }}
                >
                    <span
                        style={{
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            color: accent.bright,
                            background: "rgba(8,7,6,0.75)",
                            border: `1px solid ${accent.base}`,
                            padding: "3px 7px",
                            borderRadius: "2px",
                        }}
                    >
                        ✎ RE-ETCH
                    </span>
                </button>
            )}

            <span
                className="relative select-none"
                style={{
                    fontSize: `${kanjiSize}px`,
                    color: claimed ? accent.bright : "#8a8276",
                    textShadow: claimed ? `0 0 ${4 + rank * 6}px ${accent.bright}` : "none",
                    transition: "font-size 0.2s ease",
                }}
            >
                {MODE_KANJI[mode]}
            </span>
            <p
                style={{
                    fontSize: "10px",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: claimed ? T.mutedMid : "#6d6860",
                    margin: 0,
                    position: "relative",
                }}
            >
                {MODE_LABELS[mode]}
            </p>

            {editing ? (
                <div className="relative flex items-center gap-1" style={{ marginTop: "2px" }} onClick={(e) => e.stopPropagation()}>
                    <input
                        autoFocus
                        maxLength={15}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") commit();
                            if (e.key === "Escape") setEditing(false);
                        }}
                        onBlur={commit}
                        style={{
                            width: "84px",
                            background: "rgba(0,0,0,0.5)",
                            border: `1px solid ${accent.base}`,
                            color: T.value,
                            fontSize: "12px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            textAlign: "center",
                            padding: "3px 4px",
                            outline: "none",
                        }}
                    />
                </div>
            ) : (
                <p
                    style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: claimed ? accent.bright : "#8a8276",
                        margin: "2px 0 0",
                        position: "relative",
                        wordBreak: "break-word",
                    }}
                >
                    {claimed ? name!.toUpperCase() : "UNCLAIMED"}
                </p>
            )}
            <p
                style={{
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    color: claimed ? T.goldBright : "#8a8276",
                    margin: 0,
                    position: "relative",
                    fontWeight: claimed ? 700 : 400,
                }}
            >
                {claimed ? `${cycles.toLocaleString()} CYCLE${cycles === 1 ? "" : "S"} SEALED` : "NO RECORD ON FILE"}
            </p>
        </div>
    );
}


function BadgeCell({ badge, rank }: { badge: BadgeTier; rank: number }) {
    const glow = RANK_GLOW[Math.min(rank, RANK_GLOW.length - 1)];
    const isMaxRank = rank >= RANK_GLOW.length - 1;
    const kanjiSize = 24 + rank * 3; // 24px → 33px, top tier kanji visibly larger
    const shadowSpread = 10 + rank * 10; // 10 → 40, much wider bleed at high rank

    return (
        <div
            className={`relative overflow-hidden flex flex-col items-center justify-center gap-2 p-4 text-center backdrop-blur-md transition-colors ${badge.unlocked && isMaxRank ? "bd-badge-pulse" : ""
                }`}
            style={{
                border: `${badge.unlocked ? 1 + rank * 0.5 : 1}px solid ${badge.unlocked ? glow.ring : "#4a453d"}`,
                background: badge.unlocked
                    ? `linear-gradient(180deg, ${glow.core}, rgba(8,7,6,0.78) 65%)`
                    : "linear-gradient(180deg, rgba(8,7,6,0.68), rgba(8,7,6,0.5))",
                minHeight: "120px",
                boxShadow: badge.unlocked
                    ? `0 0 ${shadowSpread}px -4px ${glow.core}, inset 0 0 ${10 + rank * 6}px -6px ${glow.core}`
                    : "none",
                // @ts-expect-error custom property read by the pulse keyframe
                "--bd-pulse-color": glow.spark,
            }}
        >
            {/* Radial burst behind the kanji — density/spread scales with rank so
                higher tiers visibly radiate more reiatsu, not just a color swap. */}
            {badge.unlocked && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% 38%, ${glow.core} 0%, transparent ${55 + rank * 6}%)`,
                        opacity: 0.4 + rank * 0.18,
                    }}
                />
            )}

            {badge.unlocked && <ReiatsuParticles rank={rank} />}

            <span
                className="relative select-none"
                style={{
                    fontSize: `${kanjiSize}px`,
                    color: badge.unlocked ? T.goldBright : "#8a8276",
                    textShadow: badge.unlocked ? `0 0 ${4 + rank * 6}px ${glow.spark}` : "none",
                    transition: "font-size 0.2s ease",
                }}
            >
                {badge.kanji}
            </span>
            <p
                style={{
                    fontSize: "12px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: badge.unlocked ? T.value : "#b5ab9c",
                    margin: 0,
                    position: "relative",
                    fontWeight: isMaxRank && badge.unlocked ? 700 : 400,
                }}
            >
                {badge.label}
            </p>
            {badge.unlocked ? (
                <p
                    style={{
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        color: glow.spark,
                        margin: 0,
                        position: "relative",
                        fontWeight: 700,
                    }}
                >
                    UNLOCKED
                </p>
            ) : (
                <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                    <span style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.02em", color: "#c9a35f" }}>
                        {badge.requirementValue}
                    </span>
                    <span style={{ fontSize: "11px", letterSpacing: "0.08em", color: "#8a8276", lineHeight: 1.4 }}>
                        {badge.requirementLabel}
                    </span>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────

export default function StatsHubPage({
    variant = "unlimited",
    soulName = null,
    nameMismatch = false,
    reincarnationCount = 0,
    personal = {},
    global = {},
    globalTickerStats = {},
    totalCycleTiers = [],
    masteryTiers = [],
    disciplineRegistry = {},
    onRenameDiscipline,
    topSouls = [],
}: Partial<StatsHubProps>) {
    const isDaily = variant === "daily";
    const today = useMemo(
        () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
        []
    );

    const totalSolves = totalSolvesAcrossModes(personal);
    const overall = overallWinRate(personal);
    const best = bestMode(personal);

    return (
        <div className="min-h-screen w-full" style={{ color: T.value }}>
            {/* ══ §00 SEAL BANNER ══ */}
            <SecurityStrip />
            <div
                className="max-w-5xl mx-auto px-5 md:px-8 pt-10 pb-6"
                style={{
                    background: "linear-gradient(180deg, rgba(5,5,6,0.55) 0%, rgba(5,5,6,0.2) 80%, transparent 100%)",
                    backdropFilter: "blur(3px)",
                }}
            >
                <p className="font-[family-name:var(--font-display)]" style={{ fontSize: "11px", letterSpacing: "0.32em", color: T.label, textTransform: "uppercase", margin: "0 0 10px" }}>
                    CENTRAL 46 · SPIRITUAL RECORD ARCHIVE · 霊圧記録保管庫 · {isDaily ? "DAILY DUEL LEDGER" : "UNLIMITED CAMPAIGN LEDGER"}
                </p>
                <div className="flex items-end justify-between flex-wrap gap-3">
                    <h1 className="font-[family-name:var(--font-display)]" style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "0.08em", margin: 0, color: T.value }}>
                        {isDaily ? "TODAY'S DUEL RECORD" : "YOUR REIATSU DOSSIER"}
                    </h1>
                    <div className="text-right">
                        {!isDaily && (
                            <p style={{ fontSize: "12px", color: T.muted, letterSpacing: "0.2em", margin: 0 }}>
                                {soulName ? soulName.toUpperCase() : "UNREGISTERED SOUL"}
                                {soulName && nameMismatch && (
                                    <span style={{ color: T.gold, marginLeft: "8px", fontSize: "10px" }} title="Names differ across disciplines — showing your most-used name">
                                        NAME VARIES BY DISCIPLINE
                                    </span>
                                )}
                            </p>
                        )}
                        <p style={{ fontSize: "12px", color: T.mutedMid, letterSpacing: "0.2em", margin: "2px 0 0" }}>
                            {isDaily ? today : `${reincarnationCount} TOTAL CYCLES · ALL DISCIPLINES · ${today}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* ══ §01 GLOBAL PULSE TICKER ══ */}
            <DailyStatsBar stats={globalTickerStats} />

            <div className="max-w-5xl mx-auto px-5 md:px-8 py-10 flex flex-col gap-14">
                {/* ══ §02 PERSONAL OVERVIEW ══ */}
                <div>
                    <SectionHead>§ 01 — Overview</SectionHead>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <HeroMetric label="TOTAL SOLVED" value={totalSolves.toLocaleString()} sub={isDaily ? "ALL MODES · TODAY" : "ALL MODES · ALL TIME"} />
                        <HeroMetric
                            label="OVERALL WIN RATE"
                            value={overall != null ? `${overall}%` : "—"}
                            sub="SOLVED / ATTEMPTED"
                            accent={T.green}
                        />
                        <HeroMetric
                            label="STRONGEST DISCIPLINE"
                            value={best ? MODE_KANJI[best] : "—"}
                            sub={best ? MODE_LABELS[best] : "INSUFFICIENT DATA"}
                            accent={best ? (MODE_ACCENT[best]?.bright ?? T.gold) : T.gold}
                        />
                        {isDaily ? (
                            <HeroMetric label="MODES CLEARED" value={`${MODE_ORDER.filter((m) => (personal[m]?.played ?? 0) > 0).length}/6`} sub="TODAY'S SEAL" />
                        ) : (
                            <HeroMetric label="SOUL CYCLE" value={reincarnationCount} sub="ALL DISCIPLINES · COMBINED" />
                        )}
                    </div>
                </div>

                {/* ══ §03 PER-MODE ARCHIVE ══ */}
                <div>
                    <SectionHead>§ 02 — Discipline Records</SectionHead>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {MODE_ORDER.map((mode) => (
                            <ModeArchiveCard variant={variant} key={mode} mode={mode} personalStat={personal[mode]} globalStat={global[mode]} />
                        ))}
                    </div>
                </div>

                {/* ══ §04 SOUL REGISTRY ROLL — Unlimited only ══ */}
                {!isDaily && topSouls.length > 0 && (
                    <div>
                        <SectionHead>§ 03 — Soul Registry Roll</SectionHead>
                        <div
                            className="backdrop-blur-md"
                            style={{
                                border: `1px solid ${T.border}`,
                                background: "linear-gradient(180deg, rgba(8,7,6,0.78), rgba(8,7,6,0.6))",
                            }}
                        >
                            {topSouls.slice(0, 8).map((s, i) => (
                                <div key={s.name}>
                                    <div className="flex items-center justify-between px-5 py-3">
                                        <span style={{ fontSize: "12px", letterSpacing: "0.1em", color: T.mutedMid }}>
                                            #{i + 1} <span style={{ color: T.value, marginLeft: "10px" }}>{s.name.toUpperCase()}</span>
                                        </span>
                                        <span style={{ fontSize: "12px", color: T.gold, fontWeight: 700 }}>{s.cycles} CYCLES</span>
                                    </div>
                                    {i < topSouls.length - 1 && <Rule dim />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ══ §05 BADGE / TIER WALL — Unlimited only, split into two tracks ══
                     Dedication (sum across modes) is kept separate from Mastery (best
                     single mode) so a small-roster discipline can no longer "buy" a
                     badge — like Soul King — that's meant to signal all-around skill. */}
                {!isDaily && (
                    <>
                        <div>
                            <SectionHead>§ 04 — Discipline Mastery</SectionHead>
                            <p style={{ fontSize: "12px", color: T.mutedMid, letterSpacing: "0.06em", margin: "-10px 0 16px" }}>
                                Full pool clears in your single strongest discipline. This is the prestige track.
                            </p>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                {masteryTiers.map((b, i) => (
                                    <BadgeCell key={b.id} badge={b} rank={i} />
                                ))}
                            </div>
                        </div>

                        {/* ══ §05 DISCIPLINE REGISTRY — per-mode soul name + cycle count ══ */}
                        <div>
                            <SectionHead>§ 05 — Discipline Registry</SectionHead>
                            <p style={{ fontSize: "12px", color: T.mutedMid, letterSpacing: "0.06em", margin: "-10px 0 16px" }}>
                                The name sealed to each discipline, and how many times its cycle has turned.
                                {onRenameDiscipline && " Hover a claimed record to re-etch its name."}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {MODE_ORDER.map((mode) => (
                                    <DisciplineRegistryCell
                                        key={mode}
                                        mode={mode}
                                        name={disciplineRegistry[mode]?.name ?? null}
                                        cycles={disciplineRegistry[mode]?.cycles ?? 0}
                                        onRename={onRenameDiscipline ? (newName) => onRenameDiscipline(mode, newName) : undefined}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <SectionHead>§ 06 — Dedication Roll</SectionHead>
                            <p style={{ fontSize: "12px", color: T.mutedMid, letterSpacing: "0.06em", margin: "-10px 0 16px" }}>
                                Counted from your LOWEST discipline's full-pool clears, not the sum — every
                                mode must reach that level together. Grinding one mode alone won't move this.
                            </p>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                {totalCycleTiers.map((b, i) => (
                                    <BadgeCell key={b.id} badge={b} rank={i} />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ══ §07 FOOTER ══ */}
            <div
                style={{
                    borderTop: `1px solid ${T.borderDim}`,
                }}
                className="max-w-5xl mx-auto px-5 md:px-8 py-5 backdrop-blur-sm"
            >
                <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                    <p style={{ fontSize: "12px", color: T.muted, letterSpacing: "0.24em", textTransform: "uppercase", margin: 0 }}>
                        CENTRAL 46 · ARCHIVAL DIVISION · SOUL SOCIETY
                    </p>
                    <p style={{ fontSize: "12px", color: T.muted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                        RECORD SEALED {today}
                    </p>
                </div>
                <p style={{ fontSize: "12px", color: T.borderDim, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                    PROPERTY OF THE CENTRAL FORTY-SIX CHAMBERS · UNAUTHORIZED ACCESS IS PROHIBITED
                </p>
            </div>
        </div>
    );
}