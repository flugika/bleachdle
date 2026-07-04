// src/shared/ui/ThematicModeSelector.tsx
"use client";

import React from "react";
import Link from "next/link";
import { FEATURE_FLAGS } from "@/src/config/feature.flags";
import { ModeType, SubFeatureKey } from "@/src/config/mode";
import { useSenkaimon } from "@/src/shared/ui/context/NavigationContext";
import { BL_MODES_METADATA } from "@/src/config/mode";
import { HeaderDivider } from "../../layout/HeaderDivider";

interface ThematicModeSelectorProps {
    modeType: ModeType;
    onSelect?: (subMode: SubFeatureKey) => void;
}

export const ThematicModeSelector: React.FC<ThematicModeSelectorProps> = ({
    modeType,
    onSelect,
}) => {
    const { navigate, state } = useSenkaimon();
    const currentFlags = FEATURE_FLAGS[modeType];

    // ⚔️ BLEACH ENGINE FILTER: กรองเฉพาะโหมดที่มีสถานะเป็น true เท่านั้น ด่านไหนปิดจะไม่เอามาคิดในเลย์เอาต์ Grid
    const activeModes = (Object.keys(BL_MODES_METADATA) as SubFeatureKey[]).filter(
        (key) => currentFlags[key]
    );

    // 🛡️ SENKAIMON INTERCEPTOR ENGINE (SEO & POWER-USER SAFEGUARD)
    const handleNavigation = (
        e: React.MouseEvent<HTMLAnchorElement>,
        path: string,
        subModeId: SubFeatureKey
    ) => {
        // 1. ถ้าผู้เล่นกด Ctrl, Cmd, Shift, หรือ Alt + คลิก เพื่อเปิดหน้าใหม่ในแท็บอื่น
        // ปล่อยให้เบราว์เซอร์ทำงานตามธรรมชาติโดยไม่ต้องกางม่านปิดประตูเซนไกมงในหน้านี้
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
            return;
        }

        // 2. ป้องกันคำสั่ง Navigation ซ้อนทับกันกรณีที่ประตูกำลังทำงานอยู่
        if (state !== "idle") {
            e.preventDefault();
            return;
        }

        // 3. ดักจับและระงับการทำงานแบบสลับหน้าทันทีของ Next.js Link
        e.preventDefault();

        // 4. เรียก Callback เดิมของระบบ (เช่น การปิด Modal โหมด หรือการเตรียม State ล่วงหน้าใน Zustand Store)
        onSelect?.(subModeId);

        // 5. ปลดปล่อยแรงดันวิญญาณ: สั่งเริ่มอนิเมชันปิดประตู และ Navigate ไปยังมิติปลายทางอย่างนุ่มนวล
        navigate(path);
    };

    return (
        <div className="relative w-full bleach-grid overflow-hidden flex flex-col items-center justify-start px-4 py-20 selection:bg-[#c8a96e]/30">
            {/* 卍解 Huge Kanji Background Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[28vw] font-bold text-kanji-watermark pointer-events-none select-none z-0 leading-none">
                {modeType === "daily" ? "日常" : "無限"}
            </div>

            {/* ================= HEADER HUD ================= */}
            <div className="relative z-20 text-center mb-16 max-w-3xl px-4">
                <div className="text-[6px] md:text-xs tracking-[0.7em] text-[#c8a96e] font-mono font-bold mb-6 flex flex-col md:flex-row items-center justify-center gap-3">
                    {/* ใช้ items-center เพื่อจัดแนวตั้ง */}
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* เพิ่ม shrink-0 เพื่อป้องกัน Dot ยุบตัวหากข้อความยาว */}
                        <span className="w-1 h-1 md:w-2 md:h-2 bg-[#c8a96e] animate-ping rounded shrink-0" />
                        <span>SYSTEM_ACCESS</span>
                    </div>

                    <span className="hidden md:inline">//</span>
                    <span>SENKAIMON_GATE_ONLINE</span>
                </div>
                <h1
                    className="text-3xl md:text-7xl font-extrabold tracking-[0.4em] bg-gradient-to-r from-[#c8a96e] via-[#f5ebd5] to-[#c8a96e] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(255,255,255,0.2)] pl-[0.4em]"
                >
                    {modeType}
                </h1>
                <HeaderDivider className="mt-6" />
                <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-[0.3em] mt-6 leading-relaxed max-w-2xl mx-auto">
                    Synchronize your spiritual pressure to breach the dimensions. Only stabilized dimensional rifts are displayed.
                </p>
            </div>

            {/* ================= SELECTION ENGINE GRID ================= */}
            <div className="relative z-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl px-4 md:px-8">
                {activeModes.map((key, index) => {
                    const config = BL_MODES_METADATA[key];
                    const targetPath = `/${modeType}/${config.id}`;

                    return (
                        <Link
                            key={config.id}
                            href={targetPath}
                            onClick={(e) => handleNavigation(e, targetPath, config.id)}
                            className="relative p-6 md:p-8 border border-white/20 bg-gradient-to-b from-[#0c0c16] to-[#040408] shadow-[0_4px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-500 group rounded-none overflow-hidden"
                            style={{ contentVisibility: "auto" }}
                        >
                            {/* 1. Permanent Ambient Reiatsu Glow */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(200,169,110,0.06)_0%,transparent_70%)] pointer-events-none" />

                            {/* 2. Hover Laser Spirit Slash Effect */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none z-0 transition-opacity duration-300">
                                <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                            </div>

                            {/* 3. Hover Radical Pressure Ignite */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.12)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            {/* 4. Premium Matrix Bracket Borders */}
                            <div className="absolute top-0 left-0 w-8 h-[2px] bg-white/40 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                            <div className="absolute top-0 left-0 w-[2px] h-8 bg-white/40 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                            <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-white/40 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                            <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-white/40 group-hover:bg-[#c8a96e] transition-colors duration-500" />

                            {/* 5. Hover Corner Neon Expand */}
                            <div className="absolute top-0 right-0 w-4 h-[1px] bg-[#c8a96e] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-right" />
                            <div className="absolute bottom-0 left-0 w-4 h-[1px] bg-[#c8a96e] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                            {/* Core Inner Content */}
                            <div className="h-full flex flex-col justify-between relative z-10">
                                <div className="flex items-start justify-between mb-10">
                                    <div className="text-5xl font-serif font-black text-white/20 text-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:text-[#c8a96e] group-hover:scale-125 group-hover:drop-shadow-[0_0_20px_rgba(200,169,110,0.6)] transition-all duration-700">
                                        {config.symbol}
                                    </div>

                                    <div className="flex flex-col items-end font-mono text-[8px] tracking-[0.2em] text-right">
                                        <span className="text-[#c8a96e] font-bold flex items-center gap-1.5 bg-[#c8a96e]/10 px-2 py-0.5 border border-[#c8a96e]/20 rounded-none shadow-[0_0_10px_rgba(200,169,110,0.1)]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse" />
                                            {config.technicalTerm}
                                        </span>
                                        <span className="mt-2 font-medium text-white/40">
                                            {config.romaji}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-mono tracking-[0.35em] block mb-2 font-bold text-[#c8a96e]/80 group-hover:text-white transition-colors duration-500">
                                        {config.id}
                                    </span>
                                    <h2 className="text-xl font-extrabold tracking-[0.25em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-[#c8a96e] group-hover:tracking-[0.28em] transition-all duration-500">
                                        {config.title}
                                    </h2>
                                    <p className="text-[11px] uppercase tracking-[0.18em] leading-relaxed mt-4 text-white/50 group-hover:text-white/90 transition-all duration-500">
                                        {config.desc}
                                    </p>
                                </div>

                                <div className="mt-10 pt-4 border-t border-white/10 flex justify-between items-center text-[9px] font-mono tracking-[0.25em] text-white/40 transition-colors duration-500">
                                    <span>SYS_CHAMBER: 0{index + 1}</span>
                                    <span className="opacity-40 group-hover:opacity-100 group-hover:text-[#c8a96e] transition-all duration-500 flex items-center gap-2 transform group-hover:translate-x-1">
                                        RELEASE <span className="text-xs font-sans font-bold">→</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};