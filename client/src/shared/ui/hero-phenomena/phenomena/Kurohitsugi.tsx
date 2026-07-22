// src/shared/ui/hero-phenomena/phenomena/Kurohitsugi.tsx
"use client";

import { useMemo, type CSSProperties } from "react";
import type { PhenomenonPhase } from "../constants";

const SUCK_EASE = "cubic-bezier(0.6, -0.28, 0.735, 0.045)";
const SLAM_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// ── Timeline (seconds, entrance only) ───────────────────────────────────
const T_RING_START = 0.15;
const T_BOX_START = 0.9;
const T_PIERCE_START = 1.05;
const T_SHAKE_START = 1.55;
const T_SHATTER_START = 1.65;

type PillarDef = { left: string; w: number; h: number; delay: number; dur: number; fdelay: number; base: number; top?: boolean };

const PILLARS: PillarDef[] = [
    { left: "3%", w: 12, h: 78, delay: 0.02, dur: 4.4, fdelay: 0.1, base: 4 },
    { left: "9.5%", w: 6, h: 58, delay: 0.16, dur: 3.8, fdelay: 0.5, base: 14 },
    { left: "16%", w: 8, h: 68, delay: 0.07, dur: 4.1, fdelay: 0.2, base: -3 },
    { left: "22.5%", w: 5, h: 44, delay: 0.24, dur: 3.5, fdelay: 0.8, base: 9 },
    { left: "77.5%", w: 5, h: 46, delay: 0.11, dur: 3.9, fdelay: 0.35, base: -6 },
    { left: "84%", w: 8, h: 66, delay: 0.28, dur: 4.2, fdelay: 0.05, base: 11 },
    { left: "90.5%", w: 6, h: 56, delay: 0.04, dur: 3.6, fdelay: 0.65, base: 2 },
    { left: "97%", w: 12, h: 80, delay: 0.19, dur: 4.5, fdelay: 0.4, base: -8 },
    { left: "38%", w: 5, h: 32, delay: 0.34, dur: 3.3, fdelay: 0.15, base: 6, top: true },
    { left: "48%", w: 6, h: 38, delay: 0.4, dur: 3.7, fdelay: 0.7, base: -4, top: true },
    { left: "58%", w: 5, h: 30, delay: 0.3, dur: 3.4, fdelay: 0.45, base: 10, top: true },
    { left: "68%", w: 4, h: 26, delay: 0.44, dur: 3.1, fdelay: 0.9, base: -7, top: true },
];

const VORTEX_PARTICLES = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 240 + (i % 3) * 60;
    return {
        vx: `${Math.cos(angle) * dist}px`,
        vy: `${Math.sin(angle) * dist}px`,
        delay: (i % 5) * 0.04,
        size: 3 + (i % 3),
    };
});

const EMBERS = [
    { left: "8%", ex: "60px", ey: "-40px", delay: 1.4 },
    { left: "18%", ex: "-30px", ey: "50px", delay: 1.55 },
    { left: "86%", ex: "-55px", ey: "-30px", delay: 1.45 },
    { left: "92%", ex: "40px", ey: "45px", delay: 1.6 },
    { left: "50%", ex: "10px", ey: "-60px", delay: 1.7 },
    { left: "30%", ex: "-45px", ey: "-20px", delay: 1.65 },
    { left: "70%", ex: "45px", ey: "-25px", delay: 1.75 },
];

const SWORDS = [
    { angle: 42, len: 130, delay: 0.0 },
    { angle: -38, len: 125, delay: 0.05 },
    { angle: 12, len: 140, delay: 0.03 },
    { angle: -15, len: 135, delay: 0.09 },
    { angle: 75, len: 110, delay: 0.07 },
    { angle: -70, len: 112, delay: 0.12 },
    { angle: 4, len: 145, delay: 0.14 },
    { angle: -50, len: 120, delay: 0.02 },
];

