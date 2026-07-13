// ============================================================================
// HERO CTA v6 — "SEALED DOSSIER"
//
// What changed from v5 and why:
//   1. CARD SHAPE: the card is no longer a plain rectangle. Corners are
//      clipped (dossier/document-envelope cut corners) and the divider
//      between the button and the transmission ticker is a torn ticket-stub
//      perforation (dashed line + punched notches on both edges) instead of
//      a flat border. This is meant to read as an artifact you were HANDED
//      — a warrant, a summons, a ticket stub — not a UI card.
//   2. HANKO SEAL: bigger, uneven "hand-stamped" silhouette (asymmetric
//      border-radius instead of a perfect circle), a circular kanji halo
//      ring around the center mark, layered ink-bleed gradients + faint
//      ink-spatter flecks nearby, and a delayed two-stage stamp-down
//      (anticipation lift, then impact) so it reads as an *event* that
//      happens to the page rather than part of the initial paint.
//   3. BUTTON AT REST: no longer flat/inert before hover. Persistent warm
//      glow, a slow one-pass gold sheen sweep, and a visible inset border
//      make the resting state itself look pressable.
//   4. COPY: the primary action label is now plain English ("ENTER TODAY'S
//      DUEL") so intent is unambiguous at a glance. Japanese is kept as a
//      smaller accent line underneath, not the primary legible signal.
//
// Requires one addition to your global font loading (e.g. app/layout.tsx or
// globals.css):
//   Google Fonts: family=Shippori+Mincho:wght@500;700
//   or self-hosted equivalent — see the note at the bottom of this file.
// ============================================================================

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DailyCountdownBadge } from "@/src/shared/ui/daily-hub/DailyCountdownBadge";
import { DailyStatsBar } from "@/src/shared/ui/daily-hub/DailyStatsBar";
import { DIMENSION_ACCENT } from "@/src/config/mode";

