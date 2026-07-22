"use client";

import React, { useEffect, useRef } from "react";
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

const STRIP_COUNT = GARGANTA_STRIPS.length;
export const PRECOMPUTED_STRIPS = GARGANTA_STRIPS.map((strip, i) => {
    const widthPct = `${100 / STRIP_COUNT + 0.5}%`;
    const leftPct = `${(i / STRIP_COUNT) * 100}%`;
    return {
        ...strip,
        index: i,
        widthPct,
        leftPct,
    };
});

const HAIR_LINE_COUNT = 26;
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
    idle: {
        y: "-50%",
        scaleY: 1,
        opacity: 1,
        transition: { duration: 0.1 }
    },
};

// 💡 Micro-Canvas: กลับมาใช้ควัน 2 เลเยอร์ที่กำลังสวยงามและเบาสบายเครื่อง
const StripParticleCanvas = React.memo(function StripParticleCanvas({ index }: { index: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let time = index * 1.5;

        const particles = [
            { x: 30, y: 80, r: 40, speed: 0.4, alpha: 0.12 },
            { x: 20, y: 200, r: 25, speed: -0.6, alpha: 0.08 }
        ];

        const render = () => {
            time += 0.03;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const grad = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 5,
                canvas.width / 2, canvas.height / 2, canvas.width * 1.2
            );
            grad.addColorStop(0, "transparent");
            grad.addColorStop(0.7, "rgba(47, 208, 245, 0.15)");
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p, idx) => {
                const currentY = p.y + Math.sin(time + idx * 2) * 15;
                const pGrad = ctx.createRadialGradient(
                    p.x, currentY, 0,
                    p.x, currentY, p.r
                );
                pGrad.addColorStop(0, `rgba(174, 244, 255, ${p.alpha * 1.5})`);
                pGrad.addColorStop(1, "rgba(174, 244, 255, 0)");

                ctx.fillStyle = pGrad;
                ctx.beginPath();
                ctx.arc(p.x, currentY, p.r, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        canvas.width = 60;
        canvas.height = 300;
        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [index]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
});

export const Garganta = React.memo(function Garganta({ phase }: { phase: PhenomenonPhase }) {
    const shakeControls = useAnimationControls();
    const startedShake = useRef(false);
    const isIdle = phase === "idle";

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
            className={`garganta-wrapper absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0c0a0d] select-none pointer-events-none transition-all duration-300 ${isIdle ? "is-idle" : ""}`}
        >
            <motion.div animate={shakeControls} className="relative top-10 w-[96vw] max-w-[1200px] h-[64vh] min-h-[340px]">

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

                {/* ═══ LAYER: 16 บล็อกอิสระพร้อมขอบเรืองแสงเนียนตาและ Canvas ภายใน ═══ */}
                <div className="absolute inset-0 flex w-full h-full z-10">
                    {PRECOMPUTED_STRIPS.map((s) => (
                        <motion.div
                            key={`strip-${s.index}`}
                            className={`absolute top-1/2 overflow-hidden ${isIdle ? "garganta-strip-idle" : ""}`}
                            style={{
                                left: s.leftPct,
                                width: s.widthPct,
                                height: `${s.h}%`,
                                transformOrigin: "center",
                                background: `linear-gradient(180deg, #051b24 0%, ${VOID_TOP} 15%, ${VOID_BOTTOM} 50%, ${VOID_TOP} 85%, #051b24 100%)`,
                                borderLeft: `1px solid rgba(47, 208, 245, 0.35)`,
                                borderRight: `1px solid rgba(47, 208, 245, 0.35)`,
                                boxShadow: `inset 0 0 12px rgba(47, 208, 245, 0.15)`,
                                willChange: "transform",
                                ["--idle-dur" as string]: `${3.2 + (s.index % 4) * 0.4}s`,
                            } as React.CSSProperties}
                            initial={{ y: "-50%", scaleY: 0, opacity: 0 }}
                            custom={{ delay: s.delay, index: s.index }}
                            variants={stripVariants}
                            animate={phase}
                        >
                            <StripParticleCanvas index={s.index} />

                            {/* 💡 ขอบเรืองแสงหัว-ท้ายแบบจัดเต็ม (Neon Energy Glow) */}
                            <div className="absolute -top-[6px] left-[-3px] right-[-3px] h-[14px] z-20 pointer-events-none" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(47,208,245,0.6) 30%, ${CYAN_BRIGHT} 50%, rgba(47,208,245,0.6) 70%, transparent 100%)`, borderRadius: '50%', filter: 'blur(0.5px)' }} />
                            <div className="absolute -bottom-[6px] left-[-3px] right-[-3px] h-[14px] z-20 pointer-events-none" style={{ background: `linear-gradient(180deg, transparent 0%, rgba(47,208,245,0.6) 30%, ${CYAN_BRIGHT} 50%, rgba(47,208,245,0.6) 70%, transparent 100%)`, borderRadius: '50%', filter: 'blur(0.5px)' }} />
                        </motion.div>
                    ))}
                </div>

                {/* ═══ LAYER 1.5: เส้นขนแตกละเอียด ═══ */}
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
                                transitionDelay: `${hl.revealDelay}s`,
                                willChange: "transform, opacity",
                                "--hair-o": hl.o,
                                "--dur": `${hl.dur}s`,
                                "--delay": `${hl.delay}s`,
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
});

export const GargantaContentMask = React.memo(function GargantaContentMask({
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
            transition: { duration: 0.2 },
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
            <motion.div initial={{ opacity: 1 }} variants={contentVariants}>
                {children}
            </motion.div>
        </motion.div>
    );
});