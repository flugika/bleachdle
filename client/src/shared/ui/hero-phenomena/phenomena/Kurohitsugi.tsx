// src/shared/ui/hero-phenomena/phenomena/Kurohitsugi.tsx
import type { PhenomenonPhase } from "../constants";

// Pillars framing the hero content in a loose rectangle — not a perfect
// grid, so it reads as a coffin closing around the hero rather than a UI
// border. Each has its own rise delay so the "box" assembles unevenly, the
// way a fast kido incantation would.
const PILLARS = [
    { left: "6%", w: 10, h: 62, delay: 0.0 },
    { left: "16%", w: 6, h: 48, delay: 0.12 },
    { left: "84%", w: 8, h: 58, delay: 0.06 },
    { left: "93%", w: 6, h: 44, delay: 0.2 },
    { left: "50%", w: 5, h: 30, delay: 0.3, top: true },
    { left: "30%", w: 5, h: 26, delay: 0.38, top: true },
    { left: "70%", w: 5, h: 26, delay: 0.34, top: true },
];

const EMBERS = [
    { left: "8%", ex: "60px", ey: "-40px", delay: 1.4 },
    { left: "18%", ex: "-30px", ey: "50px", delay: 1.55 },
    { left: "86%", ex: "-55px", ey: "-30px", delay: 1.45 },
    { left: "92%", ex: "40px", ey: "45px", delay: 1.6 },
    { left: "50%", ex: "10px", ey: "-60px", delay: 1.7 },
    { left: "30%", ex: "-45px", ey: "-20px", delay: 1.65 },
    { left: "70%", ex: "45px", ey: "-25px", delay: 1.75 },
];

export function Kurohitsugi({ phase }: { phase: PhenomenonPhase }) {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {PILLARS.map((p, i) => (
                <div
                    key={i}
                    className="bdph-anim absolute"
                    style={{
                        left: p.left,
                        [p.top ? "top" : "bottom"]: "10%",
                        width: p.w,
                        height: `${p.h}%`,
                        transformOrigin: p.top ? "top" : "bottom",
                        background:
                            "repeating-linear-gradient(180deg, #050505 0px, #050505 14px, #0d0d10 14px, #0d0d10 16px)",
                        boxShadow: "0 0 18px 2px rgba(217,97,76,0.55), inset 0 0 8px rgba(0,0,0,0.8)",
                        border: "1px solid rgba(217,97,76,0.5)",
                        animation:
                            phase === "entrance"
                                ? `bdph-pillar-rise 0.7s cubic-bezier(0.2,0.9,0.3,1) ${p.delay}s both, bdph-pillar-settle 1.4s ease-out ${p.delay + 0.7}s both`
                                : "bdph-pillar-flicker 5s ease-in-out infinite",
                    }}
                />
            ))}

            {/* thin glowing seal lines connecting the pillars — the "kido
                construction lines" of the coffin */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <rect
                    x="12" y="14" width="76" height="72"
                    fill="none"
                    stroke="#d9614c"
                    strokeWidth="0.25"
                    strokeDasharray="300"
                    className="bdph-anim"
                    style={{
                        opacity: phase === "entrance" ? 1 : 0.15,
                        animation:
                            phase === "entrance"
                                ? "bdph-pillar-seal-line 1.1s ease-out 0.2s both"
                                : undefined,
                        transition: "opacity 1.2s ease-out",
                    }}
                />
            </svg>

            {/* shatter embers — fire once during entrance, then gone */}
            {phase === "entrance" &&
                EMBERS.map((e, i) => (
                    <span
                        key={i}
                        className="bdph-anim absolute bottom-1/2 w-1 h-1 rounded-sm"
                        style={
                            {
                                left: e.left,
                                background: "#f2cf8a",
                                boxShadow: "0 0 6px 1px rgba(242,207,138,0.9)",
                                "--bdph-ex": e.ex,
                                "--bdph-ey": e.ey,
                                animation: `bdph-ember-burst 0.6s ease-out ${e.delay}s forwards`,
                            } as React.CSSProperties
                        }
                    />
                ))}
        </div>
    );
}