function useSealBurst(ref: React.RefObject<HTMLDivElement | null>) {
    return () => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const colors = ["#a13d2e", "#c8a96e", "#3a6b7a", "#ffffff"];
        for (let i = 0; i < 14; i++) {
            const p = document.createElement("span");
            const angle = (360 / 14) * i + Math.random() * 10 - 5;
            const distance = 40 + Math.random() * 70;
            const size = 2 + Math.random() * 3;
            const duration = 0.5 + Math.random() * 0.25;
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

const REIATSU = {
    warm: "#a13d2e",
    warmBright: "#d9614c",
    cool: "#3a6b7a",
    coolBright: "#5a94a3",
};

const INK_FLECKS = [
    { x: -18, y: 22, r: 1.6, o: 0.5 },
    { x: -26, y: 6, r: 1.1, o: 0.4 },
    { x: -8, y: 34, r: 2.1, o: 0.35 },
    { x: 10, y: -20, r: 1.3, o: 0.4 },
    { x: -30, y: -12, r: 0.9, o: 0.3 },
];

const HALO_TEXT = "封印　証　central46　封印　証　central46";

export function HeroDailyCTA({
    handleNavigation,
    initialStats,
}: {
    handleNavigation: (e: React.MouseEvent, href: string) => void;
    initialStats: Record<string, any>;
}) {
    const btnRef = useRef<HTMLDivElement>(null);
    const burst = useSealBurst(btnRef);
    const daily = DIMENSION_ACCENT.daily;
    const unlimited = DIMENSION_ACCENT.unlimited;
    const [stampPhase, setStampPhase] = useState<"idle" | "ready" | "stamped">("idle");

    useEffect(() => {
        const t1 = setTimeout(() => setStampPhase("ready"), 550);
        const t2 = setTimeout(() => setStampPhase("stamped"), 900);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <>
            <div className="relative w-[400px] md:w-[600px] lg:w-[800px] flex flex-col items-center py-2 font-[family-name:var(--font-display)]">

                <div
                    className="bd-panel-breathe-el absolute inset-0 -z-10 pointer-events-none blur-3xl"
                    style={{
                        background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${daily.glow}, transparent 70%)`,
                        animation: "bd-panel-breathe 5s ease-in-out infinite",
                    }}
                />

                {/* ═══ HANKO SEAL ═══ */}
                <div
                    className="absolute -top-5 -right-5 md:-top-6 md:-right-6 z-20 select-none w-20 h-20 md:w-24 md:h-24"
                    aria-hidden="true"
                >
                    {stampPhase === "stamped" && (
                        <span
                            className="absolute inset-0 rounded-full border-2 pointer-events-none"
                            style={{ borderColor: "#d9614c", animation: "bd-hanko-shock 500ms ease-out forwards" }}
                        />
                    )}

                    {INK_FLECKS.map((f, i) => (
                        <span
                            key={i}
                            className="absolute rounded-full pointer-events-none transition-opacity duration-300"
                            style={{
                                left: `calc(50% + ${f.x}px)`,
                                top: `calc(50% + ${f.y}px)`,
                                width: `${f.r * 2}px`,
                                height: `${f.r * 2}px`,
                                background: "#8a2d20",
                                opacity: stampPhase === "stamped" ? f.o : 0,
                                transitionDelay: stampPhase === "stamped" ? `${120 + i * 40}ms` : "0ms",
                            }}
                        />
                    ))}

                    <div
                        className="bd-hanko-stamp absolute inset-0 flex items-center justify-center"
                        style={{
                            opacity: stampPhase === "idle" ? 0 : 1,
                            animation:
                                stampPhase === "ready"
                                    ? "bd-hanko-approach 350ms cubic-bezier(0.2,0.9,0.3,1) forwards"
                                    : stampPhase === "stamped"
                                        ? "bd-hanko-impact 380ms cubic-bezier(0.34,1.56,0.64,1) forwards"
                                        : undefined,
                        }}
                    >
                        <svg
                            className="bd-halo-ring absolute inset-[-6px] w-[calc(100%+12px)] h-[calc(100%+12px)]"
                            viewBox="0 0 100 100"
                            style={{ animation: "bd-halo-spin 22s linear infinite" }}
                        >
                            <defs>
                                <path id="bd-halo-path" d="M 50,50 m -42,0 a 42,42 0 1,1 84,0 a 42,42 0 1,1 -84,0" />
                            </defs>
                            <text fill="rgba(217,97,76,0.55)" fontSize="6.2" letterSpacing="1">
                                <textPath href="#bd-halo-path" startOffset="0%">
                                    {HALO_TEXT}
                                </textPath>
                            </text>
                        </svg>

                        <div
                            className="relative w-16 h-16 md:w-[4.6rem] md:h-[4.6rem] flex items-center justify-center"
                            style={{
                                borderRadius: "48% 52% 46% 54% / 54% 48% 52% 46%",
                                background: "radial-gradient(circle at 32% 28%, #d9614c, #a13d2e 55%, #7a2418 85%)",
                                boxShadow:
                                    "0 8px 20px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,225,200,0.12), inset 0 0 14px rgba(0,0,0,0.35)",
                            }}
                        >
                            <div
                                className="absolute inset-[-2px] pointer-events-none opacity-60"
                                style={{
                                    borderRadius: "52% 48% 54% 46% / 46% 54% 48% 52%",
                                    border: "1.5px solid rgba(193,74,56,0.55)",
                                    transform: "rotate(6deg) scale(1.04)",
                                }}
                            />
                            <div className="absolute inset-[4px] rounded-full border" style={{ borderColor: "rgba(255,225,200,0.35)" }} />
                            <span
                                className="relative text-white font-bold text-lg md:text-xl leading-none"
                                style={{ fontFamily: "'Shippori Mincho', serif", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                            >
                                中
                            </span>
                        </div>
                    </div>
                </div>

                {/* ═══ CARD SHELL — dossier-cut corners, not a plain rectangle ═══ */}
                <div
                    className="relative w-full border"
                    style={{
                        borderColor: `${daily.base}55`,
                        background: "linear-gradient(180deg, rgba(10,10,15,0.94), rgba(2,2,5,0.97))",
                        clipPath:
                            "polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px)",
                    }}
                >
                    <span
                        className="absolute top-0 left-0 w-[26px] h-[26px] pointer-events-none"
                        style={{ background: `linear-gradient(135deg, transparent 48%, ${daily.base}40 49%, transparent 51%)` }}
                    />
                    <span
                        className="absolute bottom-0 right-0 w-[26px] h-[26px] pointer-events-none"
                        style={{ background: `linear-gradient(-45deg, transparent 48%, ${daily.base}40 49%, transparent 51%)` }}
                    />

                    <div className="relative w-full flex flex-col items-center px-5 pt-7 pb-0 md:px-8 md:pt-9 lg:px-10 lg:pt-11">
                        <span className="absolute bottom-0 left-0 w-4 h-4 md:w-5 md:h-5 border-b border-l" style={{ borderColor: `${daily.base}66` }} />

                        {/* ═══ BUTTON ═══ */}
                        <div ref={btnRef} className="relative z-10 w-full flex items-center justify-center">
                            <Link
                                href="/daily"
                                onMouseEnter={burst}
                                onClick={(e) => { burst(); handleNavigation(e, "/daily"); }}
                                className="group-btn relative z-10 flex flex-col items-center justify-center w-full text-center py-5 px-6 md:py-6 md:px-8 lg:py-7 lg:px-10 border border-white/15 hover:-translate-y-0.5 hover:border-[#d9614c]/50 active:translate-y-0 transition-all duration-300 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                style={{ background: "linear-gradient(135deg, #1c365f 0%, #121527 45%, #4d240a 100%)" }}
                            >
                                <span
                                    className="bd-cta-glow pointer-events-none absolute inset-0"
                                    style={{ boxShadow: `inset 0 0 40px ${REIATSU.warm}33, inset 0 0 2px 1px ${daily.base}55` }}
                                    aria-hidden="true"
                                />
                                <span
                                    className="bd-cta-sheen pointer-events-none absolute top-0 left-0 h-full w-1/3"
                                    style={{ background: "linear-gradient(90deg, transparent, rgba(242,207,138,0.16), transparent)" }}
                                    aria-hidden="true"
                                />

                                <span
                                    className="bd-duel-warm pointer-events-none absolute left-1/4 top-1/2 w-[85%] h-[170%] -translate-y-1/2 rounded-full blur-3xl"
                                    style={{ background: `radial-gradient(circle, ${REIATSU.warm}, ${REIATSU.warmBright} 55%, transparent 78%)` }}
                                    aria-hidden="true"
                                />
                                <span
                                    className="bd-duel-cool pointer-events-none absolute right-1/4 top-1/2 w-[85%] h-[170%] -translate-y-1/2 rounded-full blur-3xl"
                                    style={{ background: `radial-gradient(circle, ${REIATSU.cool}, ${REIATSU.coolBright} 55%, transparent 78%)` }}
                                    aria-hidden="true"
                                />
                                <span className="pointer-events-none absolute inset-0 bg-black/20" aria-hidden="true" />
                                <span className="pointer-events-none absolute inset-[3px] border border-white/20" />

                                <span
                                    className="relative whitespace-nowrap text-xl md:text-2xl lg:text-3xl tracking-[0.06em] font-extrabold uppercase"
                                    style={{
                                        backgroundImage: "linear-gradient(180deg, #fff7e6 0%, #f2cf8a 40%, #c8a96e 70%, #a9814f 100%)",
                                        WebkitBackgroundClip: "text",
                                        backgroundClip: "text",
                                        color: "transparent",
                                        textShadow: "0 1px 0 rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.9)",
                                    }}
                                >
                                    Enter Today&apos;s Guess
                                </span>
                                <span
                                    className="relative block text-[11px] md:text-xs tracking-[0.2em] mt-1.5"
                                    style={{ color: `${daily.bright}bb`, fontFamily: "'Shippori Mincho', serif" }}
                                >
                                    今日の一戦を征く
                                </span>
                                <span
                                    className="relative block text-[10px] md:text-[11px] font-mono tracking-[0.15em] normal-case font-semibold mt-2 text-white/75"
                                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                                >
                                    one puzzle, shared by everyone, gone at midnight
                                </span>
                            </Link>
                        </div>

                        {/* ═══ Ticket-stub perforation ═══ */}
                        <div className="relative w-full mt-6 md:mt-7 lg:mt-8 h-0">
                            <span
                                className="absolute -left-5 md:-left-8 lg:-left-10 top-0 w-4 h-4 md:w-5 md:h-5 rounded-full -translate-y-1/2"
                                style={{ background: "#020205", boxShadow: `inset 0 0 0 1px ${daily.base}33` }}
                            />
                            <span
                                className="absolute -right-5 md:-right-8 lg:-right-10 top-0 w-4 h-4 md:w-5 md:h-5 rounded-full -translate-y-1/2"
                                style={{ background: "#020205", boxShadow: `inset 0 0 0 1px ${daily.base}33` }}
                            />
                            <div className="w-full border-t border-dashed" style={{ borderColor: `${daily.base}55` }} />
                        </div>

                        {/* ═══ Central 46 ticker strip ═══ */}
                        <div className="relative z-10 w-full">
                            <div className="flex items-center gap-2 mt-3 mb-1.5">
                                <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${daily.base}88)` }} />
                                <span className="text-[9px] md:text-[10px] lg:text-[11px] tracking-[0.3em] font-mono" style={{ color: `${daily.base}cc` }}>
                                    中央46 // TRANSMISSION
                                </span>
                                <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${daily.base}88, transparent)` }} />
                            </div>

                            <div
                                className="border-t px-4 md:px-5 py-5 md:py-6"
                                style={{ borderColor: `${daily.base}33`, background: "rgba(0,0,0,0.35)" }}
                            >
                                {/* Row 1 — status: the countdown is the single most important
                                    signal here, so it gets its own row, centered, with room
                                    to breathe instead of competing with the links beside it. */}
                                <div className="relative flex items-center justify-center gap-4 md:gap-8">
                                    {/* Left flank — vertical kanji seal + bracket, mirrors right side */}
                                    <div className="flex flex-1 items-center justify-end gap-3 opacity-70">
                                        <span
                                            className="font-mono text-[9px] tracking-[0.5em] writing-vertical-rl"
                                            style={{ color: `${daily.base}99`, writingMode: "vertical-rl" }}
                                        >
                                            厳封
                                        </span>
                                        <span className="flex flex-col items-center gap-1">
                                            <span className="w-px h-8" style={{ background: `linear-gradient(to bottom, transparent, ${daily.base}66)` }} />
                                            <span className="w-1.5 h-1.5 rotate-45" style={{ background: `${daily.base}55` }} />
                                        </span>
                                    </div>

                                    <div className="flex justify-center w-[180px]">
                                        <DailyCountdownBadge />
                                    </div>

                                    {/* Right flank — mirrored */}
                                    <div className="flex flex-1 items-center justify-start gap-3 opacity-70">
                                        <span className="flex flex-col items-center gap-1">
                                            <span className="w-1.5 h-1.5 rotate-45" style={{ background: `${daily.base}55` }} />
                                            <span className="w-px h-8" style={{ background: `linear-gradient(to top, transparent, ${daily.base}66)` }} />
                                        </span>
                                        <span
                                            className="font-mono text-[9px] tracking-[0.5em]"
                                            style={{ color: `${daily.base}99`, writingMode: "vertical-rl" }}
                                        >
                                            中央46
                                        </span>
                                    </div>
                                </div>

                                {/* Hairline divider — separates "status" from "actions" so the
                                    two rows read as distinct groups, not one crowded line. */}
                                <div
                                    className="h-px w-full my-3 md:my-3.5"
                                    style={{ background: `${daily.base}22` }}
                                />

                                {/* Row 2 — actions: primary hint on the left, secondary link on
                                    the right. justify-between instead of centering everything
                                    together makes clear these are two separate affordances. */}
                                <div className="flex items-center justify-between gap-3">
                                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase">
                                        <kbd className="px-1.5 py-0.5 border border-[#c8a96e]/40 text-[#c8a96e]">Enter ↵</kbd>
                                        <span className="text-white/70">play daily now</span>
                                    </span>

                                    <Link
                                        href="/unlimited"
                                        onClick={(e) => handleNavigation(e, "/unlimited")}
                                        className="group/unl inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] md:text-[11px] lg:text-xs font-mono tracking-[0.2em] uppercase focus-visible:outline-none"
                                    >
                                        <span style={{ color: unlimited.bright }}>Play </span>
                                        <span className="font-bold group-hover/unl:brightness-125 transition-all" style={{ color: unlimited.bright }}>
                                            Unlimited
                                        </span>
                                        <span style={{ color: unlimited.bright }}>→</span>
                                    </Link>
                                </div>
                            </div>

                            <DailyStatsBar stats={initialStats} forceScroll />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ----------------------------------------------------------------------------
// Font note: add to your <head> font loading (e.g. next/font/google in
// app/layout.tsx):
//
//   import { Shippori_Mincho } from "next/font/google";
//   const shipporiMincho = Shippori_Mincho({
//     subsets: ["latin"],
//     weight: ["500", "700"],
//     variable: "--font-shippori",
//   });
//
// then swap the inline fontFamily: "'Shippori Mincho', serif" strings above for
// var(--font-shippori) once it's wired into your Tailwind config, or just keep
// the Google Fonts <link> approach and leave the inline fontFamily as-is.
// ----------------------------------------------------------------------------