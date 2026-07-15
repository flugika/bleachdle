import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DailyCountdownBadge } from "@/src/shared/ui/daily-hub/DailyCountdownBadge";
import { DailyStatsBar } from "@/src/shared/ui/daily-hub/DailyStatsBar";
import { DIMENSION_ACCENT } from "@/src/config/mode";
import type { DailyStats } from "@/src/shared/ui/daily-hub/DailyStatsBar";
import { GARGANTA_RIP_MS } from "@/src/shared/ui/hero-phenomena/phenomena/Garganta";
import { PHENOMENON_LABELS, type PhenomenonKey, type PhenomenonPhase } from "@/src/shared/ui/hero-phenomena/constants";
import { usePhenomenonCTASkin, PhenomenonLoreCaption } from "@/src/shared/ui/hero-phenomena/PhenomenonPlayButton";
import { HankoSeal } from "@/src/shared/ui/hero-phenomena/hankoSeal/HankoSeal";

// ═══ INTERNAL COMPONENT TIMELINE (Relative to Mount) ═══
//
// This card used to reveal itself on a flat `800ms` timeout that had no
// relationship to the Garganta rip actually finishing behind it
// (GARGANTA_RIP_MS ≈ 1210ms — see Garganta.tsx). That mismatch is what
// produced the "rift finishes → pop → dead air → card fades in" gap:
// the card was waiting on its own clock, not on the thing it needed to
// wait for.
//
// HERO_REVEAL_MS is now derived directly from the rip's real duration, with
// a small negative overlap so the card starts blending in slightly BEFORE
// the rip's last settle-wobble finishes — that overlap is what makes the
// two events read as one continuous beat instead of two back-to-back ones.
const HERO_REVEAL_OVERLAP_MS = 120;
const HERO_REVEAL_MS = Math.max(0, GARGANTA_RIP_MS - HERO_REVEAL_OVERLAP_MS);
const STAMP_READY_MS = HERO_REVEAL_MS + 550;   // hanko lifts, ready to come down
const STAMP_DOWN_MS = HERO_REVEAL_MS + 900;    // hanko slams down

const PHENOMENON_CTA_ACCENT: Record<PhenomenonKey, { warm: string; bright: string; panelFrom: string; panelVia: string; panelTo: string }> = {
    garganta: { warm: "#0d5a6e", bright: "#5fe0ff", panelFrom: "rgba(4,18,26,0.6)", panelVia: "rgba(2,10,16,0.55)", panelTo: "rgba(6,30,38,0.5)" },
    almighty: { warm: "#7a2418", bright: "#d9614c", panelFrom: "rgba(26,8,8,0.6)", panelVia: "rgba(16,4,4,0.55)", panelTo: "rgba(40,10,10,0.5)" },
    kurohitsugi: { warm: "#a13d2e", bright: "#d9614c", panelFrom: "rgba(23,33,58,0.55)", panelVia: "rgba(20,16,28,0.5)", panelTo: "rgba(58,28,12,0.45)" },
    zerodivision: { warm: "#7a6a3a", bright: "#e8e2d0", panelFrom: "rgba(20,18,10,0.6)", panelVia: "rgba(10,8,4,0.55)", panelTo: "rgba(30,26,14,0.5)" },
};

// ═══ Torn-Gate Card Silhouette ═══
// The card used to be a rectangle with four identical 18px corner notches —
// readable as "a UI panel", not as something that was torn open between
// worlds. This traces a jagged fault line along the top and bottom edges
// (small, irregular offsets — never a clean sawtooth) so the whole card
// reads as a slab of the Garganta rift itself, with the play button as the
// deepest wound in it.
const CARD_TEAR_CLIP =
    "polygon(0% 3.2%, 1.6% 0%, 13% 0%, 14.6% 2.4%, 33% 1.2%, 35% 0%, 63% 0%, 65.4% 2%, 83% 0.6%, 85.6% 0%, 98% 0%, 100% 3%, 100% 97.2%, 98.2% 100%, 86% 100%, 84% 97.8%, 66% 99%, 64% 100%, 36% 100%, 34.2% 97.6%, 16% 99.2%, 14% 100%, 2% 100%, 0% 96.8%)";

// Thin void-strips that bleed OUT of the card's own left/right edges,
// echoing the background Garganta strips (same visual primitive, different
// scale) so the card reads as a fragment cut FROM the rift, not a separate
// panel sitting in front of it.
const CARD_EDGE_STRIPS = [
    { top: "18%", h: "14%", delay: 0.05 },
    { top: "44%", h: "20%", delay: 0.18 },
    { top: "72%", h: "12%", delay: 0.1 },
];

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

