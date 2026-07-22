"use client";

// src/shared/ui/hero-phenomena/phenomena/ZeroDivision.tsx
import { useMemo, type CSSProperties } from "react";
import type { PhenomenonPhase } from "../constants";

/**
 * ZERO DIVISION — 零番隊
 * Royal Guard descent from the Reiōkyū. Five sacred seals (one per officer)
 * slam into a pentagon around a central Imperial ink-kanji, then settle into
 * a slow, breathing Kido-ritual idle loop.
 *
 * All motion is transform/opacity only (GPU-accelerated), driven by plain
 * CSS keyframes scoped to this file via a single <style> tag — no external
 * stylesheet dependency, no per-frame JS.
 */

const GOLD = "#c8a96e";
const GOLD_BRIGHT = "#f2cf8a";
const CREAM = "#e8e2d0";
const VOID = "#040307";
const BLOOD = "#9e1a1a";

type SealDef = {
    id: "ichibei" | "shutara" | "oetsu" | "kirinji" | "hikifune";
    angle: number; // degrees, 0 = top, clockwise
    delay: number; // entrance stagger
    label: string; // kanji glyph for this officer's domain
};

// Pentagon layout — five officers around the central seal, top-first then
// clockwise, matching the "royal array" framing described in the brief.
const SEALS: SealDef[] = [
    { id: "ichibei", angle: 0, delay: 0.0, label: "名" }, // Ichibei — void ink / naming
    { id: "shutara", angle: 72, delay: 0.06, label: "織" }, // Shutara — golden weaving
    { id: "oetsu", angle: 144, delay: 0.12, label: "鍛" }, // Oetsu — forging sparks
    { id: "kirinji", angle: 216, delay: 0.18, label: "湯" }, // Kirinji — spiritual steam
    { id: "hikifune", angle: 288, delay: 0.24, label: "穣" }, // Hikifune — sacred grain
];

const RADIUS = 150; // px, on a 400x400 viewBox
const CENTER = 200;

function pointOn(angleDeg: number, r: number) {
    // angle 0 = straight up
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

const WISPS = [
    { left: "36%", top: "30%", size: 64, wx: "18px", wy: "-10px", dur: 9, gold: false },
    { left: "64%", top: "60%", size: 48, wx: "-14px", wy: "12px", dur: 11, gold: true },
    { left: "52%", top: "72%", size: 72, wx: "10px", wy: "14px", dur: 8, gold: false },
    { left: "28%", top: "64%", size: 42, wx: "-16px", wy: "-8px", dur: 12, gold: true },
    { left: "70%", top: "32%", size: 36, wx: "-10px", wy: "10px", dur: 10, gold: true },
];

const REISHI_MOTES = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * 360 + (i % 2 === 0 ? 6 : -6);
    const r = 170 + ((i * 37) % 40);
    const p = pointOn(angle, r);
    return {
        x: p.x,
        y: p.y,
        dur: 5 + (i % 5),
        delay: (i * 0.23) % 3,
        size: i % 3 === 0 ? 2.6 : 1.6,
    };
});

