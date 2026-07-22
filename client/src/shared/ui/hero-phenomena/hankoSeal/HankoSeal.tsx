"use client";

import React, { useMemo } from "react";
import { GargantaIcon } from "./GargantaIcon";
import { AlmightyIcon } from "./AlmightyIcon";
import { PhenomenonKey } from "../constants";
import KurohitsugiIcon from "./KurohitsugiIcon";
import ZeroDivisionIcon from "./ZeroDivisionIcon";

interface HankoSealProps {
    phenomenon?: PhenomenonKey;
    stampPhase: "idle" | "ready" | "stamped";
    className?: string;
}

// ── Halo ring geometry ──────────────────────────────────────────────────
// The ring path is a circle of radius 43 centered at 50,50 (see
// bd-halo-path-v2 below). Its true circumference is 2πr ≈ 270.18 SVG
// units — this is the ONLY number that matters for "fitting" the text,
// not character count. We force textLength to exactly this value with
// lengthAdjust="spacing", so the browser stretches/compresses the gaps
// between glyphs (not the glyphs themselves) until the string exactly
// wraps the full ring — short strings get spread out, long strings get
// tightened, and nothing is ever left dangling at the top.
const HALO_RADIUS = 43;
const HALO_CIRCUMFERENCE = 2 * Math.PI * HALO_RADIUS; // ≈ 270.18

