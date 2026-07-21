"use client";

import React, { useEffect, useRef, useCallback } from "react";

// ════════════════════════════════════════════════════════════════════════
// AlmightyShadowEyes.tsx — Optimized UX/UI Version
// ────────────────────────────────────────────────────────────────────────
// 1. Black Overlay Tune: 85% - 90% Opacity for text readability.
// 2. Subdued Wandenreich: 2% - 4% Opacity & 3x Slower rotation.
// 3. Shadow Clipping Fixed: Separate outer shadow pass before clip.
// ════════════════════════════════════════════════════════════════════════

export type AlmightyPhase = "entrance" | "idle";

export interface AlmightyShadowEyesProps {
    eyeCount?: number;
    interactive?: boolean;
    className?: string;
    width?: number | string;
    height?: number | string;
    phase?: AlmightyPhase;
}

function mulberry32(seed: number) {
    let a = seed;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface BlobShape {
    lobes: number;
    radiusJitter: number[];
    angleJitter: number[];
}

function makeBlob(rand: () => number, lobes: number, irregularity: number): BlobShape {
    const radiusJitter: number[] = [];
    const angleJitter: number[] = [];
    for (let i = 0; i < lobes; i++) {
        radiusJitter.push(1 - irregularity + rand() * irregularity * 2);
        angleJitter.push((rand() - 0.5) * (Math.PI / lobes) * 1.1);
    }
    return { lobes, radiusJitter, angleJitter };
}

function traceBlob(
    ctx: CanvasRenderingContext2D,
    blob: BlobShape,
    rx: number,
    ry: number,
    offX = 0,
    offY = 0
) {
    const n = blob.lobes;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + blob.angleJitter[i];
        const rj = blob.radiusJitter[i];
        pts.push({
            x: offX + Math.cos(angle) * rx * rj,
            y: offY + Math.sin(angle) * ry * rj,
        });
    }
    ctx.beginPath();
    const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
    });
    const start = mid(pts[n - 1], pts[0]);
    ctx.moveTo(start.x, start.y);
    for (let i = 0; i < n; i++) {
        const cur = pts[i];
        const next = pts[(i + 1) % n];
        const m = mid(cur, next);
        ctx.quadraticCurveTo(cur.x, cur.y, m.x, m.y);
    }
    ctx.closePath();
}

interface EyeDef {
    nx: number;
    ny: number;
    rx: number;
    ry: number;

    scleraShape: BlobShape;
    pupilShape: BlobShape;
    pupilAreaRatio: number;
    pupilRotation: number;

    blinkPeriod: number;
    blinkPhase: number;
    blinkDuration: number;

    driftFreqX: number;
    driftFreqY: number;
    driftPhase: number;

    curOffX: number;
    curOffY: number;

    entranceGroup: 0 | 1 | 2;
    entranceDelayMs: number;
    entranceDurationMs: number;

    index: number;
}

const ENTRANCE_GROUP0_LEAD_MS = 0;
const ENTRANCE_GROUP0_DUR_MS = 420;
const ENTRANCE_PAUSE_MS = 300;
const ENTRANCE_GROUP1_START_MS = ENTRANCE_GROUP0_DUR_MS + ENTRANCE_PAUSE_MS;
const ENTRANCE_GROUP1_DUR_MS = 320;
const ENTRANCE_GROUP1_SPAN_MS = 300;
const ENTRANCE_GROUP2_START_MS = ENTRANCE_GROUP1_START_MS + ENTRANCE_GROUP1_SPAN_MS + 180;
const ENTRANCE_GROUP2_SPAN_MS = 600;
const ENTRANCE_GROUP2_DUR_MS = 380;

