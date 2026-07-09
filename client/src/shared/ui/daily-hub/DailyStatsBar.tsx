// src/shared/ui/daily-hub/DailyStatsBar.tsx
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

const MODE_KANJI: Record<string, string> = {
    character: "士",
    quote: "言",
    silhouette: "像",
    emoji: "絵",
    song: "曲",
    release: "解",
};

const FALLBACK_ACCENT = { base: "#c8a96e", bright: "#f2cf8a", glow: "rgba(200,169,110,0.45)" };

export function DailyStatsBar({ stats }: { stats: DailyStats }) {
    // จังหวะที่รอโหลดข้อมูลจาก Server (ป้องกัน UI กระตุก)
    if (!stats) {
        return (
            <div
                className="relative w-full overflow-hidden py-2 border-b flex items-center justify-center opacity-50"
                style={{ borderColor: "rgba(200,169,110,0.2)", background: "rgba(0,0,0,0.35)", minHeight: "36px" }}
            >
                <div className="w-48 h-3 bg-[#c8a96e]/20 rounded animate-pulse" />
            </div>
        );
    }

    const entries = Object.entries(stats).filter(([, s]) => s.played > 0);

    // ──────────────────────────────────────────────────────────────────────────
    // ✨ EMPTY STATE: กรณีเริ่มวันใหม่ ยังไม่มีใครเล่นเลย (played = 0 ทุกโหมด)
    // เดิม: "REIATSU TRACES: ZERO // AWAITING FIRST CHALLENGER" — frame เป็นความ
    // ว่างเปล่า ซึ่งไปลด FOMO/urgency ของ social proof แทนที่จะสร้างมันขึ้นมา
    // ใหม่: frame เป็น "โอกาส/คำเชิญ" (ยังไม่มีใครแตะซีลวันนี้เลย → คุณเป็นคนแรก
    // ได้) ซึ่งทำงานเหมือน social proof ที่กลับด้าน — ความว่างเปล่า = โอกาสพิเศษ
    // ไม่ใช่สัญญาณว่า "ยังไม่มีใครสนใจ"
    // ──────────────────────────────────────────────────────────────────────────
    if (entries.length === 0) {
        return (
            <>
                <div
                    className="relative w-full overflow-hidden py-2 border-b flex items-center justify-center"
                    style={{ borderColor: "rgba(200,169,110,0.2)", background: "rgba(0,0,0,0.35)", minHeight: "36px" }}
                >
                    <div className="absolute inset-y-0 left-0 w-8 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(2,2,5,1), transparent)" }} />
                    <div className="absolute inset-y-0 right-0 w-8 z-10 pointer-events-none" style={{ background: "linear-gradient(270deg, rgba(2,2,5,1), transparent)" }} />

                    {/* breathing ambient glow behind the text — reads as a live signal, not a dead panel */}
                    <div
                        className="bd-empty-glow absolute w-40 h-8 rounded-full blur-2xl pointer-events-none"
                        style={{ background: "radial-gradient(ellipse, rgba(242,207,138,0.35), transparent 70%)", animation: "bd-empty-breathe 3.4s ease-in-out infinite" }}
                    />

                    {/* radar-style scan line sweeping across — "listening" for the first signal.
                        Element is a narrow (16%) band centered on the bar; translateX is a
                        percentage of the element's OWN width, so ±600% reliably carries it
                        from fully off-screen-left to fully off-screen-right regardless of
                        how wide the bar renders at different breakpoints. */}
                    <div
                        className="bd-empty-scan absolute inset-y-0 pointer-events-none"
                        style={{
                            left: "42%",
                            width: "16%",
                            background: "linear-gradient(90deg, transparent, rgba(242,207,138,0.22), transparent)",
                            animation: "bd-scan-sweep 3.8s ease-in-out infinite",
                        }}
                    />

                    <div className="relative flex items-center gap-2.5 text-[9px] md:text-[10px] lg:text-[11px] font-mono tracking-[0.2em] uppercase select-none z-0">
                        <span className="text-[#c8a96e] animate-pulse">◆</span>
                        <span className="text-neutral-500 bd-empty-flicker">
                            <span className="text-[#f2cf8a] font-bold">SEAL UNTOUCHED</span>
                            <span className="mx-2 opacity-50 text-white/85">//</span>
                            <span className="text-white/85">BE THE FIRST TO BREAK IT TODAY</span>
                        </span>
                        <span className="text-[#c8a96e] animate-pulse" style={{ animationDelay: "1s" }}>◆</span>
                    </div>
                </div>
            </>
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ✅ POPULATED STATE: มีคนเล่นแล้ว แสดงแถบ Ticker เลื่อนไปมาตามปกติ
    // ──────────────────────────────────────────────────────────────────────────
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
                style={{ borderColor: "rgba(200,169,110,0.2)", background: "rgba(0,0,0,0.35)", minHeight: "36px" }}
            >
                <div className="absolute inset-y-0 left-0 w-8 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, rgba(2,2,5,1), transparent)" }} />
                <div className="absolute inset-y-0 right-0 w-8 z-10 pointer-events-none" style={{ background: "linear-gradient(270deg, rgba(2,2,5,1), transparent)" }} />

                <div
                    className="flex items-center gap-5 whitespace-nowrap w-max"
                    style={{ animation: `bd-stats-ticker-scroll ${scrollSeconds}s linear infinite` }}
                >
                    {[0, 1].map((copy) => (
                        <div key={copy} className="flex items-center gap-5">
                            {entries.map(([modeId, modeStat]) => {
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