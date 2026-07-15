// src/shared/ui/hero-phenomena/phenomena/ZeroDivision.tsx
import type { PhenomenonPhase } from "../constants";

// Five brush strokes, one per Zero Division member, converging into a
// single seal — drawn in sequence rather than all at once, so it reads as
// a ritual being performed, not a shape appearing.
const BRUSH_PATHS = [
    "M 100,20 Q 150,40 160,100",
    "M 180,100 Q 160,150 100,180",
    "M 100,180 Q 40,160 20,100",
    "M 20,100 Q 40,50 90,25",
    "M 100,45 Q 100,100 100,155",
];

const WISPS = [
    { left: "38%", top: "34%", size: 60, wx: "18px", wy: "-10px", dur: 9 },
    { left: "62%", top: "58%", size: 46, wx: "-14px", wy: "12px", dur: 11 },
    { left: "50%", top: "70%", size: 70, wx: "10px", wy: "14px", dur: 8 },
    { left: "30%", top: "62%", size: 40, wx: "-16px", wy: "-8px", dur: 12 },
];

export function ZeroDivision({ phase }: { phase: PhenomenonPhase }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {/* ink bloom wash behind the seal */}
            <div
                className="bdph-anim absolute w-[52vw] h-[52vw] max-w-[620px] max-h-[620px] rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(200,169,110,0.10), transparent 68%)",
                    animation: phase === "entrance" ? "bdph-ink-bloom 1.6s ease-out forwards" : undefined,
                }}
            />

            {/* drifting ink wisps */}
            {WISPS.map((w, i) => (
                <span
                    key={i}
                    className="bdph-anim absolute rounded-full blur-2xl"
                    style={
                        {
                            left: w.left,
                            top: w.top,
                            width: w.size,
                            height: w.size,
                            background: "rgba(232,226,208,0.10)",
                            "--bdph-wx": w.wx,
                            "--bdph-wy": w.wy,
                            animation: `bdph-ink-wisp ${w.dur}s ease-in-out infinite`,
                        } as React.CSSProperties
                    }
                />
            ))}

            {/* the seal — five brush strokes + two rotating rings, reusing
                the page's kido-ring visual language but in ink white/gold */}
            <svg
                viewBox="0 0 200 200"
                className="relative w-[46vw] h-[46vw] max-w-[540px] max-h-[540px]"
            >
                <g
                    className="bdph-anim"
                    style={{
                        transformOrigin: "100px 100px",
                        animation: "bdph-ink-seal-spin 40s linear infinite",
                    }}
                >
                    <circle cx="100" cy="100" r="94" fill="none" stroke="#e8e2d0" strokeWidth="0.4" strokeDasharray="1 3" opacity="0.3" />
                </g>
                <g
                    className="bdph-anim"
                    style={{
                        transformOrigin: "100px 100px",
                        animation: "bdph-ink-seal-spin-rev 60s linear infinite",
                    }}
                >
                    <circle cx="100" cy="100" r="82" fill="none" stroke="#c8a96e" strokeWidth="0.3" strokeDasharray="10 6" opacity="0.35" />
                </g>

                {BRUSH_PATHS.map((d, i) => (
                    <path
                        key={i}
                        d={d}
                        fill="none"
                        stroke="#e8e2d0"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        className="bdph-anim"
                        style={
                            {
                                opacity: phase === "entrance" ? undefined : 0.5,
                                "--bdph-dash": 260,
                                strokeDasharray: 260,
                                animation:
                                    phase === "entrance"
                                        ? `bdph-ink-brush 0.9s ease-out ${0.15 * i}s both`
                                        : undefined,
                            } as React.CSSProperties
                        }
                    />
                ))}

                <circle cx="100" cy="100" r="5" fill="#c8a96e" opacity="0.6" />
            </svg>
        </div>
    );
}