function easeOutCubic(x: number) {
    return 1 - Math.pow(1 - x, 3);
}
function easeOutBack(x: number) {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
function easeInOutQuad(x: number) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function blinkEnvelope(bp: number): number {
    const CLOSE_END = 0.35;
    const HOLD_END = 0.48;
    if (bp < CLOSE_END) return easeOutCubic(bp / CLOSE_END);
    if (bp < HOLD_END) return 1;
    const openP = (bp - HOLD_END) / (1 - HOLD_END);
    return Math.max(0, 1 - easeInOutQuad(openP));
}

function buildEyeCluster(requestedCount: number): EyeDef[] {
    const rand = mulberry32(1337);
    const eyes: EyeDef[] = [];

    const anchors = [
        { x: 0.12, y: 0.18, spread: 0.12 },
        { x: 0.88, y: 0.18, spread: 0.12 },
        { x: 0.08, y: 0.50, spread: 0.14 },
        { x: 0.92, y: 0.50, spread: 0.14 },
        { x: 0.15, y: 0.80, spread: 0.13 },
        { x: 0.85, y: 0.80, spread: 0.13 },
        { x: 0.50, y: 0.08, spread: 0.10 },
        { x: 0.50, y: 0.90, spread: 0.10 },
        { x: 0.28, y: 0.25, spread: 0.10 },
        { x: 0.72, y: 0.25, spread: 0.10 },
    ];

    const placed: { nx: number; ny: number; rx: number; ry: number }[] = [];
    const MAX_ATTEMPTS = 60;

    for (let i = 0; i < requestedCount; i++) {
        const isBig = i < 3;
        const scale = isBig ? 0.82 + rand() * 0.3 : 0.36 + rand() * 0.38;
        const rx = 0.08 * scale;
        const ry = rx * (0.52 + rand() * 0.12);

        let placedOk = false;
        let nx = 0.5;
        let ny = 0.5;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const anchor = anchors[(i + attempt) % anchors.length];
            const a = rand() * Math.PI * 2;
            const d = rand() * anchor.spread;
            const cx = Math.min(0.94, Math.max(0.06, anchor.x + Math.cos(a) * d));
            const cy = Math.min(0.92, Math.max(0.08, anchor.y + Math.sin(a) * d * 0.85));

            let overlap = false;
            for (const p of placed) {
                const dist = Math.hypot(cx - p.nx, (cy - p.ny) * 1.6);
                const minDist = (rx + p.rx) + 0.045;
                if (dist < minDist) {
                    overlap = true;
                    break;
                }
            }

            if (!overlap) {
                nx = cx;
                ny = cy;
                placedOk = true;
                break;
            }
        }

        if (!placedOk) continue;

        placed.push({ nx, ny, rx, ry });

        const scleraLobes = 9 + Math.floor(rand() * 3);
        const pupilLobes = 7 + Math.floor(rand() * 3);
        const pupilAreaRatio = 0.10 + rand() * 0.08;

        eyes.push({
            nx,
            ny,
            rx,
            ry,
            scleraShape: makeBlob(rand, scleraLobes, 0.15),
            pupilShape: makeBlob(rand, pupilLobes, 0.20),
            pupilAreaRatio,
            pupilRotation: (rand() - 0.5) * 0.4,
            blinkPeriod: 3.5 + rand() * 5.5,
            blinkPhase: rand() * 10,
            blinkDuration: 0.14 + rand() * 0.08,
            driftFreqX: 0.15 + rand() * 0.25,
            driftFreqY: 0.12 + rand() * 0.22,
            driftPhase: rand() * Math.PI * 2,
            curOffX: 0,
            curOffY: 0,
            entranceGroup: 0,
            entranceDelayMs: 0,
            entranceDurationMs: ENTRANCE_GROUP0_DUR_MS,
            index: eyes.length,
        });
    }

    const order = [...eyes].sort((a, b) => Math.max(b.rx, b.ry) - Math.max(a.rx, a.ry));
    const leadN = Math.min(2, order.length);
    const group1N = Math.min(4, Math.max(2, Math.round(order.length * 0.25)));

    order.forEach((eye, idx) => {
        if (idx < leadN) {
            eye.entranceGroup = 0;
            eye.entranceDelayMs = ENTRANCE_GROUP0_LEAD_MS + idx * 90;
            eye.entranceDurationMs = ENTRANCE_GROUP0_DUR_MS;
        } else if (idx < leadN + group1N) {
            const k = idx - leadN;
            eye.entranceGroup = 1;
            eye.entranceDelayMs =
                ENTRANCE_GROUP1_START_MS + (k / Math.max(1, group1N - 1)) * ENTRANCE_GROUP1_SPAN_MS;
            eye.entranceDurationMs = ENTRANCE_GROUP1_DUR_MS;
        } else {
            const remaining = order.length - (leadN + group1N);
            const k = idx - leadN - group1N;
            eye.entranceGroup = 2;
            eye.entranceDelayMs =
                ENTRANCE_GROUP2_START_MS + (k / Math.max(1, remaining - 1)) * ENTRANCE_GROUP2_SPAN_MS;
            eye.entranceDurationMs = ENTRANCE_GROUP2_DUR_MS;
        }
    });

    return eyes;
}

