// src/shared/ui/SoulSyncLoader.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────
//  GLYPH POOLS & DESIGN TOKENS
// ─────────────────────────────────────────────

interface GlyphMetric {
    x: string;
    y: string;
    scale?: number;
}

const GLYPH_REGISTRY: Record<string, GlyphMetric> = {
    "❖": { x: "0px", y: "2px" },
    "☸": { x: "0px", y: "4px" },
    "✟": { x: "0px", y: "2px" },
    "☠": { x: "0px", y: "2px" },
    "☯": { x: "0px", y: "3px" },
    "☽": { x: "4px", y: "2px", scale: 1.05 },
    "♛": { x: "0px", y: "2px" },
    "❀": { x: "0px", y: "2px" },
    "❁": { x: "0px", y: "2px" },
    "➴": { x: "-2px", y: "2px" },
    "✥": { x: "0px", y: "2px" },
    "✬": { x: "0px", y: "0px" },
    "☂": { x: "0px", y: "3px" },
    "۞": { x: "0px", y: "6px", scale: 0.6 },
};

const REIATSU_PARTICLES = [
    "✦", "✧", "✵", "✹", "✺", // High-density Reiatsu flares
    "◦", "◌", "☉", "✣", "☀", "✰"            // Dispersing Reishi Particles
] as const;

type GlyphType = keyof typeof GLYPH_REGISTRY;
const CENTRAL_GLYPHS = Object.keys(GLYPH_REGISTRY) as GlyphType[];

function pickRandom<T>(pool: readonly T[]): T {
    return pool[Math.floor(Math.random() * pool.length)];
}

function getNextIndex(currentIndex: number, max: number): number {
    if (max <= 1) return 0;
    const offset = Math.floor(Math.random() * (max - 1)) + 1;
    return (currentIndex + offset) % max;
}

const T = {
    gold: "#c8a96e",
    goldBright: "#f5ebd5",
    muted: "#5a5a78",
    mutedDim: "#3f3f56",
} as const;

export interface SoulSyncLoaderProps {
    label?: string;
    subLabel?: string;
    cycleMs?: number;
    className?: string;
    hideLabel?: boolean;
    /**
     * ✨ ปรับขนาดความกว้าง/สูงของ Component วงแหวนที่หมุน (หน่วยเป็นพิกเซล)
     * @default 120
     */
    size?: number;
}