export function ZeroDivision({ phase }: { phase: PhenomenonPhase }) {
    const entering = phase === "entrance";

    const sealPoints = useMemo(
        () => SEALS.map((s) => ({ ...s, pt: pointOn(s.angle, RADIUS) })),
        []
    );

    return (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#050308]">
            {/* ---- deep backdrop: ink void + imperial gold bloom ---- */}
            <div
                className="bdph-zd-anim absolute w-[112vw] h-[112vw] max-w-[1340px] max-h-[1340px] rounded-full"
                style={{
                    background: `radial-gradient(circle, rgba(200,169,110,0.16), rgba(200,169,110,0.05) 45%, transparent 70%)`,
                    animation: entering ? "bdph-zd-gold-bloom 1.1s cubic-bezier(0.16,1,0.3,1) forwards" : "bdph-zd-bloom-breathe 6s ease-in-out infinite",
                }}
            />
            <div
                className="bdph-zd-anim absolute w-[66vw] h-[66vw] max-w-[780px] max-h-[780px] rounded-full"
                style={{
                    background: `radial-gradient(circle, ${VOID} 0%, rgba(4,3,7,0.85) 55%, transparent 75%)`,
                    animation: entering ? "bdph-zd-ink-collapse 0.7s cubic-bezier(0.6,-0.28,0.735,0.045) forwards" : undefined,
                }}
            />

            {/* ---- entrance-only: divine shockwave ring ---- */}
            {entering && (
                <span
                    aria-hidden="true"
                    className="bdph-zd-anim absolute rounded-full"
                    style={{
                        width: 40,
                        height: 40,
                        border: `1.5px solid ${GOLD_BRIGHT}`,
                        boxShadow: `0 0 24px 4px rgba(242,207,138,0.55)`,
                        animation: "bdph-zd-shockwave 0.75s cubic-bezier(0.175,0.885,0.32,1.275) 0.03s both",
                    }}
                />
            )}

            {/* ---- drifting ink + gold wisps ---- */}
            {WISPS.map((w, i) => (
                <span
                    key={i}
                    className="bdph-zd-anim absolute rounded-full blur-2xl"
                    style={
                        {
                            left: w.left,
                            top: w.top,
                            width: w.size,
                            height: w.size,
                            background: w.gold ? "rgba(200,169,110,0.14)" : "rgba(232,226,208,0.10)",
                            "--bdph-zd-wx": w.wx,
                            "--bdph-zd-wy": w.wy,
                            animation: `bdph-zd-wisp ${w.dur}s ease-in-out infinite`,
                            animationDelay: `${i * 0.4}s`,
                        } as CSSProperties
                    }
                />
            ))}

            {/* ---- main seal array ---- */}
            <svg
                viewBox="0 0 400 400"
                className="relative w-[96vw] h-[96vw] max-w-[1180px] max-h-[1180px]"
            >
                <defs>
                    <radialGradient id="zd-core-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={GOLD_BRIGHT} stopOpacity="0.9" />
                        <stop offset="45%" stopColor={GOLD} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="zd-thread-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={GOLD_BRIGHT} />
                        <stop offset="100%" stopColor={GOLD} />
                    </linearGradient>
                    <filter id="zd-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur stdDeviation="3.2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* shimenawa outer rope ring — thick dash pattern, slow rotation */}
                <g
                    className="bdph-zd-anim"
                    style={{
                        transformOrigin: "200px 200px",
                        animation: "bdph-zd-seal-spin 70s linear infinite",
                    }}
                >
                    <circle
                        cx="200" cy="200" r="188"
                        fill="none"
                        stroke={CREAM}
                        strokeWidth="1.4"
                        strokeDasharray="2 3 14 3"
                        opacity="0.28"
                    />
                </g>

                {/* golden thread ring — counter-rotating, Shutara's weave */}
                <g
                    className="bdph-zd-anim"
                    style={{
                        transformOrigin: "200px 200px",
                        animation: "bdph-zd-seal-spin-rev 50s linear infinite",
                    }}
                >
                    <circle cx="200" cy="200" r="168" fill="none" stroke="url(#zd-thread-grad)" strokeWidth="0.6" strokeDasharray="18 10" opacity="0.4" />
                </g>

                {/* inner ofuda rune ring — fine dashed, fast breathing pulse */}
                <g
                    className="bdph-zd-anim"
                    style={{
                        transformOrigin: "200px 200px",
                        animation: "bdph-zd-seal-spin 34s linear infinite",
                    }}
                >
                    <circle cx="200" cy="200" r="128" fill="none" stroke={GOLD} strokeWidth="0.5" strokeDasharray="1 5" opacity="0.5" />
                </g>

                {/* connective pentagon lattice binding the five seals to the core */}
                {sealPoints.map((s, i) => (
                    <line
                        key={`link-${s.id}`}
                        x1={CENTER}
                        y1={CENTER}
                        x2={s.pt.x}
                        y2={s.pt.y}
                        stroke={GOLD}
                        strokeWidth="0.5"
                        opacity={entering ? 0 : 0.22}
                        className="bdph-zd-anim"
                        style={{
                            animation: entering
                                ? `bdph-zd-link-draw 0.4s ease-out ${(0.3 + i * 0.05).toFixed(2)}s forwards`
                                : `bdph-zd-link-pulse 4s ease-in-out ${(i * 0.3).toFixed(2)}s infinite`,
                        }}
                    />
                ))}
                <polygon
                    points={sealPoints.map((s) => `${s.pt.x},${s.pt.y}`).join(" ")}
                    fill="none"
                    stroke={GOLD_BRIGHT}
                    strokeWidth="0.4"
                    opacity={entering ? 0 : 0.14}
                    className="bdph-zd-anim"
                    style={{
                        animation: entering
                            ? "bdph-zd-fade-in 0.45s ease-out 0.55s forwards"
                            : "bdph-zd-poly-breathe 5s ease-in-out infinite",
                    }}
                />

                {/* ---- five sacred officer seals ---- */}
                {sealPoints.map((s) => (
                    <OfficerSeal key={s.id} def={s} entering={entering} />
                ))}

                {/* ---- central imperial kanji seal: 零 — layered mandala ---- */}
                <g style={{ transformOrigin: "200px 200px" }} filter="url(#zd-soft-glow)">
                    {/* grand ray burst, slow rotation, alternating spoke lengths */}
                    <g
                        className="bdph-zd-anim"
                        style={{ transformOrigin: "200px 200px", animation: "bdph-zd-seal-spin 100s linear infinite" }}
                    >
                        {Array.from({ length: 20 }).map((_, i) => {
                            const angle = (i / 20) * 360;
                            const long = i % 2 === 0;
                            const p1 = pointOn(angle, 58);
                            const p2 = pointOn(angle, long ? 92 : 76);
                            return (
                                <line
                                    key={i}
                                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                    stroke={GOLD}
                                    strokeWidth={long ? 0.6 : 0.35}
                                    opacity={long ? 0.4 : 0.22}
                                />
                            );
                        })}
                    </g>

                    {/* diamond tick ring — imperial ofuda markers */}
                    <g
                        className="bdph-zd-anim"
                        style={{ transformOrigin: "200px 200px", animation: "bdph-zd-seal-spin-rev 60s linear infinite" }}
                    >
                        {Array.from({ length: 12 }).map((_, i) => {
                            const angle = (i / 12) * 360;
                            const p = pointOn(angle, 70);
                            return (
                                <rect
                                    key={i}
                                    x={p.x - 2.6} y={p.y - 2.6}
                                    width="5.2" height="5.2"
                                    fill={i % 3 === 0 ? GOLD_BRIGHT : "none"}
                                    stroke={GOLD}
                                    strokeWidth="0.5"
                                    opacity="0.65"
                                    transform={`rotate(45 ${p.x} ${p.y})`}
                                />
                            );
                        })}
                    </g>

                    {/* triple concentric border rings */}
                    <circle cx="200" cy="200" r="64" fill="none" stroke={CREAM} strokeWidth="0.4" strokeDasharray="1 4" opacity="0.35" />
                    <circle cx="200" cy="200" r="58" fill="none" stroke={GOLD_BRIGHT} strokeWidth="0.6" opacity="0.55" />

                    {/* soft imperial glow */}
                    <circle
                        cx="200" cy="200" r="54"
                        fill="url(#zd-core-glow)"
                        className="bdph-zd-anim"
                        style={{ animation: "bdph-zd-core-pulse 3.4s ease-in-out infinite" }}
                    />

                    {/* void housing + gold rim */}
                    <circle cx="200" cy="200" r="46" fill={VOID} stroke={GOLD_BRIGHT} strokeWidth="1.2" opacity="0.95" />
                    <circle cx="200" cy="200" r="41" fill="none" stroke={GOLD} strokeWidth="0.4" strokeDasharray="0.5 3" opacity="0.5" />

                    {/* petal accents at the four cardinal points */}
                    {[0, 90, 180, 270].map((a) => {
                        const p = pointOn(a, 46);
                        return (
                            <circle key={a} cx={p.x} cy={p.y} r="3.2" fill={GOLD_BRIGHT} opacity="0.8" />
                        );
                    })}

                    <text
                        x="200"
                        y="200"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="52"
                        fontFamily="'Shippori Mincho', serif"
                        fill={CREAM}
                        className="bdph-zd-anim"
                        style={{
                            opacity: entering ? 0 : 0.97,
                            animation: entering
                                ? "bdph-zd-kanji-reveal 0.55s cubic-bezier(0.16,1,0.3,1) 0.4s forwards"
                                : "bdph-zd-kanji-idle 4.2s ease-in-out infinite",
                        }}
                    >
                        零
                    </text>
                </g>

                {/* ---- ambient Reishi motes orbiting the array ---- */}
                {REISHI_MOTES.map((m, i) => (
                    <circle
                        key={i}
                        cx={m.x}
                        cy={m.y}
                        r={m.size}
                        fill={i % 2 === 0 ? GOLD_BRIGHT : CREAM}
                        className="bdph-zd-anim"
                        style={{
                            opacity: 0,
                            animation: `bdph-zd-mote-drift ${m.dur}s ease-in-out ${m.delay}s infinite`,
                        }}
                    />
                ))}
            </svg>

            {/* ---- entrance-only full-bleed ink tear through center ---- */}
            {entering && (
                <span
                    aria-hidden="true"
                    className="bdph-zd-anim pointer-events-none absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
                    style={{
                        width: "2px",
                        background: `linear-gradient(180deg, transparent, ${CREAM} 35%, ${GOLD_BRIGHT} 50%, ${CREAM} 65%, transparent)`,
                        filter: `drop-shadow(0 0 10px rgba(242,207,138,0.8))`,
                        animation: "bdph-zd-tear 0.4s cubic-bezier(0.6,-0.28,0.735,0.045) 0.08s both",
                    }}
                />
            )}

            {/* subtle vignette frame, ties into surrounding hero UI */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{
                    boxShadow: `inset 0 0 0 1.5px rgba(200,169,110,0.18), inset 0 0 60px rgba(4,3,7,0.6)`,
                }}
            />
        </div>
    );
}