// ✨ อัปเกรดเศษเสี้ยวสะบัดเต็มจอ: เพิ่มเป็น 64 ชิ้น กระจายรัศมีกว้างสะใจทะลุไปถึง 500px - 1850px
// เพื่อไม่ให้โดนปุ่ม Hero CTA ทับ และระเบิดแผ่ขยายออกไปเต็มหน้าจออย่างแท้จริงตามที่ย้ำมาครับ
const FRAGMENTS = Array.from({ length: 64 }, (_, i) => {
    const deg = (i / 64) * 360 + (i % 4) * 22.5;
    // ดัน Dist เริ่มต้นที่ 500px แล้วยืดออกไปสูงสุดถึง 1850px เพื่อกระจายอิมแพคออกไปทั่วทั้ง Viewport
    const dist = 500 + (i % 8) * 190;
    return {
        // เพิ่มสเกลขนาดชิ้นส่วนให้มีชิ้นใหญ่สูงสุด 19px เพื่อให้เห็นชัดเจนไม่โดนกลืนหายไปกับพื้นหลัง
        size: 3 + (i % 5) * 4,
        fx: `${Math.cos((deg * Math.PI) / 180) * dist}px`,
        fy: `${Math.sin((deg * Math.PI) / 180) * dist}px`,
        frot: `${(i % 2 ? 1 : -1) * (720 + i * 45)}deg`, // หมุนติ้วสะบัดมิติแรงขึ้น 2 เท่า
    };
});

const LIGHTNING_BOLTS = [12, 30, 50, 70, 88];
const CRACK_ANGLES = [0, 60, 120, 180, 240, 300];
const CRACK_STAGGER = [0.0, 0.09, 0.03, 0.14, 0.05, 0.11];

