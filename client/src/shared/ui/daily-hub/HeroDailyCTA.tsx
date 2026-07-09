// ============================================================================
// HERO CTA v4 — fixes from feedback:
//   1. Button color: was a linear gradient sweeping left→right. Now it's two
//      blurred radial "reiatsu blobs" (red/orange + blue/cyan) that orbit in
//      circular paths independently, crossing over a base — reads as two
//      opposing spiritual pressures colliding, not a printed gradient.
//   2. White/gold sheen: was animating at all times (just invisible at
//      opacity:0). Now animation-play-state is explicitly "paused" by
//      default and only flips to "running" on :hover via group-hover —
//      verified with a real CSS class + animation-play-state (not an
//      opacity trick), so it CANNOT run before hover, full stop.
//   3. Base color was solid near-black (#120c0a). The orbiting blobs only
//      cover ~70%/140% of the button and drift, so whenever both drifted
//      away from a corner at once, bare black showed through underneath —
//      that's the "black patches" bug. Fixed two ways: the base itself is
//      now a warm→cool gradient (so there's no neutral color to expose in
//      the first place) AND the blobs are bigger (90%/180%) so they still
//      overlap every corner even mid-orbit.
//   4. Card is now responsive (400/600/800 at base/md/lg) instead of a
//      fixed px width — padding, button, type, and ticker scale on the
//      same breakpoints so proportions track the container at each size.
// ============================================================================

import Link from "next/link";
import { useRef } from "react";
import { DailyCountdownBadge } from "@/src/shared/ui/daily-hub/DailyCountdownBadge";
import { DailyStatsBar } from "@/src/shared/ui/daily-hub/DailyStatsBar";
import { KidoSeal } from "@/src/features/support/KidoSeal";
import { DIMENSION_ACCENT } from "@/src/config/mode";

