"use client";

import { useId } from "react";

const GOLD = "#c8a96e";
const GOLD_BRIGHT = "#f2cf8a";
const CREAM = "#e8e2d0";
const VOID = "#040307";

export interface ZeroDivisionIconProps {
    className?: string;
    size?: number | string;
    animated?: boolean;
    glowColor?: string;
}

export function ZeroDivisionIcon({
    className,
    size = 48,
    animated = true,
    glowColor = "rgba(234, 179, 8, 0.85)",
}: ZeroDivisionIconProps) {
    const uid = useId().replace(/:/g, "");
    const coreGlowId = `zdi-core-${uid}`;
    const softGlowId = `zdi-glow-${uid}`;
    const inkSplashId = `zdi-ink-${uid}`;

    const dimension = typeof size === "number" ? `${size}px` : size;

    return (
        <svg
            viewBox="0 0 100 100"
            width={dimension}
            height={dimension}
            className={className}
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})`, overflow: "visible" }}
            aria-hidden="true"
        >
            <defs>
                {/* 1. Core Glowing Gradients */}
                <radialGradient id={coreGlowId} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={GOLD_BRIGHT} stopOpacity="0.8" />
                    <stop offset="50%" stopColor={GOLD} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                </radialGradient>

                {/* 2. Soft Glow Filter for the Kanji */}
                <filter id={softGlowId} x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* 3. INK SPLASH FILTER: Creates the rough, bleeding brush effect */}
                <filter id={inkSplashId} x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="4" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </defs>

            {/* --- BACKGROUND RINGS --- */}
            {/* Shimenawa outer ring */}
            <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={CREAM}
                strokeWidth="1.2"
                strokeDasharray="1.5 3 8 3"
                opacity="0.4"
                className={animated ? "zdi-spin-slow" : undefined}
                style={{ transformOrigin: "50px 50px" }}
            />

            {/* Kido rune ring */}
            <circle
                cx="50"
                cy="50"
                r="39"
                fill="none"
                stroke={GOLD}
                strokeWidth="0.8"
                strokeDasharray="1 3"
                opacity="0.5"
                className={animated ? "zdi-spin-rev" : undefined}
                style={{ transformOrigin: "50px 50px" }}
            />

            {/* Radiant core aura behind the ink */}
            <circle
                cx="50"
                cy="50"
                r="38"
                fill={`url(#${coreGlowId})`}
                className={animated ? "zdi-pulse" : undefined}
            />

            {/* --- INK BRUSH SPLASH (The Core) --- */}
            <g filter={`url(#${inkSplashId})`} className={animated ? "zdi-ink-breathe" : undefined}>
                {/* Main ink blob */}
                <path
                    d="M 50 18 C 30 15, 18 30, 20 50 C 22 72, 35 85, 52 82 C 70 80, 83 65, 80 48 C 78 30, 68 20, 50 18 Z"
                    fill={VOID}
                />
                {/* Brush streaks to make it look like it was painted rapidly */}
                <path d="M 25 40 Q 50 25 75 45" stroke={VOID} strokeWidth="10" strokeLinecap="round" fill="none" />
                <path d="M 35 70 Q 55 85 70 65" stroke={VOID} strokeWidth="8" strokeLinecap="round" fill="none" />
                <path d="M 20 60 Q 30 75 50 78" stroke={VOID} strokeWidth="6" strokeLinecap="round" fill="none" />

                {/* Ink spatters (scattered dots) */}
                <circle cx="22" cy="32" r="3" fill={VOID} />
                <circle cx="78" cy="62" r="4" fill={VOID} />
                <circle cx="72" cy="28" r="2.5" fill={VOID} />
                <circle cx="32" cy="78" r="3.5" fill={VOID} />
                <circle cx="15" cy="50" r="2" fill={VOID} />
            </g>

            {/* Golden inner rim around the ink */}
            <circle cx="50" cy="50" r="31" fill="none" stroke={GOLD} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.6" />

            {/* --- MASSIVE CENTRAL KANJI --- */}
            <text
                x="50"
                y="52.5"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="38"
                fontFamily="'Shippori Mincho', 'Noto Serif JP', serif"
                fill={CREAM}
                filter={`url(#${softGlowId})`}
                className={animated ? "zdi-kanji-breathe" : undefined}
            >
                零
            </text>

            {/* --- REISHI SPARKS --- */}
            {animated &&
                [45, 135, 225, 315].map((a, i) => {
                    const rad = (a * Math.PI) / 180;
                    const x1 = 50 + 38 * Math.cos(rad);
                    const y1 = 50 + 38 * Math.sin(rad);
                    const x2 = 50 + 46 * Math.cos(rad);
                    const y2 = 50 + 46 * Math.sin(rad);
                    return (
                        <line
                            key={a}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={GOLD_BRIGHT}
                            strokeWidth="1"
                            strokeLinecap="round"
                            className="zdi-spark"
                            style={{ animationDelay: `${i * 0.35}s` }}
                        />
                    );
                })}
        </svg>
    );
}

export default ZeroDivisionIcon;