/* ------------------------------------------------------------------------ */
/* One sacred seal per officer — shared slam/orbit choreography, distinct   */
/* inner iconography per the brief's five domains.                         */
/* ------------------------------------------------------------------------ */

function OfficerSeal({ def, entering }: { def: SealDef & { pt: { x: number; y: number } }; entering: boolean }) {
    const { id, pt, delay, label } = def;

    return (
        <g
            className="bdph-zd-anim"
            style={{
                transformOrigin: `${pt.x}px ${pt.y}px`,
                animation: entering
                    ? `bdph-zd-seal-slam 0.4s cubic-bezier(0.175,0.885,0.32,1.275) ${(0.08 + delay).toFixed(2)}s both`
                    : `bdph-zd-seal-float 5s ease-in-out ${(delay * 1.4).toFixed(2)}s infinite`,
            }}
        >
            {/* outer ring housing */}
            <circle cx={pt.x} cy={pt.y} r="26" fill={VOID} stroke={GOLD} strokeWidth="0.8" opacity="0.95" />
            <circle cx={pt.x} cy={pt.y} r="22" fill="none" stroke={GOLD_BRIGHT} strokeWidth="0.4" strokeDasharray="1 2.5" opacity="0.5" />

            {/* domain glyph */}
            <text
                x={pt.x}
                y={pt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="15"
                fontFamily="'Shippori Mincho', serif"
                fill={CREAM}
                opacity="0.85"
            >
                {label}
            </text>

            {/* per-officer accent motif, small so it stays legible at scale */}
            {id === "ichibei" && (
                <g opacity="0.8">
                    <circle cx={pt.x} cy={pt.y} r="30" fill="none" stroke={VOID} strokeWidth="6" opacity="0.35" />
                    <circle
                        cx={pt.x} cy={pt.y} r="33"
                        fill="none"
                        stroke={CREAM}
                        strokeWidth="0.6"
                        strokeDasharray="0.5 3"
                        className="bdph-zd-anim"
                        style={{ animation: "bdph-zd-seal-spin 18s linear infinite", transformOrigin: `${pt.x}px ${pt.y}px` }}
                    />
                </g>
            )}
            {id === "shutara" && (
                <g opacity="0.75">
                    <circle cx={pt.x} cy={pt.y} r="30" fill="none" stroke={GOLD_BRIGHT} strokeWidth="0.5" />
                    <circle cx={pt.x} cy={pt.y} r="34" fill="none" stroke={GOLD} strokeWidth="0.4" opacity="0.6" />
                </g>
            )}
            {id === "oetsu" && (
                <g opacity="0.85">
                    {[0, 1, 2].map((i) => (
                        <line
                            key={i}
                            x1={pt.x + Math.cos((i * 2.1) - 1) * 20}
                            y1={pt.y + Math.sin((i * 2.1) - 1) * 20}
                            x2={pt.x + Math.cos((i * 2.1) - 1) * 32}
                            y2={pt.y + Math.sin((i * 2.1) - 1) * 32}
                            stroke={BLOOD}
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            className="bdph-zd-anim"
                            style={{ animation: `bdph-zd-spark 1.6s ease-in-out ${i * 0.3}s infinite` }}
                        />
                    ))}
                </g>
            )}
            {id === "kirinji" && (
                <g opacity="0.7">
                    <path
                        d={`M ${pt.x - 8} ${pt.y + 22} Q ${pt.x} ${pt.y + 8} ${pt.x + 6} ${pt.y + 22}`}
                        fill="none"
                        stroke={BLOOD}
                        strokeWidth="0.6"
                        className="bdph-zd-anim"
                        style={{ animation: "bdph-zd-steam 3.6s ease-in-out infinite" }}
                    />
                </g>
            )}
            {id === "hikifune" && (
                <g opacity="0.75">
                    <rect x={pt.x - 16} y={pt.y - 16} width="32" height="32" fill="none" stroke={GOLD} strokeWidth="0.4" opacity="0.5" transform={`rotate(45 ${pt.x} ${pt.y})`} />
                </g>
            )}
        </g>
    );
}