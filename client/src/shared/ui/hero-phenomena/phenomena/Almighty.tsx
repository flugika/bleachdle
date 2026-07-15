// src/shared/ui/hero-phenomena/phenomena/Almighty.tsx
import { useEffect, useRef } from "react";

// Fixed positions across the "sky" band of the hero — deliberately sparse
// and asymmetric (real key-visual compositions never grid things out).
// `depth` scales both size and cursor-tracking strength so back eyes feel
// distant and front eyes feel closer / more aware.
const EYES = [
    { left: "9%", top: "8%", w: 34, depth: 0.6, delay: 0.0, blinkDur: 7.5, opacity: 0.32 },
    { left: "22%", top: "18%", w: 20, depth: 0.4, delay: 0.35, blinkDur: 9.2, opacity: 0.22 },
    { left: "78%", top: "10%", w: 40, depth: 0.7, delay: 0.15, blinkDur: 6.8, opacity: 0.36 },
    { left: "90%", top: "22%", w: 22, depth: 0.45, delay: 0.55, blinkDur: 8.4, opacity: 0.24 },
    { left: "50%", top: "4%", w: 26, depth: 0.5, delay: 0.25, blinkDur: 10.5, opacity: 0.26 },
    { left: "4%", top: "26%", w: 18, depth: 0.35, delay: 0.7, blinkDur: 11.2, opacity: 0.18 },
    { left: "96%", top: "34%", w: 16, depth: 0.3, delay: 0.85, blinkDur: 12.6, opacity: 0.16 },
    { left: "36%", top: "12%", w: 46, depth: 0.85, delay: 0.05, blinkDur: 6.0, opacity: 0.42 },
    { left: "64%", top: "16%", w: 30, depth: 0.55, delay: 0.45, blinkDur: 8.8, opacity: 0.3 },
];

function Eye({ e }: { e: (typeof EYES)[number] }) {
    return (
        <span
            className="bdph-anim absolute"
            style={
                {
                    left: e.left,
                    top: e.top,
                    width: e.w,
                    height: e.w * 0.56,
                    transformOrigin: "center",
                    "--bdph-eye-o": e.opacity,
                    animation: `bdph-eye-open 0.9s cubic-bezier(0.2,0.9,0.3,1) ${e.delay}s both, bdph-eye-drift ${8 + e.depth * 6}s ease-in-out ${e.delay}s infinite, bdph-eye-blink ${e.blinkDur}s ease-in-out ${e.delay + 1.2}s infinite`,
                } as React.CSSProperties
            }
        >
            <svg viewBox="0 0 100 56" className="w-full h-full overflow-visible">
                {/* almond sclera */}
                <path
                    d="M2,28 Q50,-6 98,28 Q50,62 2,28 Z"
                    fill="#0a0402"
                    stroke="#c8a96e"
                    strokeWidth="1.4"
                    opacity="0.9"
                />
                {/* iris — nudged by CSS vars set from mousemove on the wrapper */}
                <g
                    style={{
                        transform: `translate(calc(var(--bdph-mx, 0) * ${6 * e.depth}px), calc(var(--bdph-my, 0) * ${4 * e.depth}px))`,
                    }}
                >
                    <circle cx="50" cy="28" r="13" fill="#3a0d0d" stroke="#d9614c" strokeWidth="1" />
                    <circle cx="50" cy="28" r="5.5" fill="#0a0000" />
                    <circle cx="47" cy="25" r="1.6" fill="#f2cf8a" opacity="0.8" />
                </g>
            </svg>
        </span>
    );
}

export function Almighty() {
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (!wrapRef.current) return;
            const mx = (e.clientX / window.innerWidth - 0.5) * 2;
            const my = (e.clientY / window.innerHeight - 0.5) * 2;
            wrapRef.current.style.setProperty("--bdph-mx", mx.toFixed(3));
            wrapRef.current.style.setProperty("--bdph-my", my.toFixed(3));
        };
        window.addEventListener("mousemove", handle);
        return () => window.removeEventListener("mousemove", handle);
    }, []);

    return (
        <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
            {/* dim the sky slightly so the eyes have somewhere to sit */}
            <div
                className="absolute inset-x-0 top-0 h-[42vh]"
                style={{ background: "linear-gradient(180deg, rgba(20,4,4,0.35), transparent)" }}
            />
            {EYES.map((e, i) => (
                <Eye key={i} e={e} />
            ))}
        </div>
    );
}