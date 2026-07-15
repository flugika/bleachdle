"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls, type Variants } from "framer-motion";
import type { PhenomenonPhase } from "../constants";

const VOID_TOP = "#010509";
const VOID_BOTTOM = "#000000";
const CYAN_EDGE = "#2fd0f5";
const CYAN_BRIGHT = "#aef4ff";

export const GARGANTA_STRIPS = [
    { h: 8, delay: 0.10 }, { h: 24, delay: 0.02 }, { h: 38, delay: 0.16 }, { h: 60, delay: 0.00 },
    { h: 74, delay: 0.12 }, { h: 96, delay: 0.04 }, { h: 58, delay: 0.08 }, { h: 90, delay: 0.01 },
    { h: 104, delay: 0.06 }, { h: 82, delay: 0.10 }, { h: 62, delay: 0.03 }, { h: 90, delay: 0.08 },
    { h: 52, delay: 0.14 }, { h: 32, delay: 0.05 }, { h: 20, delay: 0.13 }, { h: 6, delay: 0.07 },
] as const;

export const GARGANTA_RIP_DELAY = 0.2;
export const GARGANTA_RIP_DURATION = 0.85;
export const GARGANTA_RIP_MS = Math.round((GARGANTA_RIP_DELAY + GARGANTA_RIP_DURATION + Math.max(...GARGANTA_STRIPS.map(s => s.delay))) * 1000);

const GLOBAL_SMOKES = Array.from({ length: 8 }, (_, i) => ({
    left: `${8 + i * 11}%`,
    top: `${20 + (i % 3) * 12}%`,
    size: 180 + (i % 3) * 50,
    dx: (i % 2 === 0 ? 1 : -1) * 35,
    dy: (i % 3 === 0 ? 1 : -1) * 20,
    dur: 6.0 + (i % 4) * 1.5,
    delay: i * 0.2,
}));

const GLOBAL_SPARKS = Array.from({ length: 32 }, (_, i) => ({
    left: `${4 + (i * 3.1) % 92}%`,
    top: `${25 + (i * 19) % 50}%`,
    size: 2 + (i % 3),
    dy: (i % 2 === 0 ? -50 : 50) - (i % 3) * 12,
    dur: 2.0 + (i % 4) * 0.4,
    delay: i * 0.07,
}));

const HAIR_LINE_COUNT = 54;
const HAIR_LINES = Array.from({ length: HAIR_LINE_COUNT }, (_, i) => {
    const t = i / (HAIR_LINE_COUNT - 1);
    const centerBias = 1 - Math.abs(t - 0.5) * 2;
    const jitter = ((i * 37) % 13) / 13;
    const jitter2 = ((i * 71) % 17) / 17;
    const heightPct = 6 + Math.pow(centerBias, 1.6) * 58 + jitter * 14;
    const topPct = 50 - heightPct / 2 + (jitter2 - 0.5) * 26;
    const opacity = 0.06 + Math.pow(centerBias, 1.3) * 0.34 + jitter * 0.06;
    const widthPx = jitter2 > 0.75 ? 1.6 : 1;
    const leftPct = t * 100 + (jitter - 0.5) * 1.6;
    const dur = 3.2 + jitter * 3.4;
    const delay = jitter2 * 1.1;
    const revealDelay = 0.05 + (1 - centerBias) * 0.25 + jitter * 0.3;
    return { left: `${leftPct}%`, top: `${topPct}%`, h: `${heightPct}%`, o: opacity, w: widthPx, dur, delay, revealDelay };
});

const stripVariants: Variants = {
    entrance: ({ delay }) => ({
        y: "-50%",
        scaleY: [0, 0.55, 1.1, 0.95, 1],
        opacity: 1,
        transition: {
            duration: GARGANTA_RIP_DURATION,
            delay: GARGANTA_RIP_DELAY + delay,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.4, 0.7, 0.88, 1],
        },
    }),
    idle: ({ index }) => ({
        y: "-50%",
        scaleY: [1, 1.015, 0.99, 1.02, 1],
        opacity: 1,
        transition: {
            duration: 3.2 + (index % 4) * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
        },
    }),
};