function useSealBurst(ref: React.RefObject<HTMLDivElement | null>) {
    return () => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const colors = ["#d94f4f", "#e2683a", "#4a90d9", "#38b6c7", "#ffffff"];
        for (let i = 0; i < 20; i++) {
            const p = document.createElement("span");
            const angle = (360 / 20) * i + Math.random() * 10 - 5;
            const distance = 50 + Math.random() * 90;
            const size = 2 + Math.random() * 4;
            const duration = 0.55 + Math.random() * 0.3;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const rad = (angle * Math.PI) / 180;
            Object.assign(p.style, {
                position: "fixed",
                left: `${rect.left + rect.width / 2}px`,
                top: `${rect.top + rect.height / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: "50%",
                background: color,
                pointerEvents: "none",
                zIndex: "9999",
                transform: "translate(-50%,-50%) scale(1)",
                opacity: "1",
                boxShadow: `0 0 6px 1px ${color}`,
                transition: `transform ${duration}s cubic-bezier(0.22,1,0.36,1), opacity ${duration}s ease-out`,
            });
            document.body.appendChild(p);
            void p.offsetWidth;
            p.style.transform = `translate(calc(-50% + ${Math.cos(rad) * distance}px), calc(-50% + ${Math.sin(rad) * distance}px)) scale(0)`;
            p.style.opacity = "0";
            setTimeout(() => p.remove(), duration * 1000 + 50);
        }
    };
}

const TYBW_BUTTON = {
    red: "#d94f4f",
    orange: "#e2683a",
    blue: "#4a90d9",
    cyan: "#38b6c7",
    // Full-coverage warm→cool base gradient (not a neutral solid) so there's
    // nothing "bare" for the orbiting blobs to ever expose underneath them.
    base: "linear-gradient(135deg, #2b1210 0%, #170f0c 38%, #0b1620 62%, #142028 100%)",
};

export function HeroDailyCTA({
    handleNavigation,
    initialStats
}: {
    handleNavigation: (e: React.MouseEvent, href: string) => void;
    initialStats: Record<string, any>; // 💡 กำหนด Type
}) {
    const btnRef = useRef<HTMLDivElement>(null);
    const burst = useSealBurst(btnRef);
    const daily = DIMENSION_ACCENT.daily;
    const unlimited = DIMENSION_ACCENT.unlimited;

    return (
        <>
            <style>{`
                @keyframes bd-ember-rise {
                    0%   { opacity: 0; transform: translateY(0) scale(1); }
                    15%  { opacity: 0.9; }
                    100% { opacity: 0; transform: translateY(-90px) scale(0.4); }
                }
                @keyframes bd-seal-breathe {
                    0%, 100% { box-shadow: 0 10px 40px rgba(226,104,58,0.3), 0 10px 40px rgba(56,182,199,0.3), 0 0 0 0 rgba(255,255,255,0.15); }
                    50%      { box-shadow: 0 16px 60px rgba(226,104,58,0.5), 0 16px 60px rgba(56,182,199,0.5), 0 0 0 6px rgba(255,255,255,0.06); }
                }

                /* two blobs orbiting in circular paths, opposite phase/direction so they cross.
                   Kept off-center enough to swap dominance corner-to-corner, but sized (see
                   className w/h below) so they always overlap at least one corner pair. */
                @keyframes bd-orbit-warm {
                    0%   { transform: translate(-12%, -8%)  scale(1);   }
                    25%  { transform: translate(10%, -12%)  scale(1.12); }
                    50%  { transform: translate(14%, 10%)   scale(0.96); }
                    75%  { transform: translate(-10%, 12%)  scale(1.08); }
                    100% { transform: translate(-12%, -8%)  scale(1);   }
                }
                @keyframes bd-orbit-cool {
                    0%   { transform: translate(12%, 10%)   scale(1.04); }
                    25%  { transform: translate(-10%, 12%)  scale(0.92); }
                    50%  { transform: translate(-14%, -10%) scale(1.12); }
                    75%  { transform: translate(10%, -12%)  scale(1);    }
                    100% { transform: translate(12%, 10%)   scale(1.04); }
                }

                @keyframes bd-panel-glow {
                    0%, 100% { opacity: 0.35; transform: scale(1); }
                    50%      { opacity: 0.6;  transform: scale(1.04); }
                }
                @keyframes bd-border-sweep {
                    0%   { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                @keyframes bd-scanline {
                    0%   { transform: translateY(-100%); opacity: 0; }
                    10%  { opacity: 0.5; }
                    90%  { opacity: 0.5; }
                    100% { transform: translateY(100%); opacity: 0; }
                }
                @keyframes bd-ring-spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes bd-ticker-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }

                /* Gold sheen sweep. Key point: .bd-sheen is PAUSED and invisible by
                   default. It only starts moving AND becomes visible once the button
                   (.group\\/btn) is hovered. Two guarantees stacked, not just one. */
                @keyframes bd-sheen-sweep {
                    0%   { transform: translate(-30%, -30%) rotate(0deg); }
                    100% { transform: translate(-30%, -30%) rotate(360deg); }
                }
                .bd-sheen {
                    animation: bd-sheen-sweep 3s linear infinite;
                    animation-play-state: paused;
                    opacity: 0;
                    transition: opacity 0.25s ease-out;
                }
                .group\\/btn:hover .bd-sheen {
                    animation-play-state: running;
                    opacity: 1;
                }
            `}</style>

            <div className="relative w-[400px] md:w-[600px] lg:w-[800px] flex flex-col items-center py-2">

                <div
                    className="absolute inset-0 -z-10 pointer-events-none blur-3xl"
                    style={{
                        background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${daily.glow}, transparent 70%)`,
                        animation: "bd-panel-glow 4s ease-in-out infinite",
                    }}
                />

                <div
                    className="relative w-full p-[1px] overflow-hidden"
                    style={{
                        background: `linear-gradient(120deg, ${daily.base}00, ${daily.base}aa, ${daily.bright}, ${daily.base}aa, ${daily.base}00)`,
                        backgroundSize: "220% 100%",
                        animation: "bd-border-sweep 6s linear infinite",
                    }}
                >
                    <div
                        className="relative w-full flex flex-col items-center px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10 overflow-hidden"
                        style={{
                            background: "linear-gradient(180deg, rgba(10,10,15,0.92), rgba(2,2,5,0.96))",
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        <div
                            className="absolute left-0 right-0 h-24 pointer-events-none"
                            style={{
                                background: `linear-gradient(180deg, transparent, ${daily.bright}22, transparent)`,
                                animation: "bd-scanline 5s ease-in-out infinite",
                            }}
                        />

                        <span className="absolute top-2 left-2 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-t-2 border-l-2" style={{ borderColor: `${daily.base}55` }} />
                        <span className="absolute top-2 right-2 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-t-2 border-r-2" style={{ borderColor: `${daily.base}55` }} />
                        <span className="absolute bottom-2 left-2 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-b-2 border-l-2" style={{ borderColor: `${daily.base}55` }} />
                        <span className="absolute bottom-2 right-2 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 border-b-2 border-r-2" style={{ borderColor: `${daily.base}55` }} />

                        {/* ═══ BUTTON ═══ */}
                        <div ref={btnRef} className="relative z-10 w-full flex items-center justify-center">
                            <div
                                className="absolute pointer-events-none opacity-70 w-[220%] h-[380%] md:w-[240%] md:h-[420%] lg:w-[260%] lg:h-[460%] -translate-y-[18%] md:-translate-y-[20%] lg:translate-y-[60%]"
                                style={{ animation: "bd-ring-spin 22s linear infinite" }}
                            >
                                <KidoSeal size={960} color={unlimited.base} />
                            </div>

                            <div className="absolute inset-0 overflow-visible pointer-events-none z-0">
                                {[10, 26, 44, 60, 76, 90].map((left, i) => {
                                    const emberColor = i % 2 === 0 ? TYBW_BUTTON.orange : TYBW_BUTTON.cyan;
                                    return (
                                        <span
                                            key={left}
                                            className="absolute bottom-4 rounded-full"
                                            style={{
                                                left: `${left}%`,
                                                width: i % 2 === 0 ? 2 : 3,
                                                height: i % 2 === 0 ? 2 : 3,
                                                background: emberColor,
                                                opacity: 0,
                                                animation: `bd-ember-rise ${5 + i}s ease-out infinite`,
                                                animationDelay: `${i * 0.7}s`,
                                                boxShadow: `0 0 8px ${emberColor}`,
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            <Link
                                href="/daily"
                                onMouseEnter={burst}
                                onClick={(e) => { burst(); handleNavigation(e, "/daily"); }}
                                className="group/btn relative z-10 flex flex-col items-center justify-center w-full text-center py-4 px-6 md:py-5 md:px-8 lg:py-6 lg:px-10 font-black tracking-[0.18em] uppercase border border-white/15 hover:-translate-y-1 hover:scale-[1.015] active:translate-y-0 transition-all duration-500 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                style={{
                                    background: TYBW_BUTTON.base,
                                    animation: "bd-seal-breathe 3.5s ease-in-out infinite",
                                }}
                            >
                                {/* warm blob — red/orange, orbits one circular path. Sized 90%/180%
                                    (was 70%/140%) so it still overlaps a corner pair mid-orbit
                                    instead of shrinking away from it. */}
                                <span
                                    className="pointer-events-none absolute left-1/4 top-1/2 w-[90%] h-[180%] -translate-y-1/2 rounded-full blur-3xl opacity-90 group-hover/btn:opacity-100 transition-opacity duration-500"
                                    style={{
                                        background: `radial-gradient(circle, ${TYBW_BUTTON.red}, ${TYBW_BUTTON.orange} 55%, transparent 78%)`,
                                        animation: "bd-orbit-warm 6s ease-in-out infinite",
                                    }}
                                    aria-hidden="true"
                                />
                                {/* cool blob — blue/cyan, orbits opposite circular path */}
                                <span
                                    className="pointer-events-none absolute right-1/4 top-1/2 w-[90%] h-[180%] -translate-y-1/2 rounded-full blur-3xl opacity-90 group-hover/btn:opacity-100 transition-opacity duration-500"
                                    style={{
                                        background: `radial-gradient(circle, ${TYBW_BUTTON.cyan}, ${TYBW_BUTTON.blue} 55%, transparent 78%)`,
                                        animation: "bd-orbit-cool 6.5s ease-in-out infinite",
                                    }}
                                    aria-hidden="true"
                                />
                                {/* dark scrim so text stays readable regardless of where the blobs drift */}
                                <span className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden="true" />

                                {/* gold sheen — see .bd-sheen rules in <style> above: paused + invisible
                                    until .group\/btn:hover, full stop. */}
                                <span
                                    className="bd-sheen pointer-events-none absolute -inset-x-10 -inset-y-20 rounded-full blur-2xl"
                                    style={{ background: "radial-gradient(circle, rgba(242,207,138,0.6), transparent 60%)" }}
                                    aria-hidden="true"
                                />

                                <span className="pointer-events-none absolute inset-[3px] border border-white/25" />

                                <span
                                    className="relative whitespace-nowrap text-base md:text-lg lg:text-xl tracking-[0.05em] md:tracking-[0.1em] lg:tracking-[0.14em] font-black"
                                    style={{
                                        fontFamily: "'Cinzel', serif",
                                        backgroundImage: "linear-gradient(180deg, #fff7e6 0%, #f2cf8a 35%, #c8a96e 65%, #a9814f 100%)",
                                        WebkitBackgroundClip: "text",
                                        backgroundClip: "text",
                                        color: "transparent",
                                        textShadow: "0 1px 0 rgba(255,255,255,0.3), 0 2px 3px rgba(0,0,0,0.9), 0 0 18px rgba(242,207,138,0.5)",
                                    }}
                                >
                                    Play Today&apos;s Daily
                                </span>
                                <span
                                    className="relative block text-[9px] md:text-[10px] lg:text-[11px] font-mono tracking-[0.15em] normal-case font-semibold mt-1 text-white/80"
                                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                                >
                                    one puzzle, shared by everyone, gone at midnight
                                </span>

                                <span className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-white/40" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-white/40" />
                                <span className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-white/40" />
                                <span className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-white/40" />
                            </Link>
                        </div>

                        {/* ═══ Central 46 ticker strip — replaces the stacked info block.
                            Top/bottom gold hairlines + kanji seal marker frame it like an
                            official transmission line, content scrolls continuously like
                            a news ticker so all four pieces of info share one live line. ═══ */}
                        <div className="relative z-10 w-full mt-6 md:mt-7 lg:mt-8">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${daily.base}88)` }} />
                                <span className="text-[9px] md:text-[10px] lg:text-[11px] tracking-[0.3em] font-mono" style={{ color: `${daily.base}cc` }}>
                                    中央46 // TRANSMISSION
                                </span>
                                <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${daily.base}88, transparent)` }} />
                            </div>

                            {/* static control row — countdown / unlimited / Enter hint are fixed
                                reference info, not "content to browse," so they stay put and never
                                scroll out of frame like the ticker did before. */}
                            {/* Each group below is ONE inline-flex + whitespace-nowrap unit,
                                separator glued to its own front. If the row wraps on a narrow
                                card, a whole group drops to the next line together — never a
                                bare ・ left stranded at the end of a row. Deliberately not using
                                `md:` for show/hide here: this card's width is capped by its own
                                container (this component's own w-[400px]/600/800), not the
                                viewport, so viewport breakpoints for visibility would drift out
                                of sync with the container's actual size. */}
                            <div
                                className="flex flex-wrap items-center flex-col justify-center gap-x-1 gap-y-1.5 border-t px-3 py-2"
                                style={{ borderColor: `${daily.base}33`, background: "rgba(0,0,0,0.35)" }}
                            >
                                <span className="inline-flex items-center whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs font-mono tracking-[0.15em] px-2">
                                    <DailyCountdownBadge />
                                </span>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[8px] md:text-[9px] lg:text-[10px] font-mono tracking-[0.2em] uppercase px-2">
                                        <span className="text-[#5a5448]">・</span>
                                        <kbd className="px-1.5 py-0.5 border border-[#c8a96e]/40 text-[#c8a96e] rounded-sm">Enter ↵</kbd>
                                        <span className="text-white/80">play daily now</span>
                                    </span>

                                    <Link
                                        href="/unlimited"
                                        onClick={(e) => handleNavigation(e, "/unlimited")}
                                        className="group/unl inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs font-mono tracking-[0.2em] uppercase px-2 focus-visible:outline-none"
                                    >
                                        <span style={{ color: unlimited.bright }}>Play </span>
                                        <span className="font-bold group-hover/unl:brightness-125 transition-all" style={{ color: unlimited.bright }}>
                                            Unlimited
                                        </span>
                                        <span style={{ color: unlimited.bright }}>→</span>
                                    </Link>
                                </div>
                            </div>

                            {/* live stats — the only thing that actually scrolls, since it's the
                                one piece of "content" here rather than a fixed control/status. */}
                            <DailyStatsBar stats={initialStats}/>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}