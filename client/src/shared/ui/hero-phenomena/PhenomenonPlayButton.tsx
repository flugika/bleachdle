"use client";

import { motion, type Variants } from "framer-motion";
import type { PhenomenonKey, PhenomenonPhase } from "./constants";
import { PHENOMENON_CTA_LORE } from "./constants";
import { GargantaBleed } from "./phenomena/GargantaBleed";

export interface PhenomenonCTASkin {
    clipPath?: string;
    safePadding?: number;
    Bleed?: React.ComponentType<{ phase: PhenomenonPhase }>;
}

// ── ALMIGHTY / YHWACH ─────────────────────────────────────────────────────
// Bleach lore: The Almighty (全能) ดวงตาหลายม่านตาของจอมจักรพรรดิ Yhwach
// มองเห็นและเปลี่ยนแปลงอนาคต ใช้โครงสร้าง Reishi Crystalline Diamond
// พร้อมม่านตาเรืองแสงสลับสี Kaiser Gold & Crimson Reiatsu

const almightyEyeVariants: Variants = {
    entrance: {
        scale: [0, 1.25, 1],
        opacity: [0, 1, 0.9],
        transition: { duration: 1.6, ease: "easeOut" },
    },
    idle: {
        scale: [1, 1.08, 0.95, 1],
        opacity: [0.8, 1, 0.7, 0.8],
        transition: { duration: 3.8, repeat: Infinity, ease: "easeInOut" },
    },
};

const reishiPulseVariants: Variants = {
    entrance: {
        opacity: [0, 1],
        scaleX: [0.8, 1],
        transition: { duration: 1.2 },
    },
    idle: {
        opacity: [0.5, 0.9, 0.5],
        filter: [
            "drop-shadow(0 0 6px rgba(245,158,11,0.5))",
            "drop-shadow(0 0 14px rgba(239,68,68,0.8))",
            "drop-shadow(0 0 6px rgba(245,158,11,0.5))",
        ],
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    },
};

function AlmightyBleed({ phase }: { phase: PhenomenonPhase }) {
    return (
        <>
            {/* Multi-pupil Almighty Eye #1 (มุมซ้ายบน) */}
            <motion.div
                className="pointer-events-none absolute -top-3.5 left-6 z-20 flex items-center justify-center drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                variants={almightyEyeVariants}
                animate={phase}
            >
                <svg width="32" height="18" viewBox="0 0 32 18" fill="none">
                    <ellipse cx="16" cy="9" rx="15" ry="8" stroke="#fef08a" strokeWidth="1.5" fill="#0c0404" />
                    <circle cx="10" cy="9" r="2.5" fill="#f59e0b" />
                    <circle cx="16" cy="7.5" r="2" fill="#ef4444" />
                    <circle cx="22" cy="9" r="2.5" fill="#f59e0b" />
                </svg>
            </motion.div>

            {/* Multi-pupil Almighty Eye #2 (มุมขวาล่าง) */}
            <motion.div
                className="pointer-events-none absolute -bottom-3.5 right-8 z-20 flex items-center justify-center drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                variants={almightyEyeVariants}
                animate={phase}
            >
                <svg width="28" height="16" viewBox="0 0 32 18" fill="none">
                    <ellipse cx="16" cy="9" rx="15" ry="8" stroke="#f59e0b" strokeWidth="1.5" fill="#0c0404" />
                    <circle cx="10.5" cy="9" r="2" fill="#ef4444" />
                    <circle cx="16" cy="10" r="2.5" fill="#fef08a" />
                    <circle cx="21.5" cy="9" r="2" fill="#ef4444" />
                </svg>
            </motion.div>

            {/* Quincy Reishi Sparkles & Cross Shards */}
            <motion.div
                className="pointer-events-none absolute inset-0 z-10"
                variants={reishiPulseVariants}
                animate={phase}
            >
                <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px]"
                    style={{ background: "linear-gradient(90deg, transparent, #fef08a, transparent)" }}
                />
                <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px]"
                    style={{ background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }}
                />
            </motion.div>

            {/* Inner Border Glow with Crimson Schatten Inner Shadow */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 opacity-80"
                style={{
                    boxShadow:
                        "inset 0 0 0 1.5px rgba(245,158,11,0.5), inset 0 0 28px rgba(185,28,28,0.4), 0 0 15px rgba(245,158,11,0.2)",
                }}
            />
        </>
    );
}

// ── Skin Registry ─────────────────────────────────────────────────────────
export const CTA_SKINS: Partial<Record<PhenomenonKey, PhenomenonCTASkin>> = {
    garganta: {
        clipPath:
            "polygon(2% 16%,7% 6%,13% 12%,19% 2%,27% 10%,35% 0%,44% 8%,53% 1%,62% 7%,71% 1%,80% 8%,88% 2%,95% 9%,100% 4%,100% 90%,94% 96%,87% 91%,79% 98%,70% 92%,61% 99%,52% 93%,43% 99%,34% 93%,25% 98%,17% 92%,10% 97%,4% 91%,0% 84%)",
        safePadding: 16,
        Bleed: GargantaBleed,
    },
    
    // 💥 [เพิ่มส่วนใหม่] ALMIGHTY SKIN - Crystalline Fractured Future Silhouette
    almighty: {
        clipPath:
            "polygon(0% 12%, 6% 0%, 94% 0%, 100% 12%, 97% 50%, 100% 88%, 94% 100%, 6% 100%, 0% 88%, 3% 50%)",
        safePadding: 20,
        Bleed: AlmightyBleed,
    },
};

export function usePhenomenonCTASkin(phenomenon: PhenomenonKey): PhenomenonCTASkin {
    return CTA_SKINS[phenomenon] ?? {};
}

export function PhenomenonLoreCaption({ phenomenon }: { phenomenon: PhenomenonKey }) {
    const lore = PHENOMENON_CTA_LORE[phenomenon];
    if (!lore) return null;
    return (
        <span
            className="relative block text-[9px] md:text-[10px] tracking-[0.14em] mt-2 text-white/50 italic font-[family-name:var(--font-body)]"
            style={{ fontFamily: "'Shippori Mincho', serif" }}
        >
            {lore.jp} <span className="not-italic text-white/30">— {lore.en}</span>
        </span>
    );
}