export const AlmightyShadowEyes: React.FC<AlmightyShadowEyesProps> = ({
    eyeCount = 10,
    interactive = true,
    className,
    width = "100%",
    height = "100%",
    phase = "idle",
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const eyesRef = useRef<EyeDef[]>([]);
    const mouseRef = useRef({ x: 0, y: 0, active: false });
    const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
    const startRef = useRef<number>(0);
    const phaseRef = useRef<AlmightyPhase>(phase);
    const entranceStartRef = useRef<number>(0);
    const wandenreichImgRef = useRef<HTMLImageElement | null>(null);
    const wandenreichLoadedRef = useRef(false);

    useEffect(() => {
        const now = performance.now();
        startRef.current = now;
        entranceStartRef.current = now;

        const img = new Image();
        img.onload = () => {
            wandenreichLoadedRef.current = true;
        };
        img.src = "/assets/emblems/wandenreich.webp";
        wandenreichImgRef.current = img;
    }, []);

    useEffect(() => {
        eyesRef.current = buildEyeCluster(eyeCount);
    }, [eyeCount]);

    useEffect(() => {
        if (phase === "entrance" && phaseRef.current !== "entrance") {
            entranceStartRef.current = performance.now();
        }
        phaseRef.current = phase;
    }, [phase]);

    const handleResize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        sizeRef.current = { w, h, dpr };
    }, []);

    useEffect(() => {
        handleResize();
        const ro = new ResizeObserver(handleResize);
        if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
        window.addEventListener("resize", handleResize);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", handleResize);
        };
    }, [handleResize]);

    useEffect(() => {
        if (!interactive) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current.x = e.clientX - rect.left;
            mouseRef.current.y = e.clientY - rect.top;
            mouseRef.current.active = true;
        };
        window.addEventListener("mousemove", onMove, { passive: true });
        return () => window.removeEventListener("mousemove", onMove);
    }, [interactive]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const mouseDelta = { dx: 0, dy: 0 };

        const render = (now: number) => {
            const { w, h, dpr } = sizeRef.current;
            if (w === 0 || h === 0) {
                rafRef.current = requestAnimationFrame(render);
                return;
            }
            const t = (now - startRef.current) / 1000;
            const minWH = Math.min(w, h);

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            // ── 1. Base Background Veil (Black Overlay 85% - 90%) ──
            const pulse = 0.96 + Math.sin(t * 0.5) * 0.03;
            const grad = ctx.createRadialGradient(
                w * 0.5, h * 0.4, minWH * 0.05,
                w * 0.5, h * 0.4, Math.max(w, h) * 0.75
            );
            // ปรับความทึบแสง (Opacity) ของฉากหลังดำให้อยู่ในช่วง 85% - 90%
            grad.addColorStop(0, `rgba(12,12,14,${0.85 * pulse})`);
            grad.addColorStop(0.55, `rgba(7,7,9,${0.88 * pulse})`);
            grad.addColorStop(1, "rgba(3,3,4,0.92)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // ── 2. Rotating Wandenreich Emblem Background ──
            if (wandenreichLoadedRef.current && wandenreichImgRef.current) {
                const img = wandenreichImgRef.current;
                const size = Math.max(w, h) * 0.95;
                ctx.save();
                // ลด Opacity เหลือ 2% - 4% (0.02 - 0.04) แบบพริ้วๆ นุ่มนวล
                ctx.globalAlpha = 0.015 + Math.sin(t * 0.3) * 0.005;
                ctx.globalCompositeOperation = "screen";
                ctx.translate(w * 0.5, h * 0.4);
                ctx.rotate(t * 0.02);
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
                ctx.restore();
            }

            // ── 4. Eyes Rendering Loop ──
            const mouse = mouseRef.current;
            const isEntrance = phaseRef.current === "entrance";

            for (const eye of eyesRef.current) {
                let openProgress = 1;
                if (isEntrance) {
                    const elapsed = now - entranceStartRef.current - eye.entranceDelayMs;
                    const raw = Math.max(0, Math.min(1, elapsed / eye.entranceDurationMs));
                    openProgress = eye.entranceGroup === 0 ? easeOutBack(raw) : easeOutCubic(raw);
                    openProgress = Math.max(0, Math.min(1, openProgress));
                    if (elapsed <= 0) continue;
                }

                const cx = eye.nx * w;
                const cy = eye.ny * h;
                const rx = minWH * eye.rx;
                const ry = minWH * eye.ry;

                const jt = t * 0.5 + eye.index * 1.7;
                const ex = cx + Math.sin(jt) * rx * 0.02;
                const ey = cy + Math.cos(jt * 1.3) * ry * 0.02;

                let blinkClose = 0;
                if (!isEntrance || openProgress >= 1) {
                    const cyclePos = ((t + eye.blinkPhase) % eye.blinkPeriod) / eye.blinkPeriod;
                    if (cyclePos < eye.blinkDuration) {
                        const bp = cyclePos / eye.blinkDuration;
                        blinkClose = blinkEnvelope(bp);
                    }
                }

                const openAmount = Math.max(0, Math.min(1, isEntrance ? openProgress : 1 - blinkClose));
                if (openAmount <= 0.005) continue;

                ctx.save();
                ctx.translate(ex, ey);
                ctx.globalAlpha = 0.7;

                const clipHalfH = ry * openAmount;

                // Outer Shadow Pass (เงาฟุ้งนอก Clip ไม่โดนตัด)
                ctx.save();
                ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
                ctx.shadowBlur = rx * 0.35;
                ctx.fillStyle = "#000000";
                ctx.save();
                ctx.scale(1, openAmount);
                traceBlob(ctx, eye.scleraShape, rx, ry);
                ctx.fill();
                ctx.restore();
                ctx.restore();

                // Vertical Slicing Eyelid Clip
                ctx.save();
                ctx.beginPath();
                ctx.rect(-rx * 1.6, -clipHalfH, rx * 3.2, clipHalfH * 2);
                ctx.clip();

                // Render Sclera
                ctx.save();
                const scleraGrad = ctx.createRadialGradient(
                    -rx * 0.15, -ry * 0.2, rx * 0.05,
                    0, 0, Math.max(rx, ry)
                );
                scleraGrad.addColorStop(0, "#f5ebd5");
                scleraGrad.addColorStop(0.65, "#eee3c8");
                scleraGrad.addColorStop(1, "#eae5d9");

                traceBlob(ctx, eye.scleraShape, rx, ry);
                ctx.fillStyle = scleraGrad;
                ctx.fill();

                ctx.lineWidth = Math.max(1.2, rx * 0.065);
                ctx.strokeStyle = "#0d0b06";
                ctx.stroke();
                ctx.restore();

                // Render Pupil
                ctx.save();
                traceBlob(ctx, eye.scleraShape, rx * 0.94, ry * 0.94);
                ctx.clip();

                const maxOffX = rx * 0.42;
                const maxOffY = ry * 0.32;
                let targetOffX: number;
                let targetOffY: number;

                if (interactive && mouse.active) {
                    mouseDelta.dx = mouse.x - ex;
                    mouseDelta.dy = mouse.y - ey;
                    const dist = Math.hypot(mouseDelta.dx, mouseDelta.dy) || 1;
                    const norm = Math.min(1, dist / (minWH * 0.5));
                    targetOffX = (mouseDelta.dx / dist) * maxOffX * norm;
                    targetOffY = (mouseDelta.dy / dist) * maxOffY * norm;
                } else {
                    targetOffX = Math.cos(t * eye.driftFreqX + eye.driftPhase) * maxOffX * 0.35;
                    targetOffY = Math.sin(t * eye.driftFreqY + eye.driftPhase * 1.3) * maxOffY * 0.3;
                }

                const ellipseK = (targetOffX * targetOffX) / (maxOffX * maxOffX) + (targetOffY * targetOffY) / (maxOffY * maxOffY);
                if (ellipseK > 1) {
                    const s = 1 / Math.sqrt(ellipseK);
                    targetOffX *= s;
                    targetOffY *= s;
                }
                eye.curOffX += (targetOffX - eye.curOffX) * 0.08;
                eye.curOffY += (targetOffY - eye.curOffY) * 0.08;

                const scleraArea = rx * ry;
                const pupilArea = scleraArea * eye.pupilAreaRatio;
                const elong = 2.1;
                const pRx = Math.sqrt(pupilArea / (Math.PI * elong));
                const pRy = pRx * elong;

                ctx.save();
                ctx.translate(eye.curOffX, eye.curOffY);
                ctx.rotate(eye.pupilRotation);
                const pupilGrad = ctx.createRadialGradient(0, -pRy * 0.2, pRy * 0.05, 0, 0, pRy);
                pupilGrad.addColorStop(0, "#4a0404");
                pupilGrad.addColorStop(0.45, "#1c0403");
                pupilGrad.addColorStop(1, "#09090b");
                traceBlob(ctx, eye.pupilShape, pRx, pRy);
                ctx.fillStyle = pupilGrad;
                ctx.fill();
                ctx.restore();

                ctx.restore(); // Undo Sclera clip for pupil
                ctx.restore(); // Undo Eyelid slice clip

                // Top/Bottom Cut Outline Strokes
                if (openAmount < 0.98) {
                    ctx.strokeStyle = "#0d0b06";
                    ctx.lineWidth = Math.max(1.2, rx * 0.065);
                    const sliceSpan = rx * Math.sqrt(Math.max(0, 1 - Math.pow(openAmount, 2))) * 0.92;

                    ctx.beginPath();
                    ctx.moveTo(-sliceSpan, -clipHalfH);
                    ctx.lineTo(sliceSpan, -clipHalfH);
                    ctx.moveTo(-sliceSpan, clipHalfH);
                    ctx.lineTo(sliceSpan, clipHalfH);
                    ctx.stroke();
                }

                ctx.restore();
            }

            rafRef.current = requestAnimationFrame(render);
        };

        rafRef.current = requestAnimationFrame(render);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [interactive]);

    return (
        <div className={className} style={{ position: "relative", width, height, overflow: "hidden" }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </div>
    );
};

export default AlmightyShadowEyes;