export default function SoulSyncLoader({
    label = "Synchronizing Soul Spiritual Energy...",
    subLabel,
    cycleMs = 2200,
    className = "",
    hideLabel = false,
    size = 120, // ✨ กำหนดค่า Default ขนาดของ loader เป็น 120px
}: SoulSyncLoaderProps) {
    const [slots, setSlots] = useState<[GlyphType, GlyphType]>([CENTRAL_GLYPHS[0], CENTRAL_GLYPHS[0]]);
    const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
    const activeSlotRef = useRef<0 | 1>(0);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [particles, setParticles] = useState<string[]>([]);
    const currentGlyphIndexRef = useRef<number>(0);

    // 📐 คำนวณอัตราส่วนขนาดเอฟเฟกต์ภายในสัมพันธ์ตามขนาด `size` ที่ส่งเข้ามา
    const backlightSize = Math.round(size * 0.75);
    const ring1Size = Math.round(size * 0.95);
    const ring2Size = Math.round(size * 0.733);
    const ring3Size = Math.round(size * 0.55);
    const particleRadius = Math.round(size * 0.4);
    const glyphContainerSize = Math.round(size * 0.533);
    const glyphFontSize = Math.round(size * 0.4);

    useEffect(() => {
        activeSlotRef.current = activeSlot;
    }, [activeSlot]);

    useEffect(() => {
        setParticles(
            Array.from({ length: REIATSU_PARTICLES.length }, () => pickRandom(REIATSU_PARTICLES))
        );

        const firstIndex = Math.floor(Math.random() * CENTRAL_GLYPHS.length);
        currentGlyphIndexRef.current = firstIndex;
        const firstGlyph = CENTRAL_GLYPHS[firstIndex];
        setSlots([firstGlyph, firstGlyph]);

        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReducedMotion(mq.matches);
        const onChange = () => setReducedMotion(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    useEffect(() => {
        if (cycleMs <= 0 || reducedMotion) return;

        const id = setInterval(() => {
            const incomingSlot: 0 | 1 = activeSlotRef.current === 0 ? 1 : 0;
            const nextIndex = getNextIndex(currentGlyphIndexRef.current, CENTRAL_GLYPHS.length);
            currentGlyphIndexRef.current = nextIndex;
            const nextGlyph = CENTRAL_GLYPHS[nextIndex];

            setSlots((prev) => {
                const next: [GlyphType, GlyphType] = [...prev] as [GlyphType, GlyphType];
                next[incomingSlot] = nextGlyph;
                return next;
            });

            requestAnimationFrame(() => {
                requestAnimationFrame(() => setActiveSlot(incomingSlot));
            });
        }, cycleMs);

        return () => clearInterval(id);
    }, [cycleMs, reducedMotion]);

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={label}
            className={`flex flex-col items-center justify-center ${className}`}
        >
            {/* 🛠️ เปลี่ยนความกว้าง/สูงตรงนี้ให้ใช้ตัวแปร `size` แบบ Dynamic */}
            <div className={`relative ${!hideLabel && "mb-8"} flex items-center justify-center`} style={{ width: size, height: size }}>

                {/* ✨ EFFECT 1: Volumetric Reiatsu Backlight */}
                <div
                    className="absolute rounded-full bg-[#c8a96e]/10 blur-2xl transition-all duration-1000"
                    style={{ width: backlightSize, height: backlightSize }}
                />

                {/* ✨ EFFECT 2: Concentric Senkaimon Rings */}
                {!reducedMotion && (
                    <>
                        <div
                            className="absolute rounded-full border border-dashed border-[#c8a96e]/30 animate-[spin_18s_linear_infinite]"
                            style={{ width: ring1Size, height: ring1Size }}
                        />
                        <div
                            className="absolute rounded-full border border-double border-[#c8a96e]/40 animate-[spin_10s_linear_infinite_reverse] shadow-[0_0_15px_rgba(200,169,110,0.15)]"
                            style={{ width: ring2Size, height: ring2Size }}
                        />
                        <div
                            className="absolute rounded-full border border-[#5a5a78]/30 animate-[spin_6s_linear_infinite]"
                            style={{ width: ring3Size, height: ring3Size }}
                        />
                    </>
                )}

                {/* ✨ EFFECT 3: Orbiting Reishi Swarm */}
                <div
                    className={`absolute inset-0 flex items-center pointer-events-none justify-center ${reducedMotion ? "" : "animate-[spin_12s_linear_infinite]"}`}
                >
                    {particles.map((p, i) => {
                        const angle = (360 / particles.length) * i;
                        const isEven = i % 2 === 0;
                        // คำนวณขนาดของ Particle เม็ดเล็ก-ใหญ่ ตามสัดส่วน size
                        const pSize = isEven ? Math.round(size * 0.108) : Math.round(size * 0.075);

                        return (
                            <span
                                key={i}
                                aria-hidden="true"
                                className="absolute select-none animate-pulse"
                                style={{
                                    fontSize: pSize,
                                    color: isEven ? T.gold : T.goldBright,
                                    opacity: isEven ? 0.85 : 0.45,
                                    filter: `drop-shadow(0 0 4px ${T.gold})`,
                                    // ✨ ปรับระยะวงโคจรเฉลี่ยด้วย `particleRadius`
                                    transform: `rotate(${angle}deg) translate(${particleRadius}px) rotate(-${angle}deg)`,
                                    animationDelay: `${i * 0.18}s`,
                                    animationDuration: "2.2s",
                                }}
                            >
                                {p}
                            </span>
                        );
                    })}
                </div>

                {/* 🎯 EFFECT 4 & OPTICAL CENTER FIX: แกนหมุนล็อคเป้าหมาย */}
                {/* 🛠️ ลบ `w-16 h-16` ออกแล้วใช้ `glyphContainerSize` ควบคุมแทนเพื่อขยายกล่องแกนหมุน */}
                <div
                    className={`absolute flex items-center justify-center ${reducedMotion ? "" : "animate-[spin_4s_linear_infinite]"}`}
                    style={{ width: glyphContainerSize, height: glyphContainerSize }}
                >
                    {slots.map((slotGlyph, i) => {
                        const metric = GLYPH_REGISTRY[slotGlyph];
                        const isActive = activeSlot === i;
                        return (
                            <span
                                key={i}
                                aria-hidden="true"
                                // 🛠️ ลบ `text-5xl` ออกและปรับขนาดฟอนต์ของ Glyph ด้านในผ่าน `glyphFontSize`
                                className="absolute inset-0 flex items-center justify-center leading-none select-none"
                                style={{
                                    fontSize: glyphFontSize,
                                    color: T.goldBright,
                                    opacity: isActive ? 1 : 0,
                                    transform: `translate(${metric.x}, ${metric.y}) scale(${(metric.scale ?? 1) * (isActive ? 1 : 0.85)})`,
                                    filter: isActive
                                        ? "blur(0px) drop-shadow(0 0 12px rgba(200, 169, 110, 0.85)) drop-shadow(0 0 3px rgba(245, 235, 213, 0.9))"
                                        : "blur(5px) drop-shadow(0 0 0px rgba(200, 169, 110, 0))",
                                    transition: reducedMotion
                                        ? "none"
                                        : "opacity 520ms ease-out, filter 520ms ease-out, transform 520ms cubic-bezier(0.22,1,0.36,1)",
                                }}
                            >
                                {slotGlyph}
                            </span>
                        );
                    })}
                </div>
            </div>

            {!hideLabel && (
                <p
                    className={`text-xs uppercase tracking-[0.25em] font-medium ${reducedMotion ? "" : "animate-pulse"}`}
                    style={{ color: T.gold, textShadow: "0 0 10px rgba(200, 169, 110, 0.3)" }}
                >
                    {label}
                </p>
            )}

            {!hideLabel && subLabel && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: T.muted }}>
                    {subLabel}
                </p>
            )}

            <span className="sr-only">Loading</span>
        </div>
    );
}