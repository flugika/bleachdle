// src/shared/ui/hero-phenomena/phenomena/ZeroDivisionBleed.tsx
"use client";

import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import type { PhenomenonPhase } from "../constants";

const zeroDivisionBleedVariants: Variants = {
    entrance: { opacity: [0, 1], scale: [0.95, 1], transition: { duration: 1.2 } },
    idle: {
        opacity: [0.7, 1, 0.7],
        filter: [
            "drop-shadow(0 0 8px rgba(242,207,138,0.4))",
            "drop-shadow(0 0 16px rgba(200,169,110,0.8))",
            "drop-shadow(0 0 8px rgba(242,207,138,0.4))",
        ],
        transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
    },
};

export const ZeroDivisionBleed = memo(function ZeroDivisionBleed({ phase }: { phase: PhenomenonPhase }) {
    return (
        <>
            <motion.div className="pointer-events-none absolute inset-0 z-10" variants={zeroDivisionBleedVariants} animate={phase}>
                {/* เส้นใยสีทองแผ่ออกมาจากขอบบนและล่าง */}
                <span className="absolute -top-1 left-1/4 w-1/2 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #f2cf8a, transparent)" }} />
                <span className="absolute -bottom-1 left-1/4 w-1/2 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #c8a96e, transparent)" }} />

                {/* ตราเวทมนตร์เล็กๆ หมุนประดับที่ 4 มุมของกรอบปุ่ม */}
                {[
                    { top: "-12px", left: "-12px" },
                    { top: "-12px", right: "-12px" },
                    { bottom: "-12px", left: "-12px" },
                    { bottom: "-12px", right: "-12px" }
                ].map((pos, i) => (
                    <div key={i} className="absolute flex items-center justify-center w-6 h-6 opacity-80" style={pos}>
                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" style={{ animation: `bd-halo-spin ${i % 2 === 0 ? 15 : -15}s linear infinite` }}>
                            <circle cx="12" cy="12" r="8" stroke="#c8a96e" strokeWidth="1" strokeDasharray="2 3" />
                            <circle cx="12" cy="12" r="2.5" fill="#f2cf8a" />
                        </svg>
                    </div>
                ))}
            </motion.div>

            {/* แสงรังสีสีทองส่องออกจากกลางปุ่มบางๆ */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 opacity-70"
                style={{ boxShadow: "inset 0 0 0 1.5px rgba(242,207,138,0.4), inset 0 0 32px rgba(200,169,110,0.3)" }}
            />
        </>
    );
});
ZeroDivisionBleed.displayName = "ZeroDivisionBleed";