export function Garganta({ phase }: { phase: PhenomenonPhase }) {
    const shakeControls = useAnimationControls();
    const startedShake = useRef(false);

    useEffect(() => {
        if (phase !== "entrance" || startedShake.current) return;
        startedShake.current = true;
        shakeControls.start({
            x: [0, -5, 4, -4, 5, -2, 2, 0],
            y: [0, 2, -3, 3, -2, 1, -1, 0],
            transition: { duration: 0.6, delay: 0.15, ease: "easeOut" },
        });
    }, [phase, shakeControls]);

    return (
        <div 
            className={`garganta-wrapper absolute inset-0 flex top-20 items-center justify-center overflow-hidden bg-transparent select-none pointer-events-none transition-all duration-300 ${
                phase === "idle" ? "is-idle" : ""
            }`}
        >
            {/* 🛡️ HIGH-PERFORMANCE STYLE INJECTION: ย้ายงานทั้งหมดไปคำนวณบน GPU */}
            <style>{`
                .garganta-smoke {
                    opacity: 0;
                    transform: translate3d(0,0,0);
                    transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: transform, opacity;
                }
                .is-idle .garganta-smoke {
                    animation: bd-garganta-smoke-anim var(--dur) ease-in-out var(--delay) infinite;
                }

                .garganta-spark {
                    opacity: 0;
                    transform: translate3d(0,0,0);
                    transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: transform, opacity;
                }
                .is-idle .garganta-spark {
                    animation: bd-garganta-spark-anim var(--dur) linear var(--delay) infinite;
                }

                .garganta-hair-line {
                    opacity: 0;
                    transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: opacity;
                }
                .is-idle .garganta-hair-line {
                    opacity: var(--hair-o) !important;
                    animation: bd-garganta-hair-flicker var(--dur) ease-in-out var(--delay) infinite;
                }

                @keyframes bd-garganta-smoke-anim {
                    0% { opacity: 0; transform: translate3d(0, 0, 0); }
                    50% { opacity: 0.45; }
                    100% { opacity: 0; transform: translate3d(var(--dx), var(--dy), 0); }
                }
                @keyframes bd-garganta-spark-anim {
                    0% { opacity: 0; transform: translate3d(0, 0, 0) scale(1); }
                    50% { opacity: 1; transform: translate3d(0, calc(var(--dy) * 0.5), 0) scale(1.2); }
                    100% { opacity: 0; transform: translate3d(0, var(--dy), 0) scale(0.8); }
                }
                @keyframes bd-garganta-hair-flicker {
                    0%, 100% { opacity: var(--hair-o); }
                    50% { opacity: calc(var(--hair-o) * 0.35); }
                }
                
                /* ป้องกันการกะพริบตอนแอนิเมชันเปิดตัวมิติ */
                .garganta-vignette {
                    opacity: 0;
                    transition: opacity 1200ms ease-out;
                }
                .is-idle .garganta-vignette {
                    animation: bd-vignette-pulse 3s ease-in-out infinite;
                }
                @keyframes bd-vignette-pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.85; }
                }
            `}</style>

            <motion.div animate={shakeControls} className="relative w-[96vw] max-w-[1200px] h-[64vh] min-h-[340px]">

                {phase === "entrance" && (
                    <motion.div
                        className="absolute left-0 right-0 top-1/2 h-[3px] z-30"
                        style={{
                            background: `linear-gradient(90deg, transparent 0%, ${CYAN_BRIGHT} 15%, #ffffff 50%, ${CYAN_BRIGHT} 85%, transparent 100%)`,
                            boxShadow: `0 0 24px 5px rgba(47,208,245,0.85), 0 0 6px 1px #fff`,
                        }}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: [0, 0.4, 0.75, 1.08, 1, 1], opacity: [0, 1, 0.6, 1, 1, 0] }}
                        transition={{ duration: 0.26, times: [0, 0.15, 0.4, 0.65, 0.85, 1], ease: "linear" }}
                    />
                )}

                {/* ═══ LAYER 1: 16 ช่องมิติสีดำ (ใช้ prop 'phase' ตรงกัน 100%) ═══ */}
                <div className="absolute inset-0 flex w-full h-full z-10">
                    {GARGANTA_STRIPS.map((s, i) => {
                        const widthPct = 100 / GARGANTA_STRIPS.length + 0.5;
                        const leftPct = (i / GARGANTA_STRIPS.length) * 100;
                        return (
                            <motion.div
                                key={`void-${i}`}
                                className="absolute top-1/2"
                                style={{
                                    left: `${leftPct}%`, width: `${widthPct}%`, height: `${s.h}%`,
                                    transformOrigin: "center",
                                    background: `linear-gradient(180deg, ${VOID_TOP}, ${VOID_BOTTOM} 50%, ${VOID_TOP})`,
                                    boxShadow: `inset 0 0 25px rgba(10,60,80,0.8)`,
                                }}
                                initial={{ y: "-50%", scaleY: 0, opacity: 0 }}
                                custom={{ delay: s.delay, index: i }}
                                variants={stripVariants}
                                animate={phase}
                            >
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-white opacity-90" style={{ boxShadow: `0 1px 10px 2px ${CYAN_BRIGHT}` }} />
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white opacity-90" style={{ boxShadow: `0 -1px 10px 2px ${CYAN_BRIGHT}` }} />
                            </motion.div>
                        );
                    })}
                </div>

                {/* ═══ LAYER 1.5: เส้นขนแตกละเอียด (เปลี่ยนมาใช้ GPU-flicker Class-based) ═══ */}
                <div className="absolute inset-0 w-full h-full z-[15] pointer-events-none overflow-hidden">
                    {HAIR_LINES.map((hl, i) => (
                        <span
                            key={`hair-${i}`}
                            className="garganta-hair-line absolute"
                            style={{
                                left: hl.left,
                                top: hl.top,
                                width: hl.w,
                                height: hl.h,
                                background: `linear-gradient(180deg, transparent 0%, ${CYAN_BRIGHT} 12%, ${CYAN_EDGE} 50%, ${CYAN_BRIGHT} 88%, transparent 100%)`,
                                filter: "blur(0.2px)",
                                transitionDelay: `${hl.revealDelay}s`,
                                "--hair-o": hl.o,
                                "--dur": `${hl.dur}s`,
                                "--delay": `${hl.delay}s`,
                            } as React.CSSProperties}
                        />
                    ))}
                </div>

                {/* ═══ LAYER 2: 16 ช่องมิติสำหรับครอปควันและละออง (Sync แอนิเมชันกับมิติหลักอย่างไร้รอยต่อ) ═══ */}
                <div className="absolute inset-0 flex w-full h-full z-20 pointer-events-none">
                    {GARGANTA_STRIPS.map((s, i) => {
                        const widthPct = 100 / GARGANTA_STRIPS.length + 0.5;
                        const leftPct = (i / GARGANTA_STRIPS.length) * 100;
                        return (
                            <motion.div
                                key={`particles-${i}`}
                                className="absolute top-1/2 overflow-hidden"
                                style={{
                                    left: `${leftPct}%`, width: `${widthPct}%`, height: `${s.h}%`,
                                    transformOrigin: "center",
                                }}
                                initial={{ y: "-50%", scaleY: 0, opacity: 0 }}
                                custom={{ delay: s.delay, index: i }}
                                variants={stripVariants}
                                animate={phase} // บังคับผูกสัมพันธ์กับ 'phase' ของแม่โดยตรงเพื่อความแม่นยำระดับซับพิกเซล
                            >
                                <div
                                    className="absolute top-0 h-full"
                                    style={{
                                        width: `min(96vw, 1200px)`,
                                        left: `calc(-1 * min(96vw, 1200px) * ${i / GARGANTA_STRIPS.length})`,
                                    }}
                                >
                                    {/* --- Vignette Effect (ย้ายจาก Framer Motion เป็น CSS Pulse) --- */}
                                    <div
                                        className="garganta-vignette absolute inset-0 pointer-events-none"
                                        style={{
                                            background: `radial-gradient(circle at center, transparent 20%, ${CYAN_EDGE}30 80%, transparent 100%)`,
                                            mixBlendMode: "screen",
                                        }}
                                    />

                                    {/* --- Smokes (0% Framer Motion, รันด้วย GPU 100%) --- */}
                                    {GLOBAL_SMOKES.map((smoke, idx) => (
                                        <div
                                            key={`smoke-${idx}`}
                                            className="garganta-smoke absolute rounded-full pointer-events-none"
                                            style={{
                                                left: smoke.left,
                                                top: smoke.top,
                                                width: `${smoke.size}px`,
                                                height: `${smoke.size}px`,
                                                background: `${CYAN_BRIGHT}25`,
                                                filter: "blur(24px)",
                                                mixBlendMode: "screen",
                                                "--dx": `${smoke.dx}px`,
                                                "--dy": `${smoke.dy}px`,
                                                "--dur": `${smoke.dur}s`,
                                                "--delay": `${smoke.delay}s`,
                                            } as React.CSSProperties}
                                        />
                                    ))}

                                    {/* --- Sparks (0% Framer Motion, รันด้วย GPU 100%) --- */}
                                    {GLOBAL_SPARKS.map((spark, idx) => (
                                        <div
                                            key={`spark-${idx}`}
                                            className="garganta-spark absolute rounded-full pointer-events-none"
                                            style={{
                                                left: spark.left,
                                                top: spark.top,
                                                width: `${spark.size}px`,
                                                height: `${spark.size}px`,
                                                background: CYAN_BRIGHT,
                                                boxShadow: `0 0 ${spark.size * 2}px 1px ${CYAN_EDGE}`,
                                                "--dy": `${spark.dy}px`,
                                                "--dur": `${spark.dur}s`,
                                                "--delay": `${spark.delay}s`,
                                            } as React.CSSProperties}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
}

/**
 * ═══ GargantaContentMask ═══
 */
export function GargantaContentMask({
    phase,
    children,
}: {
    phase: PhenomenonPhase;
    children: React.ReactNode;
}) {
    const containerVariants: Variants = {
        entrance: {
            opacity: 1,
            transition: {
                duration: GARGANTA_RIP_DURATION,
                delay: GARGANTA_RIP_DELAY,
                ease: "linear",
            },
        },
        idle: {
            opacity: 1,
            transition: {
                duration: 0.2,
            },
        },
    };

    const contentVariants: Variants = {
        entrance: {
            opacity: 1,
            transition: {
                duration: 0.4,
                delay: GARGANTA_RIP_DELAY + 0.1,
            },
        },
        idle: {
            opacity: 1,
        },
    };

    return (
        <motion.div
            style={{ transformOrigin: "center" }}
            initial={{ opacity: 0 }}
            animate={phase}
            variants={containerVariants}
        >
            <motion.div
                initial={{ opacity: 1 }}
                variants={contentVariants}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}