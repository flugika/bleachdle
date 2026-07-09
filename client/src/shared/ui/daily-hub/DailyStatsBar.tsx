// src/shared/ui/DailyStatsBar.tsx
"use client";

import { MODE_ACCENT, SubFeatureKey } from "@/src/config/mode";

interface ModeStat {
    played: number;
    passed: number;
    win_rate: number;
    avg_guesses: number | null;
}
type DailyStats = Record<string, ModeStat>;

const MODE_LABELS: Record<string, string> = {
    character: "Character",
    quote: "Quote",
    song: "Song",
    silhouette: "Silhouette",
    emoji: "Emoji",
    release: "Release",
};

// Same kanji used per-mode elsewhere on the page (mode select grid), reused here as
// the entry's marker instead of a plain colored dot — reads as a label, not decoration.
const MODE_KANJI: Record<string, string> = {
    character: "士",
    quote: "言",
    silhouette: "像",
    emoji: "絵",
    song: "曲",
    release: "解",
};

// Fallback accent for any mode id that isn't in MODE_ACCENT yet, so this never throws.
const FALLBACK_ACCENT = { base: "#c8a96e", bright: "#f2cf8a", glow: "rgba(200,169,110,0.45)" };

/**
 * Renders directly beneath the static SEAL_ID / countdown / unlimited row inside the
 * hero "console" panel — a self-contained "central 46" transmission ticker. All modes
 * played today are concatenated into one continuously-scrolling line (//-separated),
 * not a crossfade slider between modes. Owns its own border/fade-mask/scroll so the
 * row above it (countdown, Enter hint, Unlimited link) can stay static and never
 * scroll out of view. If reused elsewhere, wrap it in your own container.
 */
export function DailyStatsBar({ stats }: { stats: DailyStats }) {
    if (!stats) {
        return (
            <div
                className="relative w-full overflow-hidden py-2 border-b h-[41px] flex items-center justify-center opacity-50"
                style={{ borderColor: "rgba(200,169,110,0.2)", background: "rgba(0,0,0,0.35)" }}
            >
                <div className="w-48 h-3 bg-[#c8a96e]/20 rounded animate-pulse" />
            </div>
        );
    }

    const entries = stats
        ? Object.entries(stats).filter(([, s]) => s.played > 0)
        : [];

    if (!stats || entries.length === 0) return null; // ไม่มีคนเล่นวันนี้ (เช่นตอน midnight พอดี) → ไม่โชว์ ดีกว่าโชว์เลข 0 ที่ดูซบเซา

    // Scroll speed scales with how much content there is, so a single-mode day
    // doesn't fly by and a six-mode day doesn't crawl.
    const scrollSeconds = Math.max(18, entries.length * 9);

    return (
        <>
            <style>{`
                @keyframes bd-stats-ticker-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
            <div
                className="relative w-full overflow-hidden py-2 border-b"
                style={{ borderColor: "rgba(200,169,110,0.2)", background: "rgba(0,0,0,0.35)" }}
            >
                {/* fade masks so text doesn't hard-cut at the edges, matching the strip above */}
                <div className="absolute inset-y-0 left-0 w-8 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(2,2,5,1), transparent)" }} />
                <div className="absolute inset-y-0 right-0 w-8 z-10 pointer-events-none" style={{ background: "linear-gradient(270deg, rgba(2,2,5,1), transparent)" }} />

                <div
                    className="flex items-center gap-5 whitespace-nowrap w-max"
                    style={{ animation: `bd-stats-ticker-scroll ${scrollSeconds}s linear infinite` }}
                >
                    {/* content rendered twice back-to-back so the loop is seamless */}
                    {[0, 1].map((copy) => (
                        <div key={copy} className="flex items-center gap-5">
                            {entries.map(([modeId, modeStat], i) => {
                                const accent = MODE_ACCENT[modeId as SubFeatureKey] ?? FALLBACK_ACCENT;
                                return (
                                    <span key={`${copy}-${modeId}`} className="inline-flex items-center gap-5 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs lg:text-sm font-mono tracking-[0.1em] normal-case">
                                            <span style={{ color: accent.bright }}>{MODE_KANJI[modeId] ?? "?"}</span>
                                            <span className="text-neutral-300">《{MODE_LABELS[modeId] ?? modeId}》</span>
                                            <span className="font-semibold text-white">{modeStat.played.toLocaleString()}</span>
                                            <span className="text-neutral-400">solved</span>
                                            {modeStat.avg_guesses != null && (
                                                <span className="text-neutral-400">・avg {modeStat.avg_guesses} g</span>
                                            )}
                                        </span>
                                        <span style={{ color: `${FALLBACK_ACCENT.base}88` }}>//</span>
                                    </span>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}