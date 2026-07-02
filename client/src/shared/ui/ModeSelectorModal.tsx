"use client";

import React from "react";
import { usePathname } from "next/navigation";
// ปรับเปลี่ยนพาร์ทการ Import ตัว Base Modal หลักของโปรเจกต์ให้ตรงกับโครงสร้างจริงของคุณ
import { Modal } from "./modal";
import { useSenkaimon } from "./context/NavigationContext";

export type GameMode = "daily" | "unlimited";

interface ModeConfig {
    id: GameMode;
    kanji: string;
    label: string;
    subText: string;
    pathPrefix: string;
    color: string;     /* Hex Code หลักสำหรับการเล่น Dynamic Style */
    glowColor: string; /* Glow Shadow Alpha */
    borderClass: string;
    hoverBgClass: string;
}

// ☀️ Data Token Config: ซิงค์โครงสร้างและสี Reiatsu ให้เป็นมาตรฐานเดียวกับระบบ Badge
const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
    daily: {
        id: "daily",
        kanji: "日",
        label: "DAILY MISSION",
        subText: "One Soul // One Chance // Reset Nightly",
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
        subText: "Infinite Souls // No Boundaries // Endless Hunt",
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
    onSelectMode: (mode: GameMode) => void;
}

export function ModeSelectorModal({ isOpen, onClose, onSelectMode }: ModeSelectorModalProps) {
    const { navigate } = useSenkaimon();
    const pathname = usePathname();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="SENKAIMON GATEWAY"
            maxWidth="max-w-[500px]"
            variant="default"
        >
            <div className="flex flex-col gap-4 mt-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#5a5a78] text-center mb-4 font-mono select-none">
                    Altering Spiritual Frequency // Select Destination
                </p>

                {/* ⚔️ High-Fidelity Data-Driven Loops */}
                {(Object.keys(MODE_CONFIGS) as GameMode[]).map((key) => {
                    const config = MODE_CONFIGS[key];
                    const isActive = pathname.startsWith(config.pathPrefix);

                    return (
                        <button
                            key={config.id}
                            onClick={() => navigate(config.id)}
                            /* 🔗 กินค่าสีผ่าน CSS Variable [var(--focus-color)] ทันทีเมื่อกด Tab โฟกัส */
                            className={`group relative w-full p-5 border text-left transition-all duration-300 outline-none cursor-pointer
                                bg-[#0a0a0f]/60 ${config.borderClass} ${config.hoverBgClass}
                                focus-visible:ring-1 focus-visible:ring-[var(--focus-color)] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0e0e1a]`}
                            style={{
                                // 🪄 แปลงเป็น CSS Variable แล้วหลบ Type ด้วยการประกาศเป็น Custom Key & Type Cast
                                "--focus-color": config.color,
                                boxShadow: isActive ? `inset 0 0 12px ${config.glowColor}` : "none",
                                borderColor: isActive ? config.color : undefined
                            } as React.CSSProperties} // Cast เป็น CSSProperties เพื่อเคลียร์เงื่อนไข TS
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="font-bold text-xs tracking-[0.2em] uppercase transition-colors duration-300"
                                            style={{ color: config.color }}
                                        >
                                            {config.label}
                                        </span>
                                        <span
                                            className="text-[10px] font-mono transition-transform duration-300 group-hover:scale-110"
                                            style={{ color: `${config.color}90` }}
                                        >
                                            {config.kanji}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-[#eed9c4]/30 font-mono mt-1.5 tracking-wide uppercase select-none">
                                        {config.subText}
                                    </p>
                                </div>

                                {/* 🔮 Dynamic Status Badge */}
                                {isActive ? (
                                    <span
                                        className="text-[9px] font-mono tracking-[0.15em] px-2 py-0.5 font-black uppercase text-black animate-pulse shadow-md"
                                        style={{
                                            backgroundColor: config.color,
                                            boxShadow: `0 0 10px ${config.glowColor}`
                                        }}
                                    >
                                        ACTIVE
                                    </span>
                                ) : (
                                    <span className="text-[8px] font-mono tracking-[0.1em] px-2 py-0.5 text-[#5a5a78] opacity-0 group-hover:opacity-100 transition-opacity duration-300 uppercase">
                                        CONNECT &rarr;
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