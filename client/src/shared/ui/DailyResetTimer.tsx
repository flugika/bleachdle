import { useEffect, useState } from "react";

// @/src/shared/ui/DailyResetTimer.tsx
export const DailyResetTimer = () => {
    const [timeLeft, setTimeLeft] = useState('00h 00m 00s');

    useEffect(() => {
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
    }, []);
    
    return (
        <div className="relative mx-auto bg-[#0a0a0c] border border-[#c8a96e]/20 p-6 shadow-2xl">
            {/* Corner Accents: ตัวช่วยทำให้ดูเหมือน Data Terminal */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-[#c8a96e]/50" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-[#c8a96e]/50" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-[#c8a96e]/50" />
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-[#c8a96e]/50" />

            {/* Header Label */}
            <div className="flex justify-center items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] shadow-[0_0_10px_#c8a96e]" />
                <span className="text-[12px] tracking-[0.25em] text-[#c8a96e] uppercase font-semibold">
                    NEXT REIRAKU PERCEPTION RESET
                </span>
            </div>

            {/* Timer Display - ใช้ Monospace Font เสมอ */}
            <div className="flex justify-center items-center">
                <div className="text-4xl font-mono text-[#f5ebd5] tracking-widest tabular-nums font-light">
                    {timeLeft}
                </div>
            </div>

            {/* Subtle Divider */}
            <div className="mt-4 w-12 h-px bg-[#c8a96e]/20 mx-auto" />
        </div>
    );
};