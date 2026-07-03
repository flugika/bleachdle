// src/features/support/KidoSeal.tsx
"use client";

import React from "react";

interface KidoSealProps {
    size?: number;
    color?: string;
    className?: string;
}

// A dual-layer rotating Kido seal (two rings spinning opposite directions) —
// used as a backdrop for the QR code or any other focal point. Built
// standalone rather than reusing the project's existing loader, since that
// component's internal structure isn't visible here.
export function KidoSeal({ size = 340, color = "#c8a96e", className = "" }: KidoSealProps) {
    return (
        <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className}`}
            aria-hidden="true"
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 200 200"
                className="kido-ring-glow"
                style={{ position: "absolute" }}
            >
                <circle
                    cx="100"
                    cy="100"
                    r="92"
                    fill="none"
                    stroke={color}
                    strokeOpacity="0.15"
                    strokeWidth="1"
                />
            </svg>

            <svg
                width={size * 0.86}
                height={size * 0.86}
                viewBox="0 0 200 200"
                className="kido-ring-outer"
                style={{ position: "absolute" }}
            >
                <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke={color}
                    strokeOpacity="0.35"
                    strokeWidth="1"
                    strokeDasharray="2 10"
                />
                {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * 360;
                    return (
                        <line
                            key={i}
                            x1="100"
                            y1="14"
                            x2="100"
                            y2="24"
                            stroke={color}
                            strokeOpacity="0.5"
                            strokeWidth="1.5"
                            transform={`rotate(${angle} 100 100)`}
                        />
                    );
                })}
            </svg>

            <svg
                width={size * 0.7}
                height={size * 0.7}
                viewBox="0 0 200 200"
                className="kido-ring-inner"
                style={{ position: "absolute" }}
            >
                <circle
                    cx="100"
                    cy="100"
                    r="68"
                    fill="none"
                    stroke={color}
                    strokeOpacity="0.25"
                    strokeWidth="1"
                    strokeDasharray="14 6"
                />
            </svg>
        </div>
    );
}