"use client";

import { motion, type Variants } from "framer-motion";
import type { PhenomenonKey, PhenomenonPhase } from "./constants";
import { PHENOMENON_CTA_LORE } from "./constants";
import { GARGANTA_STRIPS, GARGANTA_RIP_DELAY, GARGANTA_RIP_DURATION } from "./phenomena/Garganta";

// ════════════════════════════════════════════════════════════════════════
// PhenomenonPlayButton skin system
// ────────────────────────────────────────────────────────────────────────
// The daily-play button used to be a rectangle sitting IN FRONT of the
// background phenomenon, painted in matching colors ("isGarganta ? cyan
// strips at the edges : gold"). That reads as decoration. What we want is
// for the button to be a fragment that belongs to the phenomenon — cut by
// the same tear, lit by the same reiatsu, carrying a line of lore that
// explains why this specific object is the door to today's puzzle.
//
// Each phenomenon gets a "skin" with three independent pieces:
//
//   1. clipPath     — torn silhouette applied to the button's own edges.
//                      Undefined = plain rectangle (safe default for any
//                      phenomenon that hasn't been art-directed yet).
//   2. safePadding   — extra inner padding (px) so text never sits in the
//                      deepest notch of the torn silhouette.
//   3. Bleed         — phenomenon matter (void strips, embers, ink...)
//                      rendered ACROSS the button's edges, reusing the
//                      exact same visual primitives as the background
//                      renderer so it reads as one continuous object,
//                      not a re-skinned copy.
//
// HeroDailyCTA only needs to ask `usePhenomenonCTASkin(phenomenon)` and
// spread the result onto the button — it doesn't need to know which
// phenomenon exists or how many more will be added later.
// ════════════════════════════════════════════════════════════════════════

export interface PhenomenonCTASkin {
    clipPath?: string;
    safePadding?: number;
    Bleed?: React.ComponentType<{ phase: PhenomenonPhase }>;
}

// ── GARGANTA ─────────────────────────────────────────────────────────────
// Bleach lore: a Garganta is torn open with claws along a fault line
// between worlds — never a clean cut. The button's clip-path is that same
// jagged fault line, and three of the STRIPS from the background rift
// (same array, same indices logic as Garganta.tsx) are threaded straight
// through the button and out past its top/bottom edges, so it looks like
// the CTA is the piece of the rift that never fully closed.
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

function GargantaBleed({ phase }: { phase: PhenomenonPhase }) {
    return (
        <>
            {GARGANTA_BUTTON_STRIP_IDX.map((idx, i) => {
                const s = GARGANTA_STRIPS[idx];
                const leftPct = 10 + i * 38; // three shards spread across the button width
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
            {/* thin cyan hairline tracing the torn edge itself, so the clip-path
                reads as a wound rather than a CSS mask */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 opacity-70"
                style={{ boxShadow: "inset 0 0 0 1px rgba(94,224,255,0.35), inset 0 0 22px rgba(47,208,245,0.18)" }}
            />
        </>
    );
}

// ── Skin registry ─────────────────────────────────────────────────────────
// Add an entry here to art-direct the button for a new phenomenon. Anything
// missing falls back to a clean rectangle with no Bleed layer — the button
// still works, it just isn't "torn" yet.
export const CTA_SKINS: Partial<Record<PhenomenonKey, PhenomenonCTASkin>> = {
    garganta: {
        clipPath:
            "polygon(2% 16%,7% 6%,13% 12%,19% 2%,27% 10%,35% 0%,44% 8%,53% 1%,62% 7%,71% 1%,80% 8%,88% 2%,95% 9%,100% 4%,100% 90%,94% 96%,87% 91%,79% 98%,70% 92%,61% 99%,52% 93%,43% 99%,34% 93%,25% 98%,17% 92%,10% 97%,4% 91%,0% 84%)",
        safePadding: 16,
        Bleed: GargantaBleed,
    },
    // almighty: { ... }        — eyes bleeding light through cracked edges
    // kurohitsugi: { ... }     — pillar seams / ember scorch along the cut
    // zerodivision: { ... }    — a brush stroke left unfinished at one corner
};

export function usePhenomenonCTASkin(phenomenon: PhenomenonKey): PhenomenonCTASkin {
    return CTA_SKINS[phenomenon] ?? {};
}

/** One line of in-universe justification for why this button IS the door
 *  to today's puzzle, rendered under the CTA's subtext. */
export function PhenomenonLoreCaption({ phenomenon }: { phenomenon: PhenomenonKey }) {
    const lore = PHENOMENON_CTA_LORE[phenomenon];
    if (!lore) return null;
    return (
        <span
            className="relative block text-[9px] md:text-[10px] tracking-[0.14em] mt-2 text-white/40 italic"
            style={{ fontFamily: "'Shippori Mincho', serif" }}
        >
            {lore.jp} <span className="not-italic text-white/25">— {lore.en}</span>
        </span>
    );
}