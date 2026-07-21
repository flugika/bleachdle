"use client";

import { useEffect, useState } from "react";
import { getTodayStr } from "@/src/lib/utils/format";
import { Button } from "@/src/shared/ui/button";

interface DailyResetTimerProps {
    /** วันที่ของ Target ที่กำลังแสดงผลใน Summary (เช่น "2026-04-01") */
    targetDate?: string;
    /** Callback เมื่อผู้เล่นกดเริ่มเล่นข้อใหม่ (หากไม่ส่งจะ fallback เป็น reload) */
    onPlayToday?: () => void;
}

export const DailyResetTimer = ({ targetDate, onPlayToday }: DailyResetTimerProps) => {
    const [timeLeft, setTimeLeft] = useState('00h 00m 00s');

    // 🎯 เช็คว่า Target ที่กำลังแสดงผลอยู่เป็นของวันเก่าหรือไม่
    const todayStr = getTodayStr();
    const isStaleTarget = Boolean(targetDate && targetDate !== todayStr);

    useEffect(() => {
        // ถ้าเป็นโจทย์วันเก่า ไม่ต้องรัน Timer ให้เปลือง Performance
        if (isStaleTarget) return;

        const calculateTime = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setHours(24, 0, 0, 0); // ตั้งเป้าไปที่เที่ยงคืนเป๊ะ

            const diff = tomorrow.getTime() - now.getTime();
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        };

        const timer = setInterval(() => setTimeLeft(calculateTime()), 1000);
        setTimeLeft(calculateTime());
        return () => clearInterval(timer);
    }, [isStaleTarget]);

    const handlePlayToday = () => {
        if (onPlayToday) {
            onPlayToday();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="relative mx-auto bg-[#0a0a0c] border border-[#c8a96e]/20 p-5 shadow-2xl font-[family-name:var(--font-display)] overflow-hidden">
            {/* Corner Accents: ตัวช่วยทำให้ดูเหมือน Data Terminal */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#c8a96e]/50" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#c8a96e]/50" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-[#c8a96e]/50" />
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-[#c8a96e]/50" />

            {/* Header Label & Status Indicator */}
            <div className="flex justify-center items-center gap-2 mb-3">
                <div 
                    className={`w-1.5 h-1.5 rounded-full ${
                        isStaleTarget 
                            ? "bg-[#4de880] shadow-[0_0_12px_#4de880] animate-ping" 
                            : "bg-[#c8a96e] shadow-[0_0_10px_#c8a96e]"
                    }`} 
                />
                <span className={`text-[11px] tracking-[0.25em] uppercase font-semibold ${
                    isStaleTarget ? "text-[#4de880]" : "text-[#c8a96e]"
                }`}>
                    {isStaleTarget ? "NEW REIRAKU SIGNAL DETECTED" : "NEXT REIRAKU PERCEPTION RESET"}
                </span>
            </div>

            {/* Main Display: ปุ่มกดลุยข้อใหม่ OR นาฬิกานับถอยหลัง */}
            {isStaleTarget ? (
                <div className="flex flex-col gap-2 pt-1">
                    {/* ⚔️ Reuse <Button /> Component สไตล์ Bleach */}
                    <Button
                        variant="primary"
                        onClick={handlePlayToday}
                        className="w-full hover:!bg-[#4de880] hover:!border-[#4de880] hover:!text-black hover:!shadow-[0_0_25px_rgba(77,232,128,0.35)] transition-all duration-300"
                    >
                        INITIALIZE TODAY'S TARGET 卍
                    </Button>
                    <p className="text-[10px] tracking-[0.2em] text-[#eed9c4]/40 text-center uppercase">
                        [ TARGET OUTDATED // CLICK TO RE-LINK KONPAKU ]
                    </p>
                </div>
            ) : (
                /* Timer Display - ใช้ Monospace Font เสมอ */
                <div className="flex justify-center items-center py-1">
                    <div className="text-4xl text-[#f5ebd5] tracking-widest tabular-nums font-black">
                        {timeLeft}
                    </div>
                </div>
            )}

            {/* Subtle Divider */}
            <div className="mt-3 w-12 h-px bg-[#c8a96e]/20 mx-auto" />
        </div>
    );
};