export function Kurohitsugi({ phase }: { phase: PhenomenonPhase }) {
    const entering = phase === "entrance";

    const pillarStyles = useMemo<CSSProperties[]>(
        () =>
            PILLARS.map((p) => ({
                left: p.left,
                [p.top ? "top" : "bottom"]: `${8 + p.base}%`,
                width: p.w,
                height: `${p.h}%`,
                transformOrigin: p.top ? "top" : "bottom",
                background: "repeating-linear-gradient(180deg, #030105 0px, #030105 14px, #0d0716 14px, #0d0716 16px)",
                boxShadow: "0 0 20px 3px rgba(147,51,234,0.5), inset 0 0 10px rgba(0,0,0,0.85)",
                border: "1px solid rgba(168,85,247,0.45)",
                willChange: "transform",
                ["--bdph-py" as string]: p.top ? "-70%" : "65%",
                animation: entering
                    ? `bdph-kh-pillar-slam 0.6s ${SLAM_EASE} ${(0.35 + p.delay).toFixed(2)}s both`
                    : `bdph-kh-pillar-float ${p.dur}s ease-in-out ${p.fdelay}s infinite`,
            }) as CSSProperties),
        [entering]
    );

    const godrayStyles = useMemo<CSSProperties[]>(
        () =>
            PILLARS.map((p) => ({
                background: "linear-gradient(90deg, rgba(168,85,247,0.5), transparent)",
                animation: `bdph-kh-godray ${(p.dur * 0.9).toFixed(2)}s ease-in-out ${p.fdelay}s infinite`,
            })),
        []
    );

    const particleStyles = useMemo<CSSProperties[]>(
        () =>
            VORTEX_PARTICLES.map((p) => ({
                width: p.size,
                height: p.size,
                background: "#c084fc",
                boxShadow: "0 0 8px 2px rgba(168,85,247,0.85)",
                willChange: "transform, opacity",
                ["--vx" as string]: p.vx,
                ["--vy" as string]: p.vy,
                animation: `kh-vortex-particle 0.65s ${SUCK_EASE} ${p.delay}s both`,
            }) as CSSProperties),
        []
    );

    const swordStyles = useMemo<CSSProperties[]>(
        () =>
            SWORDS.map((s) => ({
                width: s.len,
                height: 3,
                left: "50%",
                top: "50%",
                marginLeft: -(s.len / 2),
                marginTop: -1.5,
                background: "linear-gradient(90deg, transparent 0%, #e9d5ff 15%, #a855f7 50%, #e9d5ff 85%, transparent 100%)",
                boxShadow: "0 0 10px 2px rgba(168,85,247,0.9)",
                borderRadius: "2px",
                transformOrigin: "center",
                willChange: "transform, opacity, filter",
                ["--rot" as string]: `${s.angle}deg`,
                transform: `rotate(${s.angle}deg) scaleX(0)`,
                animation: `kh-pierce-in 0.5s cubic-bezier(0.16,1,0.3,1) ${(T_PIERCE_START + s.delay).toFixed(2)}s both, kh-spear-exit 0.38s ease-out ${T_SHATTER_START}s forwards`,
            }) as CSSProperties),
        []
    );

    const fragmentStyles = useMemo<CSSProperties[]>(
        () =>
            FRAGMENTS.map((f) => ({
                width: f.size,
                height: f.size,
                // 🔥 1. เปลี่ยนจาก #0a0410 เป็นสีม่วงสว่างส่องแสง (โทนเดียวกับดาบศักดิ์สิทธิ์)
                background: "#e9d5ff",
                // 🔥 2. เพิ่มความเข้มและสีของขอบให้ชัดเจนขึ้น
                border: "1px solid rgba(192,132,252,1)",
                // 🔥 3. ถ่างแสงออร่ารอบตัวเศษให้ฟุ้งกระจายเห็นชัดๆ แม้วิ่งด้วยความเร็วสูง
                boxShadow: "0 0 12px 3px rgba(168,85,247,0.9)",
                willChange: "transform, opacity",
                opacity: 0,
                transform: "scale(0)",
                ["--fx" as string]: f.fx,
                ["--fy" as string]: f.fy,
                ["--frot" as string]: f.frot,
                animation: `kh-fragment-fly 0.6s cubic-bezier(0.16,1,0.3,1) ${(T_SHATTER_START + 0.02).toFixed(2)}s forwards`,
            }) as CSSProperties),
        []
    );

    const emberStyles = useMemo<CSSProperties[]>(
        () =>
            EMBERS.map((e) => ({
                left: e.left,
                background: "#e9d5ff",
                boxShadow: "0 0 6px 1px rgba(233,213,255,0.9)",
                ["--bdph-ex" as string]: e.ex,
                ["--bdph-ey" as string]: e.ey,
                animation: `bdph-ember-burst 0.6s ease-out ${e.delay}s forwards`,
            }) as CSSProperties),
        []
    );

    const lightningStyles = useMemo<CSSProperties[]>(
        () =>
            LIGHTNING_BOLTS.map((leftPct, i) => ({
                left: `${leftPct}%`,
                background: "linear-gradient(180deg, transparent, #c084fc 35%, #7e22ce 65%, transparent)",
                filter: "drop-shadow(0 0 5px rgba(168,85,247,0.9))",
                willChange: "opacity",
                animation: `bdph-pillar-flicker ${(1.4 + i * 0.35).toFixed(2)}s steps(1,end) ${(i * 0.22).toFixed(2)}s infinite`,
            })),
        []
    );

    const ringStyle = useMemo<CSSProperties>(
        () => ({
            transformOrigin: "50% 50%",
            willChange: "transform, opacity, filter",
            opacity: entering ? undefined : 0.35,
            filter: "drop-shadow(0 0 6px rgba(168,85,247,0.7))",
            animation: entering
                ? `kh-ring-breathe 1.05s ${SLAM_EASE} ${T_RING_START}s both, kh-ring-idle-pulse 2.4s ease-in-out ${(T_RING_START + 1.05).toFixed(2)}s infinite`
                : "kh-ring-idle-pulse 4s ease-in-out infinite",
        }),
        [entering]
    );

    const crackStyles = useMemo<CSSProperties[]>(
        () =>
            CRACK_ANGLES.map((_, i) => ({
                willChange: "opacity, filter, stroke-dashoffset",
                animation: `kh-crack-strike 0.62s ${SLAM_EASE} ${(T_RING_START + 0.5 + CRACK_STAGGER[i]).toFixed(2)}s both, kh-crack-exit 0.38s ease-out ${T_SHATTER_START}s forwards`,
            })),
        []
    );

    return (
        <div
            className="absolute inset-0 overflow-visible bg-[#050308]"
            style={entering ? { animation: `kh-shake 0.35s linear ${T_SHAKE_START}s 1`, willChange: "transform" } : undefined}
        >
            {/* Layer 0: obsidian vortex backdrop */}
            <div
                className="absolute inset-0"
                style={{
                    background: "radial-gradient(circle at 50% 48%, rgba(88,28,135,0.35) 0%, rgba(30,10,50,0.55) 35%, rgba(9,5,17,0.92) 75%, #050208 100%)",
                    transformOrigin: "50% 48%",
                    willChange: "transform, opacity",
                    animation: entering
                        ? `kh-bg-suck-in 0.85s ${SUCK_EASE} both, bdph-kh-bg-pulse 5s ease-in-out 0.85s infinite`
                        : "bdph-kh-bg-pulse 5s ease-in-out infinite",
                }}
            />

            {/* Layer 1: implosion particles */}
            {entering && (
                <div className="absolute left-1/2 top-1/2 w-0 h-0">
                    {VORTEX_PARTICLES.map((_, i) => (
                        <span key={i} className="absolute rounded-full" style={particleStyles[i]} />
                    ))}
                </div>
            )}

            {/* Layer 2: containment ring + crack bleed */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <circle
                    cx="50"
                    cy="50"
                    r="34"
                    fill="none"
                    stroke="#a855f7"
                    style={{ ...ringStyle, transformBox: "fill-box" }}
                />
                {entering &&
                    CRACK_ANGLES.map((deg, i) => (
                        <line
                            key={i}
                            x1="50" y1="50"
                            x2={50 + Math.cos((deg * Math.PI) / 180) * 46}
                            y2={50 + Math.sin((deg * Math.PI) / 180) * 46}
                            stroke="#7e22ce" strokeWidth="0.35" strokeDasharray="220"
                            style={{
                                ...crackStyles[i],
                                transformBox: "fill-box"
                            }}
                        />
                    ))}
            </svg>

            {/* Layer 2.5: black box enclosure */}
            {entering && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        inset: "12% 22%",
                        borderRadius: "6px",
                        background: "linear-gradient(135deg, #050108 0%, #0e0416 45%, #030005 100%)",
                        border: "1px solid rgba(168,85,247,0.55)",
                        boxShadow: "0 0 40px 8px rgba(88,28,135,0.65), inset 0 0 30px rgba(0,0,0,0.9)",
                        transformOrigin: "50% 50%",
                        willChange: "transform, opacity",
                        animation: `kh-box-seal 0.5s ${SLAM_EASE} ${T_BOX_START}s both, kh-box-face-flicker 0.4s steps(2,end) ${T_PIERCE_START}s 1, kh-shatter-fade-out 0.2s ease-in ${T_SHATTER_START}s forwards`,
                    }}
                />
            )}

            {/* Layer 2.6: piercing swords */}
            {entering && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {SWORDS.map((_, i) => (
                        <span key={i} className="absolute" style={swordStyles[i]} />
                    ))}
                </div>
            )}

            {/* Layer 2.7: shatter flash + fragments */}
            {entering && (
                <>
                    <div
                        className="absolute left-1/2 top-1/2 rounded-full"
                        style={{
                            width: 260, height: 260, marginLeft: -130, marginTop: -130,
                            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(233,213,255,0.85) 25%, rgba(168,85,247,0.55) 55%, transparent 78%)",
                            willChange: "transform, opacity",
                            animation: `kh-shatter-flash 0.5s cubic-bezier(0.16,1,0.3,1) ${T_SHATTER_START}s both`,
                        }}
                    />
                    {FRAGMENTS.map((_, i) => (
                        <span key={i} className="absolute left-1/2 top-1/2" style={fragmentStyles[i]} />
                    ))}
                </>
            )}

            {/* Layer 3: monoliths */}
            {PILLARS.map((_, i) => (
                <div key={i} className="absolute" style={pillarStyles[i]}>
                    {!entering && <span className="absolute inset-y-0 -right-2 w-2" style={godrayStyles[i]} />}
                </div>
            ))}

            {/* Layer 4: reiatsu lightning */}
            <div className="absolute inset-0">
                {LIGHTNING_BOLTS.map((_, i) => (
                    <span key={i} className="absolute top-[10%] bottom-[10%] w-[1.5px]" style={lightningStyles[i]} />
                ))}
            </div>

            {/* Layer 5: shatter embers */}
            {entering &&
                EMBERS.map((_, i) => (
                    <span key={i} className="absolute bottom-1/2 w-1 h-1 rounded-sm" style={emberStyles[i]} />
                ))}

            {/* Layer 6: crushing vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(circle at 50% 50%, transparent 30%, rgba(3,1,5,0.55) 85%, rgba(3,1,5,0.85) 100%)",
                    transformOrigin: "50% 50%",
                    willChange: entering ? "transform, opacity" : undefined,
                    animation: entering ? `kh-vignette-crush 1s ${SLAM_EASE} both` : undefined,
                }}
            />
        </div>
    );
}

export default Kurohitsugi;