// src/features/support/KidoSeal.tsx
"use client";

import React from "react";

interface KidoSealProps {
    size?: number;
    color?: string;
    className?: string;
}

// Generic elemental glyphs — not tied to any specific copyrighted incantation,
// just a decorative "kido circle" vocabulary (fire / water / wind / thunder / light / dark).
const GLYPHS = ["火", "水", "風", "雷", "光", "闇"];

// A layered, self-animating Kido seal: a breathing aura, three rings spinning
// at different speeds/directions, a glyph band, and twinkling sparks.
// All animation is defined locally via styled-jsx so it doesn't depend on
// any global stylesheet — drop this component in anywhere and it just works.
export function KidoSeal({ size = 340, color = "#c8a96e", className = "" }: KidoSealProps) {
    const sparkPositions = Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return {
            left: 50 + 40 * Math.cos(angle),
            top: 50 + 40 * Math.sin(angle),
            delay: i * 0.3,
        };
    });

    return (
        <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}
            aria-hidden="true"
        >
            {/* Breathing aura glow behind everything */}
            <div
                className="kido-aura absolute rounded-full"
                style={{
                    width: size * 0.95,
                    height: size * 0.95,
                    background: `radial-gradient(circle, ${color}30 0%, ${color}00 72%)`,
                }}
            />

            {/* Outermost hairline ring — slow, faint drift */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 200 200"
                className="kido-spin-slow absolute"
                style={{ position: "absolute", filter: `drop-shadow(0 0 6px ${color}55)` }}
            >
                <defs>
                    <linearGradient id="kido-fade" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.05" />
                        <stop offset="50%" stopColor={color} stopOpacity="0.55" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="94" fill="none" stroke="url(#kido-fade)" strokeWidth="1.2" />
            </svg>

            {/* Tick ring — rotates clockwise */}
            <svg
                width={size * 0.86}
                height={size * 0.86}
                viewBox="0 0 200 200"
                className="kido-spin-cw absolute"
                style={{ position: "absolute", filter: `drop-shadow(0 0 7px ${color}70)` }}
            >
                <circle cx="100" cy="100" r="80" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="2 10" />
                {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * 360;
                    return (
                        <line
                            key={i}
                            x1="100"
                            y1="12"
                            x2="100"
                            y2="24"
                            stroke={color}
                            strokeOpacity="0.55"
                            strokeWidth="1.5"
                            transform={`rotate(${angle} 100 100)`}
                        />
                    );
                })}
            </svg>

            {/* Glyph band — rotates counter-clockwise, opposite the tick ring */}
            <svg
                width={size * 0.72}
                height={size * 0.72}
                viewBox="0 0 200 200"
                className="kido-spin-ccw absolute"
                style={{ position: "absolute" }}
            >
                <circle cx="100" cy="100" r="66" fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="1 14" />
                {GLYPHS.map((g, i) => {
                    const angle = (i / GLYPHS.length) * 360 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const x = 100 + 66 * Math.cos(rad);
                    const y = 100 + 66 * Math.sin(rad);
                    return (
                        <text
                            key={g}
                            x={x}
                            y={y}
                            fill={color}
                            fillOpacity="0.6"
                            fontSize="10"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fontFamily: "'Cinzel', serif" }}
                        >
                            {g}
                        </text>
                    );
                })}
            </svg>

            {/* Innermost ring — pulses rather than spins, like a held breath */}
            <svg
                width={size * 0.54}
                height={size * 0.54}
                viewBox="0 0 200 200"
                className="kido-pulse absolute"
                style={{ position: "absolute", filter: `drop-shadow(0 0 8px ${color}80)` }}
            >
                <circle cx="100" cy="100" r="52" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="14 6" />
            </svg>

            {/* Twinkling sparks orbiting the seal */}
            {sparkPositions.map((s, i) => (
                <span
                    key={i}
                    className="kido-sparkle absolute rounded-full"
                    style={{
                        left: `${s.left}%`,
                        top: `${s.top}%`,
                        width: 3,
                        height: 3,
                        background: color,
                        boxShadow: `0 0 8px 1px ${color}`,
                        animationDelay: `${s.delay}s`,
                    }}
                />
            ))}
        </div>
    );
}