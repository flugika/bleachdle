// src/shared/ui/SoulSyncLoader.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

// ─────────────────────────────────────────────
//  GLYPH POOLS & DESIGN TOKENS
// ─────────────────────────────────────────────

const CENTRAL_GLYPHS = [
    "❖", // Gotei 13 Division Badge Base (ตราหน่วยยมทูต)
    "☸", // Wheel of Samsara (วัฏสงสาร)
    "✟", // Quincy Holy Cross (กางเขนควินซี่)
    "☠", // Hollow Mask / Death Silhouette (ฮอลโลว์)
    "☯", // Konpaku Equilibrium (ความสมดุลแห่งวิญญาณ)
    "☽", // Getsuga Crescent Moon (จันทร์เสี้ยวซันเกสึ)
    "♛", // The Reio's Crown (บัลลังก์ราชาแห่งวิญญาณ)
] as const;

const REIATSU_PARTICLES = [
    "✦", "✧", "✵", "✹", "✺", // High-density Reiatsu flares
    "◦", "◌", "☉"            // Dispersing Reishi Particles
] as const;

type GlyphType = (typeof CENTRAL_GLYPHS)[number];

function pickRandom<T>(pool: readonly T[]): T {
    return pool[Math.floor(Math.random() * pool.length)];
}

const T = {
    gold: "#c8a96e",
    goldBright: "#f5ebd5",
    muted: "#5a5a78",
    mutedDim: "#3f3f56",
} as const;

// 🎯 OPTICAL CALIBRATION MAP: ตารางจัดระเบียบแกนหมุนของอักขระพิเศษแต่ละตัว
// อัปเดตค่าชดเชยใหม่ให้แม่นยำขึ้นสำหรับฟอนต์มาตรฐาน
const GLYPH_METRICS: Record<GlyphType, { x: string; y: string; scale?: number }> = {
    "❖": { x: "0px", y: "2px" },                  // สมมาตร
    "☸": { x: "0px", y: "4px" },                  // สมมาตร
    "✟": { x: "0px", y: "2px" },                 // ฐานกางเขนยาวมาก ต้องดึงขึ้นเยอะ
    "☠": { x: "0px", y: "2px" },                 // กะโหลกมักชิดขอบล่าง ดึงขึ้นนิดนึง
    "☯": { x: "0px", y: "3px" },                  // สมมาตร
    "☽": { x: "4px", y: "2px", scale: 1.05 },    // น้ำหนักเทขวาชัดเจน ดึงกลับซ้าย
    "♛": { x: "0px", y: "2px" },                 // มงกุฎฐานแบน ดึงลอยขึ้นให้ตรงจุดหมุน
};

export interface SoulSyncLoaderProps {
    label?: string;
    subLabel?: string;
    cycleMs?: number;
    className?: string;
}

export default function SoulSyncLoader({
    label = "Synchronizing Soul Spiritual Energy...",
    subLabel,
    cycleMs = 2200,
    className = "",
}: SoulSyncLoaderProps) {
    const [glyph, setGlyph] = useState<GlyphType>(CENTRAL_GLYPHS[0]);
    const [reducedMotion, setReducedMotion] = useState(false);

    const particles = useMemo(
        () => Array.from({ length: 8 }, () => pickRandom(REIATSU_PARTICLES)),
        []
    );

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReducedMotion(mq.matches);
        const onChange = () => setReducedMotion(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    useEffect(() => {
        setGlyph(pickRandom(CENTRAL_GLYPHS));
        if (cycleMs <= 0 || reducedMotion) return;

        const id = setInterval(() => setGlyph(pickRandom(CENTRAL_GLYPHS)), cycleMs);
        return () => clearInterval(id);
    }, [cycleMs, reducedMotion]);

    const currentMetric = GLYPH_METRICS[glyph] || { x: "0px", y: "0px", scale: 1 };

    return (
        <div
            role="status"
            aria-live="polite"
            className={`mt-40 flex flex-col items-center justify-center ${className}`}
        >
            <div className="relative mb-8 flex items-center justify-center" style={{ width: 120, height: 120 }}>

                {/* ✨ EFFECT 1: Volumetric Reiatsu Backlight */}
                <div
                    className="absolute rounded-full bg-[#c8a96e]/10 blur-2xl transition-all duration-1000"
                    style={{ width: 90, height: 90 }}
                />

                {/* ✨ EFFECT 2: Concentric Senkaimon Rings */}
                {!reducedMotion && (
                    <>
                        <div
                            className="absolute rounded-full border border-dashed border-[#c8a96e]/30 animate-[spin_18s_linear_infinite]"
                            style={{ width: 114, height: 114 }}
                        />
                        <div
                            className="absolute rounded-full border border-double border-[#c8a96e]/40 animate-[spin_10s_linear_infinite_reverse] shadow-[0_0_15px_rgba(200,169,110,0.15)]"
                            style={{ width: 88, height: 88 }}
                        />
                        <div
                            className="absolute rounded-full border border-[#5a5a78]/30 animate-[spin_6s_linear_infinite]"
                            style={{ width: 66, height: 66 }}
                        />
                    </>
                )}

                {/* ✨ EFFECT 3: Orbiting Reishi Swarm */}
                <div
                    className={`absolute inset-0 flex items-center justify-center ${reducedMotion ? "" : "animate-[spin_12s_linear_infinite]"}`}
                >
                    {particles.map((p, i) => {
                        const angle = (360 / particles.length) * i;
                        const isEven = i % 2 === 0;
                        return (
                            <span
                                key={i}
                                aria-hidden="true"
                                className="absolute select-none animate-pulse"
                                style={{
                                    fontSize: isEven ? 13 : 9,
                                    color: isEven ? T.gold : T.goldBright,
                                    opacity: isEven ? 0.85 : 0.45,
                                    filter: `drop-shadow(0 0 4px ${T.gold})`,
                                    transform: `rotate(${angle}deg) translate(48px) rotate(-${angle}deg)`,
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
                <div
                    className={`absolute w-16 h-16 flex items-center justify-center ${reducedMotion ? "" : "animate-[spin_4s_linear_infinite]"}`}
                >
                    <span
                        key={glyph}
                        aria-hidden="true"
                        // 🛡️ หัวใจการแก้ปัญหา: ลบ top-1/2 left-1/2 ออก และบังคับให้ span กว้าง/ยาวเต็มกล่องแม่
                        // แล้วใช้ flex จัดเนื้อข้างในแทน จากนี้ Bounding Box ของฟอนต์จะไม่กวนแกนหมุนอีกต่อไป
                        className="flex items-center justify-center w-full h-full text-5xl leading-none select-none transition-all duration-300"
                        style={{
                            color: T.goldBright,
                            // 🛡️ ขยับพิกัดชดเชย (Offset) ได้ตรงๆ โดยไม่ต้องพึ่ง calc(-50%)
                            transform: `translate(${currentMetric.x}, ${currentMetric.y}) scale(${currentMetric.scale || 1})`,
                            filter: `drop-shadow(0 0 12px rgba(200, 169, 110, 0.85)) drop-shadow(0 0 3px rgba(245, 235, 213, 0.9))`,
                        }}
                    >
                        {glyph}
                    </span>
                </div>
            </div>

            <p
                className={`text-xs uppercase tracking-[0.25em] font-medium ${reducedMotion ? "" : "animate-pulse"}`}
                style={{ color: T.gold, textShadow: "0 0 10px rgba(200, 169, 110, 0.3)" }}
            >
                {label}
            </p>

            {subLabel && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: T.muted }}>
                    {subLabel}
                </p>
            )}

            <span className="sr-only">Loading</span>
        </div>
    );
}