// 💥 1. โมเดลสะเก็ดพลังงานครบทั้ง 4 PhenomenonKeys
const SPARK_PATTERNS: Record<PhenomenonKey, Array<{ x: number; y: number; w: number; h: number; rot: number; clip: string }>> = {
    garganta: [
        { x: -28, y: -28, w: 6, h: 4, rot: 35, clip: "polygon(20% 0%, 100% 40%, 70% 100%, 0% 80%)" },
        { x: 62, y: -22, w: 8, h: 6, rot: 120, clip: "polygon(50% 0%, 100% 100%, 0% 80%)" },
        { x: -44, y: 38, w: 5, h: 8, rot: -45, clip: "polygon(0% 20%, 80% 0%, 100% 80%, 20% 100%)" },
        { x: -66, y: 24, w: 7, h: 5, rot: 75, clip: "polygon(30% 0%, 100% 20%, 80% 100%, 0% 60%)" },
        { x: -5, y: -56, w: 4, h: 6, rot: 15, clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
        { x: -38, y: 12, w: 9, h: 4, rot: 10, clip: "polygon(10% 30%, 90% 10%, 100% 90%, 0% 100%)" },
        { x: 66, y: 12, w: 6, h: 6, rot: -80, clip: "polygon(50% 0%, 100% 100%, 0% 100%)" },
        { x: 12, y: 38, w: 8, h: 7, rot: 40, clip: "polygon(0% 0%, 100% 30%, 50% 100%)" },
    ],
    almighty: [
        { x: -36, y: -24, w: 6, h: 6, rot: 45, clip: "none" },
        { x: 52, y: -20, w: 8, h: 8, rot: 45, clip: "none" },
        { x: -28, y: 35, w: 5, h: 5, rot: 45, clip: "none" },
        { x: 38, y: 38, w: 7, h: 7, rot: 45, clip: "none" },
        { x: 0, y: -42, w: 5, h: 5, rot: 45, clip: "none" },
        { x: -60, y: 10, w: 8, h: 8, rot: 45, clip: "none" },
        { x: 42, y: 8, w: 6, h: 6, rot: 45, clip: "none" },
        { x: 10, y: 36, w: 7, h: 7, rot: 45, clip: "none" },
    ],
    kurohitsugi: [
        // ── INNER ORBIT (หลบเข้าวงใน ไม่บังตัวหนังสือ) ─────────────────
        // 1. Mini Cross Seal (Top-Left Inner) - กางเขนจิ๋วเรียวบาง
        { x: -22, y: -30, w: 4.5, h: 4.5, rot: 15, clip: "polygon(38% 0%, 62% 0%, 62% 38%, 100% 38%, 100% 62%, 62% 62%, 62% 100%, 38% 100%, 38% 62%, 0% 62%, 0% 38%, 38% 38%)" },

        // 2. Reiatsu Needle (West Inner) - เข็มแทงคมกริบ
        { x: -28, y: 38, w: 1.5, h: 12, rot: 80, clip: "polygon(50% 0%, 100% 80%, 50% 100%, 0% 80%)" },

        // 3. Mini Shard (East Inner) - เศษศิลาเรียวเล็ก
        { x: 26, y: -38, w: 2.2, h: 9, rot: -45, clip: "polygon(20% 0%, 100% 15%, 80% 100%, 0% 85%)" },

        // 4. Execution Needle (South Inner) - เข็มวิญญาณวงใน
        { x: 8, y: 32, w: 1.5, h: 11, rot: -20, clip: "polygon(50% 0%, 85% 15%, 60% 88%, 50% 100%, 40% 88%, 15% 15%)" },

        // ── OUTER ORBIT (ขยับออกวงนอก ล้อมรอบตัวหนังสือ) ───────────────
        // 5. Execution Spear (North Outer) - หอกยาวทรงแคบพุ่งลงมาจากด้านบน
        { x: -40, y: -14, w: 1.8, h: 18, rot: 15, clip: "polygon(50% 0%, 85% 15%, 60% 88%, 50% 100%, 40% 88%, 15% 15%)" },

        // 6. Obsidian Shard (Top-Right Outer) - ศิลาเฉียงทรงเพรียว
        { x: 56, y: -2, w: 3.5, h: 12, rot: -35, clip: "polygon(20% 0%, 100% 12%, 80% 100%, 0% 88%)" },

        // 7. Outer Cross Seal (Bottom-Right Outer) - กางเขนวงนอกขนาดกะทัดรัด
        { x: 38, y: 38, w: 4.8, h: 4.8, rot: 25, clip: "polygon(38% 0%, 62% 0%, 62% 38%, 100% 38%, 100% 62%, 62% 62%, 62% 100%, 38% 100%, 38% 62%, 0% 62%, 0% 38%, 38% 38%)" },

        // 8. Needle Spear (North-West Outer) - เข็มสังหารวงนอก
        { x: -42, y: -42, w: 1.8, h: 15, rot: 45, clip: "polygon(50% 0%, 100% 80%, 50% 100%, 0% 80%)" },

        // 9. Sharp Obsidian Shard (Bottom-Left Outer) - เศษหินแหลมคม
        { x: -36, y: 38, w: 3, h: 11, rot: -50, clip: "polygon(15% 0%, 92% 18%, 100% 85%, 0% 100%)" },

        // 10. Fine Edge Shard (East Outer) - เศษใบมีดศิลาฝั่งขวา
        { x: 54, y: -22, w: 2.5, h: 13, rot: 110, clip: "polygon(50% 0%, 80% 65%, 100% 100%, 50% 85%, 0% 100%, 20% 65%)" }
    ],
    zerodivision: [
        { x: -35, y: -25, w: 7, h: 7, rot: 30, clip: "none" },
        { x: 44, y: -32, w: 8, h: 8, rot: 45, clip: "none" },
        { x: -22, y: -56, w: 8, h: 8, rot: 45, clip: "none" },
        { x: -26, y: 28, w: 6, h: 6, rot: 20, clip: "none" },
        { x: 52, y: 26, w: 7, h: 7, rot: 60, clip: "none" },
        { x: -2, y: -42, w: 5, h: 5, rot: 60, clip: "none" },
        { x: -62, y: 10, w: 8, h: 8, rot: 30, clip: "none" },
        { x: 42, y: -10, w: 6, h: 6, rot: 90, clip: "none" },
        { x: 10, y: 36, w: 9, h: 9, rot: 45, clip: "none" },
    ]
};

interface PhenomenonConfig {
    haloText: string;
    haloColor: string;
    sealBg: string;
    borderColor: string;
    glowColor: string;
    svgFilter: string;
    icon: React.ReactNode;
}

// 💥 3. haloText — fixed the truncated/typo'd Kurohitsugi string ("GRIONAL"
// → full "GRAVITATIONAL TORRENT"). Exact character count no longer matters
// since textLength forces the fit, but keeping full real words (not cut
// mid-word) still matters for readability.
const PHENOMENON_CONFIGS: Record<PhenomenonKey, PhenomenonConfig> = {
    garganta: {
        haloText: "HUECO MUNDO // DESCENT INTO THE VOID // GARGANTA ACTIVE //",
        haloColor: "rgba(34, 211, 238, 0.45)",
        sealBg: "radial-gradient(circle at 40% 35%, #181c20 10%, #0d0f12 55%, #020304 95%)",
        borderColor: "rgba(242, 239, 230, 0.9)",
        glowColor: "rgba(34, 211, 238, 0.5)",
        svgFilter: "url(#hollow-bone)",
        icon: <GargantaIcon className="w-12 h-12 drop-shadow-[0_0_8px_rgba(47,208,245,0.5)]" />
    },
    almighty: {
        haloText: "VANDENREICH // DER KAISER // A - THE ALMIGHTY // ALL FUTURE SEEN //",
        haloColor: "rgba(56, 189, 248, 0.75)",
        sealBg: "radial-gradient(circle at 50% 40%, #1e3a8a 0%, #0f172a 60%, #020617 100%)",
        borderColor: "rgba(56, 189, 248, 0.95)",
        glowColor: "rgba(37, 99, 235, 0.65)",
        svgFilter: "url(#quincy-ice)",
        icon: <AlmightyIcon className="w-12 h-12 drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]" />
    },
    kurohitsugi: {
        haloText: "HADŌ #90 // KUROHITSUGI // BLACK COFFIN // GRAVITATIONAL TORRENT //",
        haloColor: "rgba(168, 85, 247, 0.65)",
        sealBg: "radial-gradient(circle at 50% 50%, #3b0764 0%, #1e1b4b 60%, #030712 100%)",
        borderColor: "rgba(192, 132, 252, 0.9)",
        glowColor: "rgba(168, 85, 247, 0.6)",
        svgFilter: "url(#shinigami-ink)",
        icon: <KurohitsugiIcon className="w-12 h-12 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
    },
    zerodivision: {
        haloText: "ROYAL GUARD // ZERO DIVISION // REIKYUU // PALACE OF THE SOUL KING //",
        haloColor: "rgba(234, 179, 8, 0.65)",
        sealBg: "radial-gradient(circle at 50% 50%, #854d0e 0%, #451a03 60%, #0c0a09 100%)",
        borderColor: "rgba(250, 204, 21, 0.95)",
        glowColor: "rgba(234, 179, 8, 0.5)",
        svgFilter: "url(#shinigami-ink)",
        icon: <ZeroDivisionIcon size={40} className="w-12 h-12 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
    }
};

export function HankoSeal({ phenomenon = "garganta", stampPhase, className = "" }: HankoSealProps) {
    const active = PHENOMENON_CONFIGS[phenomenon] || PHENOMENON_CONFIGS.garganta;
    const sparks = SPARK_PATTERNS[phenomenon] || SPARK_PATTERNS.garganta;

    // Memoized so we don't recompute string manipulation every render —
    // only when the phenomenon (and therefore haloText) actually changes.
    const haloDisplayText = useMemo(() => {
        // Guard against a single trailing "//" being the only content
        // (shouldn't happen, but keeps textLength stretching from acting
        // on an empty/near-empty string).
        return active.haloText.trim().length > 0 ? active.haloText : "// —— //";
    }, [active.haloText]);

    return (
        <div
            className={`absolute -top-6 -right-6 md:-top-8 md:-right-8 z-30 select-none w-28 h-28 md:w-32 md:h-32 transition-transform duration-500 ${className}`}
            aria-hidden="true"
        >
            {/* 🛑 1. SVG Filter Definitions */}
            <svg className="absolute w-0 h-0" width="0" height="0">
                <defs>
                    <filter id="hollow-bone">
                        <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" stitchTiles="stitch" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                        <feGaussianBlur in="displaced" stdDeviation="0.4" />
                    </filter>

                    <filter id="shinigami-ink">
                        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
                    </filter>

                    <filter id="quincy-ice">
                        <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="1" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
            </svg>

            {/* 💥 2. คลื่นพลังกระแทกวงแหวนคู่ยามประทับตรา */}
            {stampPhase === "stamped" && (
                <>
                    <span
                        className="absolute inset-0 rounded-full border-2 pointer-events-none"
                        style={{
                            borderColor: active.borderColor,
                            animation: "bd-hanko-shock 700ms cubic-bezier(0.1, 1, 0.1, 1) forwards",
                            filter: active.svgFilter,
                        }}
                    />
                    <span
                        className="absolute inset-[-10px] rounded-full border pointer-events-none opacity-50"
                        style={{
                            borderColor: active.haloColor,
                            animation: "bd-hanko-shock 1000ms cubic-bezier(0.1, 1, 0.1, 1) 80ms forwards",
                        }}
                    />
                </>
            )}

            {/* ✨ 3. ละอองเศษวิญญาณระเบิดออกจากตราประทับ */}
            {sparks.map((f, i) => (
                <span
                    key={i}
                    className="absolute pointer-events-none transition-all duration-700"
                    style={{
                        left: `calc(50% + ${f.x}px)`,
                        top: `calc(50% + ${f.y}px)`,
                        width: `${f.w}px`,
                        height: `${f.h}px`,
                        transform: stampPhase === "stamped"
                            ? `scale(1.3) rotate(${f.rot}deg) translate(${f.x * 0.4}px, ${f.y * 0.4}px)`
                            : "scale(0) rotate(0deg)",
                        clipPath: f.clip,
                        backgroundColor: active.borderColor,
                        boxShadow: i < 3 ? `0 0 10px ${active.glowColor}` : "none",
                        opacity: stampPhase === "stamped" ? 0.9 : 0,
                        transitionDelay: stampPhase === "stamped" ? `${80 + i * 25}ms` : "0ms",
                    }}
                />
            ))}

            {/* 🛡️ 4. ตัวโมเดลตราประทับหลัก */}
            <div
                className="bd-hanko-stamp absolute inset-0 flex items-center justify-center"
                style={{
                    opacity: stampPhase === "idle" ? 0 : 1,
                    animation:
                        stampPhase === "ready"
                            ? "bd-hanko-approach 450ms cubic-bezier(0.25, 1, 0.5, 1) forwards"
                            : stampPhase === "stamped"
                                ? "bd-hanko-impact 500ms cubic-bezier(0.25, 1, 0.5, 1) forwards"
                                : undefined,
                }}
            >
                {/* 🌀 5. วงแหวนคัมภีร์เวทอักษรรูนหมุนสะกดวิญญาณ */}
                <svg
                    className="bd-halo-ring absolute inset-[-14px] w-[calc(100%+28px)] h-[calc(100%+28px)]"
                    viewBox="0 0 100 100"
                    style={{ animation: "bd-halo-spin 28s linear infinite" }}
                >
                    <defs>
                        <path
                            id="bd-halo-path-v2"
                            d={`M 50,50 m -${HALO_RADIUS},0 a ${HALO_RADIUS},${HALO_RADIUS} 0 1,1 ${HALO_RADIUS * 2},0 a ${HALO_RADIUS},${HALO_RADIUS} 0 1,1 -${HALO_RADIUS * 2},0`}
                        />
                    </defs>
                    <text fill={active.haloColor} fontSize="5.2" fontWeight="900" className="uppercase font-mono">
                        {/*
                            textLength = full ring circumference, lengthAdjust
                            = "spacing" (glyph size untouched, only the gaps
                            between letters stretch/compress). This is what
                            actually solves "text ตัดเหลือแค่ด้านบน": no
                            matter how many characters haloText has, SVG
                            forces it to wrap the ENTIRE 360° ring exactly
                            once — short strings get spread wide, long
                            strings get pulled tight, nothing left dangling.
                        */}
                        <textPath
                            href="#bd-halo-path-v2"
                            startOffset="0%"
                            textLength={HALO_CIRCUMFERENCE}
                            lengthAdjust="spacing"
                        >
                            {haloDisplayText}
                        </textPath>
                    </text>
                </svg>

                {/* 💀 6. ตราประทับโครงสร้างชั้นกลาง */}
                <div
                    className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center transition-all duration-300"
                    style={{
                        borderRadius: "50%",
                        background: active.sealBg,
                        filter: active.svgFilter,
                        boxShadow: `
                            0 16px 36px rgba(0,0,0,0.9), 
                            0 0 0 3px ${active.borderColor}30,
                            inset 0 0 24px rgba(0,0,0,0.85),
                            0 0 20px ${active.glowColor}25
                        `,
                    }}
                >
                    <div
                        className="absolute inset-[-4px] pointer-events-none opacity-40"
                        style={{
                            borderRadius: "50%",
                            border: `2px solid ${active.borderColor}50`,
                            transform: "rotate(-8deg) scale(1.05)",
                            filter: active.svgFilter,
                        }}
                    />

                    <div className="absolute inset-[6px] rounded-full border border-dashed opacity-30" style={{ borderColor: active.borderColor }} />

                    {/* 🎭 7. ไอคอนตราสัญลักษณ์ประจำขุมพลังชั้นในสุด */}
                    <div className="relative z-10 flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                        {active.icon}
                    </div>
                </div>
            </div>
        </div>
    );
}