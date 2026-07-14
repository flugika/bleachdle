// src/shared/ui/SenkaimonTransition.tsx
"use client";

import { useEffect, useState } from "react";
import { useSenkaimon } from "@/src/shared/ui/context/NavigationContext";

// ระยะเวลาเต็มของอนิเมชันชุดเดิม (ประตู + คันจิ + วงแหวน + แสง ฯลฯ)
const CYCLE_MS = 1400;

function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReduced(mq.matches);
        const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener("change", listener);
        return () => mq.removeEventListener("change", listener);
    }, []);
    return reduced;
}

export function SenkaimonTransition() {
    const { state } = useSenkaimon();
    const reducedMotion = useReducedMotion();

    // 🔑 นับรอบทุกครั้งที่ NavigationContext เริ่ม "closing" รอบใหม่
    // ใช้เป็น React key เพื่อบังคับ remount แล้วอนิเมชัน CSS เดิมทั้งชุดจะเริ่มเล่นใหม่ตั้งแต่ 0ms
    // (ไม่ต้องมี setTimeout ของตัวเองอีกต่อไป เพราะ NavigationContext เป็นคนคุมวงจร idle → closing → closed → opening → idle)
    const [cycle, setCycle] = useState(0);
    const [prevState, setPrevState] = useState(state);

    if (prevState === "idle" && state === "closing") {
        setCycle((c) => c + 1);
    }
    if (prevState !== state) {
        setPrevState(state);
    }

    // หากระบบแอปไม่ได้กำลัง Navigate ใดๆ ให้ถอด Element ออกจาก DOM ทันที ไม่กิน Performance หน้าจอ
    if (state === "idle") return null;

    if (reducedMotion) {
        return (
            <div
                key={cycle}
                aria-hidden="true"
                role="presentation"
                className="fixed inset-0 z-[9999] select-none bg-[#040406]"
                style={{ animation: `senkaimon-fade-simple ${CYCLE_MS}ms ease-in-out forwards` }}
            />
        );
    }

    return (
        <div
            key={cycle}
            aria-hidden="true"
            role="presentation"
            className="fixed inset-0 z-[9999] select-none overflow-hidden bg-transparent font-[family-name:var(--font-display)]"
            style={{ animation: `senkaimon-impact-shake ${CYCLE_MS}ms cubic-bezier(0.25,1,0.5,1) forwards` }}
        >
            {/* 🚪 Left gate leaf */}
            <div
                className="absolute top-0 left-0 w-1/2 h-full flex items-center justify-end"
                style={{
                    background: "linear-gradient(105deg, #050507 0%, #0d0d14 55%, #16151d 100%)",
                    borderRight: "1px solid rgba(200,169,110,0.45)",
                    animation: `senkaimon-gate-left ${CYCLE_MS}ms cubic-bezier(0.25,1,0.5,1) forwards`,
                    boxShadow: "14px 0 50px rgba(200,169,110,0.12), inset -1px 0 0 rgba(255,255,255,0.04)",
                    willChange: "transform",
                }}
            >
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(100deg, #fff 0px, #fff 1px, transparent 1px, transparent 16px)",
                    }}
                />
                <div className="w-px h-3/4 bg-gradient-to-b from-transparent via-[#c8a96e]/20 to-transparent mr-10" />
                <CornerBracket className="top-6 right-4" flip />
                <CornerBracket className="bottom-6 right-4" flip bottom />
            </div>

            {/* 🚪 Right gate leaf */}
            <div
                className="absolute top-0 right-0 w-1/2 h-full flex items-center justify-start"
                style={{
                    background: "linear-gradient(-105deg, #050507 0%, #0d0d14 55%, #16151d 100%)",
                    borderLeft: "1px solid rgba(200,169,110,0.45)",
                    animation: `senkaimon-gate-right ${CYCLE_MS}ms cubic-bezier(0.25,1,0.5,1) forwards`,
                    boxShadow: "-14px 0 50px rgba(200,169,110,0.12), inset 1px 0 0 rgba(255,255,255,0.04)",
                    willChange: "transform",
                }}
            >
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(-100deg, #fff 0px, #fff 1px, transparent 1px, transparent 16px)",
                    }}
                />
                <div className="w-px h-3/4 bg-gradient-to-b from-transparent via-[#c8a96e]/20 to-transparent ml-10" />
                <CornerBracket className="top-6 left-4" bottom={false} />
                <CornerBracket className="bottom-6 left-4" bottom />
            </div>

            {/* ⚡ Single-frame impact flash */}
            <div
                className="absolute inset-0 bg-[#c8a96e]"
                style={{
                    animation: `senkaimon-impact-flash ${CYCLE_MS}ms steps(1) forwards`,
                    mixBlendMode: "overlay",
                    opacity: 1,
                }}
            />

            {/* ☀️ Sunburst rays */}
            <svg
                viewBox="0 0 400 400"
                className="absolute top-1/2 left-1/2 w-[480px] h-[480px] mix-blend-screen"
                style={{ animation: `sunburst-spin ${CYCLE_MS}ms ease-out forwards` }}
            >
                {[...Array(16)].map((_, i) => (
                    <line
                        key={i}
                        x1="200" y1="200"
                        x2={200 + 190 * Math.cos((i * Math.PI) / 8)}
                        y2={200 + 190 * Math.sin((i * Math.PI) / 8)}
                        stroke="#c8a96e"
                        strokeWidth={i % 2 === 0 ? 1 : 0.4}
                        opacity={i % 2 === 0 ? 0.35 : 0.15}
                    />
                ))}
            </svg>

            {/* 💥 Central reiatsu flash */}
            <div
                className="absolute top-1/2 left-1/2 w-[340px] h-[340px] rounded-full mix-blend-screen"
                style={{
                    background: "radial-gradient(circle, #ffffff 0%, #eed9c4 35%, transparent 70%)",
                    animation: `reiatsu-flash ${CYCLE_MS}ms cubic-bezier(0.16,1,0.3,1) forwards`,
                    boxShadow: "0 0 10px #c8a96e, 0 0 160px rgba(200,169,110,0.55)",
                }}
            />

            {/* 🔏 Engraved medallion ring */}
            <svg
                viewBox="0 0 300 300"
                className="absolute top-1/2 left-1/2 w-[260px] h-[260px] -translate-x-1/2 -translate-y-1/2"
            >
                <circle
                    cx="150" cy="150" r="138"
                    fill="none" stroke="#c8a96e" strokeWidth="1.5"
                    strokeDasharray="880" pathLength={880}
                    style={{ animation: `seal-ring-draw ${CYCLE_MS}ms ease-in-out forwards`, transformOrigin: "150px 150px" }}
                />
                <circle
                    cx="150" cy="150" r="118"
                    fill="none" stroke="#eed9c4" strokeWidth="0.75"
                    strokeDasharray="880" pathLength={880}
                    style={{ animation: `seal-ring-draw-rev ${CYCLE_MS}ms ease-in-out forwards`, transformOrigin: "150px 150px" }}
                />
            </svg>

            {/* 🔏 ─── EXPERT UX/UI: ULTRA-SHARP SNAP NAVIGATION SEAL ─── */}
            <div
                className="absolute top-1/2 left-1/2 flex flex-col items-center justify-center"
                style={{ animation: `seal-glow ${CYCLE_MS}ms ease-in-out forwards` }}
            >
                {/* 1. คันจิอักษรพู่กัน (Snappy Shunpo Reveal — คมชัดตั้งแต่วิกฤตแรก) */}
                <div
                    className="flex items-center justify-center gap-3 mb-1"
                    style={{ fontFamily: "'Shippori Mincho', 'Noto Serif JP', 'Georgia', serif" }}
                >
                    {["穿", "界", "門"].map((char, index) => (
                        <span
                            key={index}
                            className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] via-[#c8a96e] to-[#8c6f3d] drop-shadow-[0_6px_8px_rgba(0,0,0,0.95)] opacity-0 select-none"
                            style={{
                                animation: `kanji-sharp-reveal 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                                // ⏱️ Start exactly after impact (18% = 252ms). Sync'd frame-by-frame.
                                animationDelay: `${252 + index * 50}ms`,
                                willChange: "transform, opacity",
                            }}
                        >
                            {char}
                        </span>
                    ))}
                </div>

                {/* 2. สัญลักษณ์กางเขนควินซี่ (Quincy Cross Laser Cut) */}
                <div
                    className="flex items-center justify-center w-56 my-1.5 opacity-0"
                    style={{
                        animation: `ornament-laser-expand 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                        animationDelay: "380ms",
                        willChange: "transform, opacity",
                    }}
                >
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8a96e]/70 to-[#c8a96e]" />
                    <div className="mx-3 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 fill-[#ffffff] drop-shadow-[0_0_14px_#c8a96e]" viewBox="0 0 24 24">
                            <path d="M12 2L15.5 8.5L22 12L15.5 15.5L12 22L8.5 15.5L2 12L8.5 8.5L12 2Z" />
                            <circle cx="12" cy="12" r="1.2" fill="#050507" />
                        </svg>
                    </div>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#c8a96e]/70 to-[#c8a96e]" />
                </div>

                {/* 3. โรมันฟอนต์จักรวรรดิ (Cinzel Text Track Burst) */}
                <span
                    className="text-[11px] md:text-xs font-bold uppercase tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-b from-white via-[#eed9c4] to-[#c8a96e] opacity-0 select-none"
                    style={{
                        fontFamily: "'Cinzel', 'Times New Roman', serif",
                        animation: `text-sharp-burst 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                        animationDelay: "420ms",
                        willChange: "transform, opacity",
                    }}
                >
                    SENKAIMON
                </span>

                {/* 4. รายละเอียดรหัสกำกับมิติ */}
                <span
                    className="text-[10px] uppercase font-mono tracking-[0.45em] text-[#eed9c4]/40 mt-2.5 opacity-0 select-none"
                    style={{
                        animation: `text-sharp-burst 0.4s ease-out forwards`,
                        animationDelay: "480ms",
                    }}
                >
                    DIMENSION SHIFT // ALIGNED
                </span>
            </div>

            {/* 🌌 Layered reishi particles */}
            <div className="absolute inset-0 flex justify-around opacity-40 mix-blend-screen">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={`a-${i}`}
                        className="w-[1.7px] h-12 bg-gradient-to-t from-transparent to-[#c8a96e]"
                        style={{
                            left: `${i * 16 + 10}%`,
                            animation: `reishi-float-a ${0.7 + i * 0.1}s ease-in-out infinite`,
                            animationDelay: `${i * 0.08}s`,
                        }}
                    />
                ))}
                {[...Array(4)].map((_, i) => (
                    <div
                        key={`b-${i}`}
                        className="w-[2.7px] h-6 rounded-full blur-[1px] bg-gradient-to-t from-transparent to-[#eed9c4]"
                        style={{
                            left: `${i * 24 + 18}%`,
                            animation: `reishi-float-b ${1.1 + i * 0.15}s ease-in-out infinite`,
                            animationDelay: `${i * 0.14 + 0.2}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function CornerBracket({
    className,
    flip = false,
    bottom = false,
}: {
    className: string;
    flip?: boolean;
    bottom?: boolean;
}) {
    return (
        <div className={`absolute w-3 h-3 ${className}`}>
            <div className={`absolute w-full h-px bg-[#c8a96e]/50 ${bottom ? "bottom-0" : "top-0"}`} />
            <div className={`absolute h-full w-px bg-[#c8a96e]/50 ${flip ? "right-0" : "left-0"}`} />
        </div>
    );
}