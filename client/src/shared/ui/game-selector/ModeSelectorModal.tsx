// src/components/ModeSelectorModal.tsx
"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "../modal";

export type GameMode = "daily" | "unlimited";

interface ModeConfig {
    id: GameMode;
    kanji: string;
    label: string;
    subText: string;
    pathPrefix: string;
    color: string;
    glowColor: string;
    borderClass: string;
    hoverBgClass: string;
}

const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
    daily: {
        id: "daily",
        kanji: "日",
        label: "DAILY MISSION",
        subText: "One Soul // Reset Nightly",
        pathPrefix: "/daily",
        color: "#c8a96e",
        glowColor: "rgba(200, 169, 110, 0.4)",
        borderClass: "border-[#c8a96e]/20 hover:border-[#c8a96e]/60",
        hoverBgClass: "hover:bg-[#c8a96e]/5",
    },
    unlimited: {
        id: "unlimited",
        kanji: "無限",
        label: "UNLIMITED TRIAL",
        subText: "Infinite Souls // Endless Hunt",
        pathPrefix: "/unlimited",
        color: "#a855f7",
        glowColor: "rgba(168, 85, 247, 0.4)",
        borderClass: "border-[#a855f7]/20 hover:border-[#a855f7]/60",
        hoverBgClass: "hover:bg-[#a855f7]/5",
    },
};

interface ModeSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    // ปรับให้ onSelect ส่งค่า Mode ที่เลือก และ SubFeature ปัจจุบัน (ถ้ามี) กลับไปให้คนเรียกใช้งาน
    onSelectMode: (mode: GameMode, currentSubFeature?: string) => void;
    selectedSubFeature?: string | null;
}

export function ModeSelectorModal({
    isOpen,
    onClose,
    onSelectMode,
    selectedSubFeature
}: ModeSelectorModalProps) {
    const pathname = usePathname();

    // 🧠 [Smart Path Parsing] วิเคราะห์ URL ปัจจุบัน
    const { activeBaseMode, activeSubFeature } = useMemo(() => {
        // แตก URL ออกเป็นส่วนๆ เช่น "/unlimited/character" -> ["unlimited", "character"]
        const pathSegments = pathname.split('/').filter(Boolean);

        return {
            activeBaseMode: pathSegments[0] || null,
            // ถ้ามี Prop ส่งมา (เช่น กดจากหน้า Home) ให้ยึด Prop ก่อน, ถ้าไม่มีให้ดึงจาก URL 
            activeSubFeature: selectedSubFeature || pathSegments[1] || null
        };
    }, [pathname, selectedSubFeature]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="SENKAIMON GATEWAY"
            maxWidth="max-w-[500px]"
            variant="default"
        >
            <div className="flex flex-col gap-4 mt-2 font-[family-name:var(--font-body)]">
                <p className="text-[12px] uppercase tracking-[0.25em] text-[#777796] text-center mb-4 select-none font-black font-[family-name:var(--font-display)]">
                    Target: {activeSubFeature ? activeSubFeature.toUpperCase() : "AWAITING SELECTION"} // Select Destination
                </p>

                {(Object.keys(MODE_CONFIGS) as GameMode[]).map((key) => {
                    const config = MODE_CONFIGS[key];

                    // 🔥 [Core Fix]: เช็ค Active จากการ StartsWith แทนที่จะเป็น Exact Match
                    // เช่น ถ้า pathname คือ "/unlimited/character" และ config.pathPrefix คือ "/unlimited" ก็จะ Active ทันที
                    const isActive = pathname.startsWith(config.pathPrefix);

                    return (
                        <button
                            key={config.id}
                            onClick={() => {
                                // ส่งกลับไปให้ Parent พร้อมบอกว่าตอนนี้เล็ง SubFeature อะไรอยู่
                                onSelectMode(config.id, activeSubFeature || undefined);
                            }}
                            className={`group relative w-full p-5 border text-left transition-all duration-300 outline-none cursor-pointer
                                bg-[#0a0a0f]/60 ${config.borderClass} ${config.hoverBgClass}
                                focus-visible:ring-1 focus-visible:ring-[var(--focus-color)] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0e0e1a]`}
                            style={{
                                "--focus-color": config.color,
                                boxShadow: isActive ? `inset 0 0 14px ${config.glowColor}` : "none",
                                borderColor: isActive ? config.color : undefined
                            } as React.CSSProperties}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="font-bold text-xs tracking-[0.2em] uppercase transition-colors duration-300 font-[family-name:var(--font-display)]"
                                            style={{ color: config.color }}
                                        >
                                            {config.label}
                                        </span>
                                        <span
                                            className="text-[12px] transition-transform duration-300 group-hover:scale-110"
                                            style={{ color: `${config.color}90` }}
                                        >
                                            {config.kanji}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#eed9c4]/50 mt-1.5 tracking-wide uppercase select-none">
                                        {config.subText}
                                    </p>
                                </div>

                                {isActive ? (
                                    <span
                                        className="text-[11px] tracking-[0.15em] px-2 py-0.5 font-black uppercase text-black animate-pulse shadow-md font-[family-name:var(--font-display)]"
                                        style={{
                                            backgroundColor: config.color,
                                            boxShadow: `0 0 14px ${config.glowColor}`
                                        }}
                                    >
                                        CURRENT
                                    </span>
                                ) : (
                                    <span className="text-[10px] tracking-[0.1em] px-2 py-0.5 text-[#777796] opacity-0 group-hover:opacity-100 transition-opacity duration-300 uppercase">
                                        {/* ถ้าหน้าปัจจุบันคือ /unlimited/character แล้วปุ่มนี้คือ Daily ให้เขียนว่า SWITCH TO DAILY */}
                                        {activeBaseMode ? "SWITCH MODE \u2192" : "CONNECT \u2192"}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </Modal>
    );
}