// const REIATSU = {
//     warm: "#a13d2e",
//     warmBright: "#d9614c",
// };

// const INK_FLECKS = [
//     { x: -18, y: 22, r: 1.6, o: 0.5 },
//     { x: -26, y: 6, r: 1.1, o: 0.4 },
//     { x: -8, y: 34, r: 2.1, o: 0.35 },
//     { x: 10, y: -20, r: 1.3, o: 0.4 },
//     { x: -30, y: -12, r: 0.9, o: 0.3 },
// ];

// const HALO_TEXT = "封印 証 central46 封印 証 central46";

export function HeroDailyCTA({
    handleNavigation,
    initialStats,
    phase,
    phenomenon = "garganta",
}: {
    handleNavigation: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void
    initialStats: DailyStats;
    /** Shared entrance/idle phase, owned by the parent's usePhenomenonState —
     *  keeps this card's reveal on the same clock as the Garganta rip instead
     *  of running its own disconnected timeline. Optional so the component
     *  still degrades gracefully (mount-relative timing) if a caller forgets
     *  to wire it up. */
    phase?: PhenomenonPhase;
    phenomenon?: PhenomenonKey;
}) {
    const btnRef = useRef<HTMLDivElement>(null);
    const burst = useSealBurst(btnRef);
    const daily = DIMENSION_ACCENT.daily;
    const unlimited = DIMENSION_ACCENT.unlimited;
    const accent = PHENOMENON_CTA_ACCENT[phenomenon];
    const isGarganta = phenomenon === "garganta";
    const skin = usePhenomenonCTASkin(phenomenon);
    const Bleed = skin.Bleed;

    const [revealed, setRevealed] = useState(false);
    const [stampPhase, setStampPhase] = useState<"idle" | "ready" | "stamped">("idle");
    const [currentFaction, setCurrentFaction] = useState<"hollow" | "shinigami" | "quincy">("hollow");

    useEffect(() => {
        // Timeline runs from mount — but its durations are now derived from
        // GARGANTA_RIP_MS above, so "mount" and "the rip's actual timeline
        // start" line up in practice (both fire on the same parent render).
        const t0 = setTimeout(() => setRevealed(true), HERO_REVEAL_MS);
        const t1 = setTimeout(() => setStampPhase("ready"), STAMP_READY_MS);
        const t2 = setTimeout(() => setStampPhase("stamped"), STAMP_DOWN_MS);
        setCurrentFaction("hollow")

        return () => {
            clearTimeout(t0);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    // Safety net: if the background phenomenon somehow reaches "idle" before
    // our own timer fires (e.g. a slow initial render delayed this
    // component's mount past the shared clock's start), don't leave the CTA
    // stuck invisible — reveal immediately rather than wait out a timer
    // that's already behind reality.
    useEffect(() => {
        if (phase === "idle" && !revealed) setRevealed(true);
    }, [phase, revealed]);

    return (
        <>
            <style>{`
                @keyframes bd-cta-tear-flash {
                    0%   { transform: translate(-50%,-50%) scaleX(0.05); opacity: 0; }
                    10%  { opacity: 1; }
                    70%  { transform: translate(-50%,-50%) scaleX(1.15); opacity: 0.9; }
                    100% { transform: translate(-50%,-50%) scaleX(1); opacity: 0; }
                }
                @keyframes bd-tear-aura-pulse {
                    0%, 100% { opacity: 0.55; }
                    50% { opacity: 0.85; }
                }
                .bd-tear-aura { animation: bd-tear-aura-pulse 4.5s ease-in-out infinite; }
                @keyframes bd-tear-strip-flicker {
                    0%, 100% { opacity: 0.55; transform: scaleY(1); }
                    30% { opacity: 1; transform: scaleY(1.04); }
                    55% { opacity: 0.7; transform: scaleY(0.97); }
                    80% { opacity: 0.95; transform: scaleY(1.02); }
                }
                .bd-tear-strip { animation: bd-tear-strip-flicker 3.2s ease-in-out infinite; }
            `}</style>

            <div className="relative w-[400px] md:w-[600px] lg:w-[800px] max-w-[94vw] flex flex-col items-center py-2 font-[family-name:var(--font-display)]">

                {/* ═══ RADIAL GLOW BACKGROUND ═══ */}
                <div
                    className="bd-panel-breathe-el absolute inset-0 -z-10 pointer-events-none blur-3xl transition-opacity duration-1000"
                    style={{
                        background: `radial-gradient(ellipse 70% 60% at 50% 40%, ${daily.glow}, transparent 70%)`,
                        animation: "bd-panel-breathe 5s ease-in-out infinite",
                        opacity: revealed ? 1 : 0,
                    }}
                />

                {/* ═══ HANKO SEAL ═══ */}
                {/* <div
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
                                    ? "bd-hanko-approach 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                                    : stampPhase === "stamped"
                                        ? "bd-hanko-impact 300ms cubic-bezier(0.25, 1, 0.5, 1) forwards"
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
                </div> */}
                <HankoSeal
                    faction={currentFaction}
                    stampPhase={stampPhase}
                />

                {/* ═══ MAIN HERO CARD — Torn-Gate Frame (Smooth Fade-in & Scale Overlap) ═══
                    Silhouette is a jagged fault line (CARD_TEAR_CLIP), not a notched
                    rectangle. A blurred duplicate of the same shape sits behind it as a
                    glowing "aura of the tear", and two thin void-strips bleed out of the
                    left/right edges — same visual language as the background Garganta
                    rift and the button's own Bleed layer, just at card scale. */}
                <div
                    className="relative w-full"
                    style={{
                        opacity: revealed ? 1 : 0,
                        transform: revealed ? "scale(1)" : "scale(0.96)",
                        filter: revealed ? "blur(0px)" : "blur(4px)",
                        transition: "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1), filter 700ms cubic-bezier(0.22,1,0.36,1)",
                    }}
                >
                    {/* aura duplicate — same torn silhouette, blurred + glowing, sits
                        a hair behind the card so the tear feels like it's still faintly
                        "open" rather than a static graphic edge */}
                    <div
                        className="bd-tear-aura absolute -inset-1 -z-10 pointer-events-none"
                        style={{ clipPath: CARD_TEAR_CLIP, background: `linear-gradient(165deg, ${accent.warm}55, transparent 60%)`, filter: "blur(10px)" }}
                        aria-hidden="true"
                    />

                    {/* rift strips bleeding out of the card's own edges */}
                    {CARD_EDGE_STRIPS.map((s, i) => (
                        <span key={`el-${i}`} aria-hidden="true" className="bd-tear-strip pointer-events-none absolute -left-[3px] w-[2px]"
                            style={{ top: s.top, height: s.h, animationDelay: `${s.delay}s`, background: `linear-gradient(180deg, transparent, ${accent.bright}, transparent)`, boxShadow: `0 0 8px 1px ${accent.bright}99` }}
                        />
                    ))}
                    {CARD_EDGE_STRIPS.map((s, i) => (
                        <span key={`er-${i}`} aria-hidden="true" className="bd-tear-strip pointer-events-none absolute -right-[3px] w-[2px]"
                            style={{ top: s.top, height: s.h, animationDelay: `${s.delay + 0.09}s`, background: `linear-gradient(180deg, transparent, ${accent.bright}, transparent)`, boxShadow: `0 0 8px 1px ${accent.bright}99` }}
                        />
                    ))}

                    <div
                        className="relative w-full border transition-colors duration-700"
                        style={{
                            borderColor: `${accent.bright}40`,
                            background: `linear-gradient(165deg, rgba(10,10,15,0.95), rgba(2,2,5,0.98)), repeating-linear-gradient(115deg, ${accent.warm}14 0px, ${accent.warm}14 1px, transparent 1px, transparent 34px)`,
                            clipPath: CARD_TEAR_CLIP,
                        }}
                    >
                        {/* faint kanji watermark — the seal of whichever phenomenon owns
                            today, sitting low in the frame like a mon burned into stone */}
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-2 -right-1 select-none text-[64px] md:text-[84px] leading-none font-bold opacity-[0.05]"
                            style={{ fontFamily: "'Shippori Mincho', serif", color: accent.bright }}
                        >
                            {PHENOMENON_LABELS[phenomenon].kanji}
                        </span>

                        <span
                            className="absolute top-0 left-0 w-[26px] h-[26px] pointer-events-none"
                            style={{ background: `linear-gradient(135deg, transparent 48%, ${accent.bright}40 49%, transparent 51%)` }}
                        />
                        <span
                            className="absolute bottom-0 right-0 w-[26px] h-[26px] pointer-events-none"
                            style={{ background: `linear-gradient(-45deg, transparent 48%, ${accent.bright}40 49%, transparent 51%)` }}
                        />

                        <div className="relative w-full flex flex-col items-center px-5 pt-7 pb-0 md:px-8 md:pt-9 lg:px-10 lg:pt-11">
                            <span className="absolute bottom-0 left-0 w-4 h-4 md:w-5 md:h-5 border-b border-l" style={{ borderColor: `${daily.base}66` }} />

                            {/* ═══ PLAY ACTION BUTTON ═══
                            Silhouette + bleed layer come from the phenomenon's own CTA
                            skin (see cta/PhenomenonPlayButton.tsx) — Garganta's is a torn
                            fault-line clip-path with rift strips threaded through it, so
                            the button reads as a shard OF the phenomenon rather than a
                            rectangle painted to match it. Any phenomenon without a skin
                            entry falls back to the plain rectangle below (no regression). */}
                            <Link
                                href="/daily"
                                onMouseEnter={burst}
                                onClick={(e) => { burst(); handleNavigation(e, "/daily"); }}
                                className="group/cta relative z-10 flex flex-col items-center justify-center w-full text-center py-5 px-6 md:py-6 md:px-8 lg:py-7 lg:px-10 border border-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 overflow-visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                style={{
                                    background: "transparent",
                                    borderColor: `${accent.warm}55`,
                                    clipPath: skin.clipPath,
                                    paddingLeft: skin.safePadding,
                                    paddingRight: skin.safePadding,
                                }}
                            >
                                <span
                                    className="bd-cta-glow pointer-events-none absolute inset-0 opacity-50 group-hover/cta:opacity-100 transition-opacity duration-500"
                                    style={{ boxShadow: `inset 0 0 0 1px ${daily.base}30, inset 0 0 34px ${accent.warm}33` }}
                                    aria-hidden="true"
                                />
                                <span
                                    className="pointer-events-none absolute inset-0 opacity-0 group-hover/cta:opacity-90 transition-opacity duration-400"
                                    style={{ background: `linear-gradient(150deg, ${accent.panelFrom} 0%, ${accent.panelVia} 55%, ${accent.panelTo} 100%)` }}
                                    aria-hidden="true"
                                />

                                {/* Phenomenon bleed layer — reusable across every phenomenon.
        Garganta threads rift strips straight through the torn silhouette;
        a future Almighty/Kurohitsugi/ZeroDivision skin plugs in here the
        same way without touching this component. */}
                                {Bleed && <Bleed phase={phase ?? "idle"} />}

                                <span
                                    className="bd-cta-sheen pointer-events-none absolute top-0 left-0 h-full w-1/3 opacity-0 group-hover/cta:opacity-100 transition-opacity duration-300"
                                    style={{ background: `linear-gradient(90deg, transparent, ${accent.bright}30, transparent)` }}
                                    aria-hidden="true"
                                />
                                <span
                                    className="bd-cta-edge pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-10 rounded-full blur-2xl opacity-0 group-hover/cta:opacity-60 transition-opacity duration-400"
                                    style={{ background: `radial-gradient(ellipse, ${accent.bright}, transparent 75%)` }}
                                    aria-hidden="true"
                                />
                                <span className="pointer-events-none absolute inset-[3px] border transition-colors duration-300" style={{ borderColor: `${accent.bright}22` }} />

                                <span
                                    className="relative whitespace-nowrap text-xl md:text-2xl lg:text-3xl tracking-[0.06em] font-extrabold uppercase"
                                    style={{
                                        backgroundImage: isGarganta
                                            ? "linear-gradient(180deg, #eafcff 0%, #9fe9ff 40%, #5fe0ff 70%, #2fa8c9 100%)"
                                            : "linear-gradient(180deg, #fff7e6 0%, #f2cf8a 40%, #c8a96e 70%, #a9814f 100%)",
                                        WebkitBackgroundClip: "text",
                                        backgroundClip: "text",
                                        color: "transparent",
                                        textShadow: "0 1px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.8)",
                                    }}
                                >
                                    Enter Today&apos;s Guess
                                </span>
                                <span
                                    className="relative block text-[11px] md:text-xs tracking-[0.2em] mt-1.5"
                                    style={{ color: `${accent.bright}bb`, textShadow: "0 1px 4px rgba(0,0,0,0.9)", fontFamily: "'Shippori Mincho', serif" }}
                                >
                                    今日の一戦を征く
                                </span>
                                <span
                                    className="relative block text-[10px] md:text-[11px] font-mono tracking-[0.15em] normal-case font-semibold mt-2 text-white/75"
                                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.95)" }}
                                >
                                    one puzzle, shared by everyone, gone at midnight
                                </span>
                                <PhenomenonLoreCaption phenomenon={phenomenon} />
                            </Link>

                            {/* ═══ Perforation Ticket Line ═══ */}
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

                            {/* ═══ Central 46 Ticker Strip ═══ */}
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
                                    <div className="relative flex items-center justify-center gap-4 md:gap-8">
                                        <div className="flex flex-1 items-center justify-end gap-3 opacity-70">
                                            <span
                                                className="font-mono text-[9px] tracking-[0.5em]"
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

                                    <div
                                        className="h-px w-full my-3 md:my-3.5"
                                        style={{ background: `${daily.base}22` }}
                                    />

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
            </div>
        </>
    );
}