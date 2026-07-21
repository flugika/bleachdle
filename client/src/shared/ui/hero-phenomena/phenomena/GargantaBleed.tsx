import { motion, type Variants } from "framer-motion";
import { PhenomenonPhase } from "../constants";
import { GARGANTA_RIP_DELAY, GARGANTA_RIP_DURATION, GARGANTA_STRIPS } from "./Garganta";

// ── GARGANTA ─────────────────────────────────────────────────────────────
const GARGANTA_BUTTON_STRIP_IDX = [2, 7, 12] as const;

const gargantaStripVariants: Variants = {
    entrance: ({ delay }: { delay: number }) => ({
        scaleY: [0, 0.6, 1.1, 0.95, 1],
        opacity: 1,
        transition: {
            duration: GARGANTA_RIP_DURATION,
            delay: GARGANTA_RIP_DELAY + delay,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.4, 0.7, 0.88, 1],
        },
    }),
    idle: {
        scaleY: [1, 1.02, 0.99, 1.015, 1],
        opacity: 1,
        transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
    },
};

export function GargantaBleed({ phase }: { phase: PhenomenonPhase }) {
    return (
        <>
            {GARGANTA_BUTTON_STRIP_IDX.map((idx, i) => {
                const s = GARGANTA_STRIPS[idx];
                const leftPct = 10 + i * 38;
                return (
                    <motion.span
                        key={idx}
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-5 -bottom-5 w-[3px] z-20"
                        style={{
                            left: `${leftPct}%`,
                            transformOrigin: "center",
                            background: "linear-gradient(180deg, transparent 6%, #aef4ff 45%, #2fd0f5 55%, transparent 94%)",
                            boxShadow: "0 0 10px 2px rgba(47,208,245,0.75)",
                        }}
                        initial={{ scaleY: 0, opacity: 0 }}
                        custom={{ delay: s.delay }}
                        variants={gargantaStripVariants}
                        animate={phase}
                    />
                );
            })}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 opacity-70"
                style={{ boxShadow: "inset 0 0 0 1px rgba(94,224,255,0.35), inset 0 0 22px rgba(47,208,245,0.18)" }}
            />
        </>
    );
}