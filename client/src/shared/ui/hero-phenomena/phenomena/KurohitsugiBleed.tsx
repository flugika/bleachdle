"use client";

import { memo, useCallback, useMemo, useState, type CSSProperties } from "react";
import { motion, type Variants } from "framer-motion";
import type { PhenomenonPhase } from "../constants";

const SUCK_EASE = [0.6, -0.28, 0.735, 0.045] as const;
const SLAM_EASE = [0.175, 0.885, 0.32, 1.275] as const;

type SlabDef = { left: string; w: number; h: string; delay: number; floatDur: number; floatDelay: number; from: string; top?: boolean };

const SLABS: SlabDef[] = [
    { left: "-8%", w: 5, h: "130%", delay: 0.02, floatDur: 3.4, floatDelay: 0.1, from: "70%" },
    { left: "2%", w: 4, h: "150%", delay: 0.18, floatDur: 4.1, floatDelay: 0.6, from: "80%" },
    { left: "14%", w: 3, h: "115%", delay: 0.09, floatDur: 3.7, floatDelay: 0.3, from: "55%" },
    { left: "86%", w: 3, h: "120%", delay: 0.24, floatDur: 3.9, floatDelay: 0.9, from: "60%" },
    { left: "96%", w: 4, h: "150%", delay: 0.06, floatDur: 3.5, floatDelay: 0.4, from: "75%" },
    { left: "108%", w: 5, h: "130%", delay: 0.3, floatDur: 4.3, floatDelay: 0.2, from: "68%" },
    { left: "40%", w: 3, h: "90%", delay: 0.15, floatDur: 3.2, floatDelay: 0.7, from: "-45%", top: true },
    { left: "62%", w: 3, h: "90%", delay: 0.27, floatDur: 3.6, floatDelay: 0.5, from: "-40%", top: true },
];

const IMPLODE_PARTICLES = [
    { kx: "-70px", ky: "-40px", delay: 0.0 },
    { kx: "60px", ky: "-50px", delay: 0.05 },
    { kx: "-55px", ky: "45px", delay: 0.1 },
    { kx: "75px", ky: "40px", delay: 0.03 },
    { kx: "0px", ky: "-70px", delay: 0.14 },
    { kx: "-80px", ky: "5px", delay: 0.08 },
    { kx: "80px", ky: "-10px", delay: 0.12 },
    { kx: "10px", ky: "70px", delay: 0.18 },
];

const shockwaveVariants: Variants = {
    idle: { scale: 0.3, opacity: 0 },
    burst: { scale: 2.6, opacity: [0.9, 0], transition: { duration: 0.55, ease: SLAM_EASE } },
};

// Precomputed once at module scope — same slab geometry every mount, so we
// only need to react to `hovered`/`phase`, never recompute the base layout.
const SLAB_BASE_STYLES: CSSProperties[] = SLABS.map((s) => ({
    left: s.left,
    [s.top ? "top" : "bottom"]: "-10%",
    width: s.w,
    height: s.h,
    transformOrigin: s.top ? "top" : "bottom",
    background: "repeating-linear-gradient(180deg, #05020a 0px, #05020a 10px, #120a1f 10px, #120a1f 12px)",
    boxShadow: "0 0 14px 2px rgba(147,51,234,0.55), inset 0 0 6px rgba(0,0,0,0.9)",
    border: "1px solid rgba(168,85,247,0.4)",
    ["--bdph-slab-from" as string]: s.from,
}) as CSSProperties);

const IMPLODE_STYLES: CSSProperties[] = IMPLODE_PARTICLES.map((p) => ({
    boxShadow: "0 0 6px 1px rgba(168,85,247,0.85)",
    willChange: "transform, opacity",
    ["--bdph-kx" as string]: p.kx,
    ["--bdph-ky" as string]: p.ky,
    animation: `bdph-kh-implode 0.5s cubic-bezier(${SUCK_EASE.join(",")}) ${p.delay}s both`,
}) as CSSProperties);

