"use client";

import React from "react";
import { HollowMaskIcon } from "./HollowMaskIcon";

export type HankoFaction = "hollow" | "shinigami" | "quincy";

interface HankoSealProps {
    faction: HankoFaction;
    stampPhase: "idle" | "ready" | "stamped";
    className?: string;
}

// 💥 โมเดลสะเก็ดพลังงานที่มีรูปทรงแตกต่างตาม Faction (เพื่อความสมจริงเชิงลึกด้าน UX)
const SPARK_PATTERNS = {
    hollow: [
        // รูปทรงเศษหน้ากาก / เศษกระจกแตก (Polygon Shards)
        { x: -38, y: -28, w: 6, h: 4, rot: 35, clip: "polygon(20% 0%, 100% 40%, 70% 100%, 0% 80%)" },
        { x: 42, y: -22, w: 8, h: 6, rot: 120, clip: "polygon(50% 0%, 100% 100%, 0% 80%)" },
        { x: -32, y: 38, w: 5, h: 8, rot: -45, clip: "polygon(0% 20%, 80% 0%, 100% 80%, 20% 100%)" },
        { x: 36, y: 36, w: 7, h: 5, rot: 75, clip: "polygon(30% 0%, 100% 20%, 80% 100%, 0% 60%)" },
        { x: -5, y: -45, w: 4, h: 6, rot: 15, clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
        { x: -48, y: 8, w: 9, h: 4, rot: 190, clip: "polygon(10% 30%, 90% 10%, 100% 90%, 0% 100%)" },
        { x: 46, y: 12, w: 6, h: 6, rot: -80, clip: "polygon(50% 0%, 100% 100%, 0% 100%)" },
        { x: 12, y: 48, w: 8, h: 7, rot: 40, clip: "polygon(0% 0%, 100% 30%, 50% 100%)" },
    ],
    shinigami: [
        // ละอองหมึกพู่กันกลมมน (Ink Splatters)
        { x: -35, y: -25, w: 6, h: 6, rot: 0, clip: "none" },
        { x: 40, y: -18, w: 8, h: 8, rot: 0, clip: "none" },
        { x: -30, y: 35, w: 5, h: 5, rot: 0, clip: "none" },
        { x: 35, y: 32, w: 7, h: 7, rot: 0, clip: "none" },
        { x: -2, y: -42, w: 4, h: 4, rot: 0, clip: "none" },
        { x: -44, y: 10, w: 8, h: 8, rot: 0, clip: "none" },
        { x: 42, y: 6, w: 5, h: 5, rot: 0, clip: "none" },
        { x: 10, y: 44, w: 9, h: 9, rot: 0, clip: "none" },
    ],
    quincy: [
        // ผลึกคริสตัลสี่เหลี่ยมข้าวหลามตัด (Reishi Diamonds)
        { x: -36, y: -24, w: 5, h: 5, rot: 45, clip: "none" },
        { x: 38, y: -20, w: 7, h: 7, rot: 45, clip: "none" },
        { x: -28, y: 35, w: 4, h: 4, rot: 45, clip: "none" },
        { x: 32, y: 32, w: 6, h: 6, rot: 45, clip: "none" },
        { x: 0, y: -42, w: 4, h: 4, rot: 45, clip: "none" },
        { x: -44, y: 10, w: 8, h: 8, rot: 45, clip: "none" },
        { x: 42, y: 8, w: 5, h: 5, rot: 45, clip: "none" },
        { x: 10, y: 44, w: 7, h: 7, rot: 45, clip: "none" },
    ]
};

const FACTION_CONFIGS = {
    hollow: {
        haloText: "HUECO MUNDO // DESCENT INTO THE VOID // GARGANTA ACTIVE",
        haloColor: "rgba(34, 211, 238, 0.45)", // สีฟ้า Cygnus/Garganta สว่างลึกลับ
        // พื้นหลังแกนกลางไล่โทนเหมือนมิติดำมืดที่กำลังบิดเบี้ยว
        sealBg: "radial-gradient(circle at 40% 35%, #181c20 10%, #0d0f12 55%, #020304 95%)",
        borderColor: "rgba(242, 239, 230, 0.9)", // ขาวกระดูก (Bone-White)
        glowColor: "rgba(34, 211, 238, 0.5)",
        svgFilter: "url(#hollow-bone)", // ใช้ SVG Filter ปั้นขอบกระดูกแตกหัก
        icon: <HollowMaskIcon className="w-12 h-12 drop-shadow-[0_0_8px_rgba(47,208,245,0.5)]" />
    },
    shinigami: {
        haloText: "GOTEI 13 // SOUL SOCIETY // SEIREITEI SECURITY // ACTIVE SHIELD",
        haloColor: "rgba(239, 68, 68, 0.45)", // แดงเพลิงแรงดันวิญญาณ
        sealBg: "radial-gradient(circle at 50% 50%, #7f1d1d 0%, #450a0a 60%, #1c0505 100%)",
        borderColor: "rgba(239, 68, 68, 0.9)",
        glowColor: "rgba(239, 68, 68, 0.45)",
        svgFilter: "url(#shinigami-ink)", // SVG Filter ปรับขอบโค้งมนตามรอยซึมของน้ำหมึกพู่กันโบราณ
        icon: (
            // คันจิพู่กัน "中" สไตล์ดุดันลากหางคม
            <svg className="w-10 h-10 text-white" viewBox="0 0 100 100" fill="currentColor">
                <path d="M 46,12 L 54,12 L 54,88 L 46,88 Z" />
                <path d="M 22,30 L 78,30 L 70,62 L 30,62 Z" fill="none" stroke="currentColor" strokeWidth="9" strokeLinejoin="miter" />
                <path d="M 22,30 L 78,30 M 30,62 L 70,62" stroke="currentColor" strokeWidth="10" strokeLinecap="square" />
            </svg>
        )
    },
    quincy: {
        haloText: "SCHATTEN BEREICH // VANDENREICH // STERNRITTER ARSENAL // REISHI",
        haloColor: "rgba(56, 189, 248, 0.45)", // ฟ้าน้ำแข็งคริสตัลสะอาด
        sealBg: "radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 75%, #000000 100%)",
        borderColor: "rgba(186, 230, 253, 0.95)",
        glowColor: "rgba(56, 189, 248, 0.5)",
        svgFilter: "url(#quincy-ice)", // ขอบตัดเหลี่ยมสไตล์คริสตัลน้ำแข็งควินซี่
        icon: (
            // ตราสัญลักษณ์กางเขนห้าแฉกเยอรมันควินซี่สว่างวาบ
            <svg className="w-10 h-10 text-[#bae6fd]" viewBox="0 0 100 100" fill="currentColor">
                <path d="M50,10 L55,38 L83,30 L61,48 L85,65 L55,57 L50,85 L45,57 L15,65 L39,48 L17,30 L45,38 Z" />
                <circle cx="50" cy="48" r="4.5" fill="#ffffff" />
            </svg>
        )
    }
} as const;

export function HankoSeal({ faction, stampPhase, className = "" }: HankoSealProps) {
    const active = FACTION_CONFIGS[faction];
    const sparks = SPARK_PATTERNS[faction];

    return (
        <div
            className={`absolute -top-6 -right-6 md:-top-8 md:-right-8 z-30 select-none w-28 h-28 md:w-32 md:h-32 transition-transform duration-500 ${className}`}
            aria-hidden="true"
        >
            {/* 🛑 1. SVG Filter Definitions (เทคนิคระดับเซียนคีย์สำคัญที่เพิ่มความโหด!) */}
            <svg className="absolute w-0 h-0" width="0" height="0">
                <defs>
                    {/* ฟิลเตอร์แปลงร่างขอบเรียบธรรมดาให้กลายเป็น "ขอบกระดูกและเนื้อไม้ฉีกขาดแบบออร์แกนิก" */}
                    <filter id="hollow-bone">
                        <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="4" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                        <feGaussianBlur in="displaced" stdDeviation="0.4" />
                    </filter>

                    {/* ฟิลเตอร์น้ำหมึกไหลซึมสไตล์ยมทูต */}
                    <filter id="shinigami-ink">
                        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
                    </filter>

                    {/* ฟิลเตอร์มุมคริสตัลเหลี่ยมน้ำแข็งเย็นยะเยือกของควินซี่ */}
                    <filter id="quincy-ice">
                        <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="1" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
            </svg>

            {/* 💥 2. คลื่นพลังกระแทกวงแหวนคู่ยามประทับตรา (Dual-Ring Shockwave) */}
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

            {/* ✨ 3. ละอองเศษวิญญาณระเบิดออกจากตราประทับ (Faction Sparks) */}
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
                        boxShadow: `0 0 10px ${active.glowColor}`,
                        opacity: stampPhase === "stamped" ? 0.9 : 0,
                        transitionDelay: stampPhase === "stamped" ? `${80 + i * 25}ms` : "0ms",
                    }}
                />
            ))}

            {/* 🛡️ 4. ตัวโมเดลตราประทับหลัก (Core Structure) */}
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
                {/* 🌀 5. วงแหวนคัมภีร์เวทอักษรรูนละตินโบราณหมุนสะกดวิญญาณ */}
                <svg
                    className="bd-halo-ring absolute inset-[-14px] w-[calc(100%+28px)] h-[calc(100%+28px)]"
                    viewBox="0 0 100 100"
                    style={{ animation: "bd-halo-spin 28s linear infinite" }}
                >
                    <defs>
                        <path id="bd-halo-path-v2" d="M 50,50 m -43,0 a 43,43 0 1,1 86,0 a 43,43 0 1,1 -86,0" />
                    </defs>
                    <text fill={active.haloColor} fontSize="5.2" letterSpacing="1.5" fontWeight="900" className="uppercase font-mono">
                        <textPath href="#bd-halo-path-v2" startOffset="0%">
                            {active.haloText}
                        </textPath>
                    </text>
                </svg>

                {/* 💀 6. ตราประทับหน้ากากและโครงสร้างกระดูกที่ถูกกัดกร่อนด้วย Reiatsu */}
                <div
                    className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center transition-all duration-300"
                    style={{
                        borderRadius: "50%", // ปล่อยให้ SVG Filter แปลงรูปร่างโค้งมนให้กลายเป็นรอยขรุขระเองด้านนอก
                        background: active.sealBg,
                        filter: active.svgFilter, // พลังเวทย์สกัดขอบให้พังทลายสไตล์ Hueco Mundo!
                        boxShadow: `
                            0 16px 36px rgba(0,0,0,0.9), 
                            0 0 0 3px ${active.borderColor}30,
                            inset 0 0 24px rgba(0,0,0,0.85),
                            0 0 20px ${active.glowColor}25
                        `,
                    }}
                >
                    {/* ชั้นเกราะหน้ากากชิ้นที่ 2 เพื่อเพิ่มความซับซ้อนของมิติตราประทับ */}
                    <div
                        className="absolute inset-[-4px] pointer-events-none opacity-40"
                        style={{
                            borderRadius: "50%",
                            border: `2px solid ${active.borderColor}50`,
                            transform: "rotate(-8deg) scale(1.05)",
                            filter: active.svgFilter,
                        }}
                    />

                    {/* ขอบพู่กันรอยร้าวสีทองจาง ๆ ชั้นด้านใน */}
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