// src/shared/ui/hero-phenomena/phenomena/AlmightyBleed.tsx
"use client";

import { motion, Variants } from "framer-motion";
import type { PhenomenonPhase } from "../constants";

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
            "drop-shadow(0 0 6px rgba(56,189,248,0.6))",
            "drop-shadow(0 0 14px rgba(37,99,235,0.85))",
            "drop-shadow(0 0 6px rgba(56,189,248,0.6))",
        ],
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    },
};

export function AlmightyBleed({ phase }: { phase: PhenomenonPhase }) {
    return (
        <>
            {/* Multi-pupil Almighty Eye #1 (มุมซ้ายบน) */}
            <motion.div
                className="pointer-events-none absolute -top-3.5 left-6 z-20 flex items-center justify-center drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                variants={almightyEyeVariants}
                animate={phase}
            >
                <svg width="32" height="18" viewBox="0 0 32 18" fill="none">
                    <ellipse cx="16" cy="9" rx="15" ry="8" stroke="#bae6fd" strokeWidth="1.5" fill="#030712" />
                    <circle cx="10" cy="9" r="2.5" fill="#38bdf8" />
                    <circle cx="16" cy="7.5" r="2" fill="#2563eb" />
                    <circle cx="22" cy="9" r="2.5" fill="#38bdf8" />
                </svg>
            </motion.div>

            {/* Multi-pupil Almighty Eye #2 (มุมขวาล่าง) */}
            <motion.div
                className="pointer-events-none absolute -bottom-3.5 right-8 z-20 flex items-center justify-center drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]"
                variants={almightyEyeVariants}
                animate={phase}
            >
                <svg width="28" height="16" viewBox="0 0 32 18" fill="none">
                    <ellipse cx="16" cy="9" rx="15" ry="8" stroke="#38bdf8" strokeWidth="1.5" fill="#030712" />
                    <circle cx="10.5" cy="9" r="2" fill="#2563eb" />
                    <circle cx="16" cy="10" r="2.5" fill="#bae6fd" />
                    <circle cx="21.5" cy="9" r="2" fill="#2563eb" />
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
                    style={{ background: "linear-gradient(90deg, transparent, #bae6fd, transparent)" }}
                />
                <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px]"
                    style={{ background: "linear-gradient(90deg, transparent, #38bdf8, transparent)" }}
                />
            </motion.div>

            {/* Inner Border Glow with Royal Blue Schatten Shadow */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 opacity-80"
                style={{
                    boxShadow:
                        "inset 0 0 0 1.5px rgba(56,189,248,0.5), inset 0 0 28px rgba(30,58,138,0.45), 0 0 15px rgba(56,189,248,0.25)",
                }}
            />
        </>
    );
}