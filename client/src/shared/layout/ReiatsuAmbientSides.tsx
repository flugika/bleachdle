// src/shared/layout/ReiatsuAmbientSides.tsx
"use client";

import React, { useEffect, useState } from "react";

// 🕊️ base style กลาง — กัน "กองที่ top" ตอน F5 ก่อน animation เริ่มทำงานจริง
// หมายเหตุ: ห้ามตั้ง top เป็นค่าคงที่ตรงนี้ เพราะ keyframe ใช้ translateY(vh) โดยยึด
// ตำแหน่งเริ่มต้นที่ top:0 (auto) อยู่แล้ว — ถ้าตั้ง top ทับจะไปบวกออฟเซ็ตซ้อนกัน
// ทำให้ตำแหน่งจริงเพี้ยนจนไม่โผล่มาในจอเลย ใช้แค่ animationFillMode: backwards พอ
// (จะไปดึงค่า opacity:0 จาก keyframe 0% มาใช้ระหว่างรอ delay โดยอัตโนมัติ)
const particleBaseStyle: React.CSSProperties = {
    opacity: 0,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationFillMode: "backwards",
};

type Particle = {
    name: string;
    duration: string;
    delay: string;
    position: React.CSSProperties;
    className: string;
};

const leftParticles: Particle[] = [
    { name: "reishiChaosDrift-A", duration: "14s", delay: "0s", position: { left: "6%" }, className: "w-2 h-2 rounded-full bg-sky-300 blur-[0.7px] shadow-[0_0_10px_#7dd3fc]" },
    { name: "reishiChaosDrift-B", duration: "19s", delay: "3s", position: { left: "12%" }, className: "w-3 h-3 rounded-full bg-slate-200 blur-[1px] shadow-[0_0_14px_#e2e8f0]" },
    { name: "reishiChaosDrift-C", duration: "16s", delay: "7s", position: { left: "8%" }, className: "w-1.5 h-1.5 rounded-full bg-indigo-300 blur-[0.7px] shadow-[0_0_8px_#a5b4fc]" },
    { name: "reishiChaosDrift-B", duration: "23s", delay: "11s", position: { left: "3%" }, className: "w-2 h-2 rounded-full bg-blue-400 blur-[0.7px] shadow-[0_0_10px_#60a5fa]" },
    { name: "reishiChaosDrift-A", duration: "20s", delay: "9s", position: { left: "15%" }, className: "w-1.5 h-1.5 rounded-full bg-rose-400 blur-[0.7px] shadow-[0_0_10px_#fb7185]" },
];

const rightParticles: Particle[] = [
    { name: "reishiChaosDrift-B", duration: "16s", delay: "1s", position: { right: "8%" }, className: "w-2.5 h-2.5 rounded-full bg-indigo-300 blur-[1px] shadow-[0_0_14px_#a5b4fc]" },
    { name: "reishiChaosDrift-A", duration: "21s", delay: "5s", position: { right: "14%" }, className: "w-1.5 h-1.5 rounded-full bg-sky-300 blur-[0.7px] shadow-[0_0_8px_#7dd3fc]" },
    { name: "reishiChaosDrift-C", duration: "13s", delay: "9s", position: { right: "4%" }, className: "w-2 h-2 rounded-full bg-slate-200 blur-[0.7px] shadow-[0_0_10px_#e2e8f0]" },
    { name: "reishiChaosDrift-A", duration: "18s", delay: "13s", position: { right: "10%" }, className: "w-3 h-3 rounded-full bg-blue-400 blur-[1px] shadow-[0_0_14px_#60a5fa]" },
    { name: "reishiChaosDrift-C", duration: "22s", delay: "6s", position: { right: "16%" }, className: "w-1.5 h-1.5 rounded-full bg-rose-400 blur-[0.7px] shadow-[0_0_10px_#fb7185]" },
];

export function ReiatsuAmbientSides() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const raf1 = requestAnimationFrame(() => {
            const raf2 = requestAnimationFrame(() => setReady(true));
            return () => cancelAnimationFrame(raf2);
        });
        return () => cancelAnimationFrame(raf1);
    }, []);

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[11] overflow-hidden select-none"
            style={{
                opacity: ready ? 1 : 0,
                transition: "opacity 1.1s ease-out",
            }}
        >
            {/* ละอองวิญญาณฝั่งซ้าย */}
            <div className="absolute inset-0 opacity-30 md:opacity-45 mix-blend-screen">
                {leftParticles.map((p, i) => (
                    <div
                        key={`left-${i}`}
                        className={`absolute ${p.className}`}
                        style={{
                            ...particleBaseStyle,
                            ...p.position,
                            animationName: p.name,
                            animationDuration: p.duration,
                            animationDelay: p.delay,
                            willChange: "transform, opacity",
                        }}
                    />
                ))}
            </div>

            {/* ละอองวิญญาณฝั่งขวา */}
            <div className="absolute inset-0 opacity-30 md:opacity-45 mix-blend-screen">
                {rightParticles.map((p, i) => (
                    <div
                        key={`right-${i}`}
                        className={`absolute ${p.className}`}
                        style={{
                            ...particleBaseStyle,
                            ...p.position,
                            animationName: p.name,
                            animationDuration: p.duration,
                            animationDelay: p.delay,
                            willChange: "transform, opacity",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}