export const KurohitsugiBleed = memo(function KurohitsugiBleed({ phase }: { phase: PhenomenonPhase }) {
    const [clicked, setClicked] = useState(false);
    const [hovered, setHovered] = useState(false);

    const handlePointerDown = useCallback(() => {
        setClicked(true);
        window.setTimeout(() => setClicked(false), 600);
    }, []);
    const handleHoverStart = useCallback(() => setHovered(true), []);
    const handleHoverEnd = useCallback(() => setHovered(false), []);

    // Only the hover-dependent compress offsets get recomputed — the rest of
    // each slab's style object is the shared, memoized base above, merged
    // via spread only when `hovered` actually flips.
    const slabStyles = useMemo<CSSProperties[]>(
        () =>
            SLABS.map((s, i) => {
                const isLeftHalf = parseFloat(s.left) < 50;
                return {
                    ...SLAB_BASE_STYLES[i],
                    willChange: phase === "entrance" ? "transform, opacity" : "transform",
                    ["--bdph-compress-x" as string]: hovered ? (isLeftHalf ? "6px" : "-6px") : "0px",
                    ["--bdph-compress-y" as string]: hovered ? (s.top ? "3px" : "-3px") : "0px",
                    animation:
                        phase === "entrance"
                            ? `bdph-kh-slab-slam 0.55s cubic-bezier(${SLAM_EASE.join(",")}) ${(0.3 + s.delay).toFixed(2)}s both`
                            : `bdph-kh-slab-float ${s.floatDur}s ease-in-out ${s.floatDelay}s infinite, bdph-kh-slab-compress 0.18s cubic-bezier(0.4,0,0.2,1) forwards`,
                } as CSSProperties;
            }),
        [phase, hovered]
    );

    return (
        <>
            {phase === "entrance" &&
                IMPLODE_PARTICLES.map((_, i) => (
                    <span
                        key={i}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 w-[3px] h-[3px] rounded-full bg-purple-300"
                        style={IMPLODE_STYLES[i]}
                    />
                ))}

            {SLABS.map((_, i) => (
                <span key={i} aria-hidden="true" className="pointer-events-none absolute z-0" style={slabStyles[i]} />
            ))}

            <motion.div className="pointer-events-none absolute inset-0 z-20" animate={phase}>
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="absolute"
                        style={{
                            left: `${18 + i * 32}%`,
                            top: 0,
                            bottom: 0,
                            width: "1.5px",
                            background: "linear-gradient(180deg, transparent, #c084fc 40%, #a855f7 60%, transparent)",
                            filter: "drop-shadow(0 0 4px rgba(168,85,247,0.9))",
                            willChange: "opacity",
                            animation: `bdph-kh-lightning ${(1.6 + i * 0.4).toFixed(2)}s steps(1,end) ${(i * 0.3).toFixed(2)}s infinite`,
                        }}
                    />
                ))}
            </motion.div>

            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 opacity-25 rounded-[inherit]"
                style={{
                    backgroundImage: "repeating-linear-gradient(180deg, rgba(168,85,247,0.35) 0px, rgba(168,85,247,0.35) 1px, transparent 1px, transparent 8px)",
                    animation: "bdph-kh-grid-rise 1.1s linear infinite",
                    willChange: "background-position",
                }}
            />

            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 opacity-80 rounded-[inherit]"
                style={{ boxShadow: "inset 0 0 0 1.5px rgba(168,85,247,0.5), inset 0 0 30px rgba(88,28,135,0.5), 0 0 16px rgba(168,85,247,0.25)" }}
            />

            {clicked && (
                <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-purple-400"
                    style={{ borderStyle: "solid", willChange: "transform, opacity" }}
                    variants={shockwaveVariants}
                    initial="idle"
                    animate="burst"
                />
            )}

            {/* Real interaction handlers — wire onPointerDown / onHoverStart /
                onHoverEnd from the parent <button> in PhenomenonPlayButton
                onto this component's props, not this dead catcher. */}
            <span
                aria-hidden="true"
                className="absolute inset-0 z-20"
                onPointerDown={handlePointerDown}
                onPointerEnter={handleHoverStart}
                onPointerLeave={handleHoverEnd}
                style={{ pointerEvents: "none" }}
            />
        </>
    );
});

KurohitsugiBleed.displayName = "KurohitsugiBleed";