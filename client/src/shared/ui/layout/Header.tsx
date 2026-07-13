"use client";

import { HeaderDivider } from './HeaderDivider';
import SoulSyncLoader from '../loader/SoulSyncLoader';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // 🌟 1. Import usePathname เพิ่มเข้ามา

interface HeaderProps {
    title?: string;
    subtitle?: string;
    onOpenHowTo?: () => void;
}

export const Header = ({
    title = "BLEACHDLE",
    subtitle = "Soul Society Intelligence Division",
    onOpenHowTo
}: HeaderProps) => {
    const pathname = usePathname(); // 🌟 2. เรียกใช้งาน hook เพื่อดึง path ปัจจุบัน (เช่น "/" หรือ "/daily/character")
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 🎯 3. ตรวจสอบว่า Path ตรงกับ /daily/[mode] หรือ /unlimited/[mode] หรือไม่
    // Regex ความหมาย: ขึ้นต้นด้วย /daily/ หรือ /unlimited/ และต้องมีชื่อโหมดตามหลังมาด้วย
    const showHowToPlay = /^\/(daily|unlimited)\/[^/]+/.test(pathname);

    return (
        <header className="w-full relative">
            {/* Content container */}
            <div className="max-w-[80%] mx-auto px-4 py-8 flex flex-col items-center text-center font-[family-name:var(--font-display)]">
                {/* วงแสง Background Aura */}
                <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[10vh] bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.25)_0%,transparent_60%)] pointer-events-none z-0 blur-[100px] transition-all duration-[2000ms] ease-in-out ${isMounted ? "opacity-100 scale-100" : "opacity-0 scale-90"
                        }`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.2)_0%,transparent_30%)] animate-[pulse_4s_ease-in-out_infinite]" />
                </div>

                <SoulSyncLoader
                    size={100}
                    hideLabel
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 blur-[1px] mt-1"
                />

                {/* Department Label */}
                <div className="relative mb-3">
                    <span className="text-[11px] tracking-[0.4em] text-[#c8a96e]/70 uppercase font-semibold">
                        {subtitle}
                    </span>
                </div>

                {/* Main Title with "Scanner Brackets" */}
                <div
                    className={`relative px-8 py-3 transition-all duration-[900ms] ease-out ${isMounted ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-3 blur-[5px]"
                        }`}
                    style={{ transitionDelay: "320ms" }}
                >
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#c8a96e]/60" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#6fc3e8]/60" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#6fc3e8]/60" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#c8a96e]/60" />

                    <h1
                        className="text-4xl font-bold tracking-[0.3em] bg-clip-text text-transparent drop-shadow-[0_0_110px_rgba(200,169,110,0.25)] bg-[length:200%_100%] animate-[reiatsuSheen_6s_ease-in-out_infinite]"
                        style={{
                            backgroundImage:
                                "linear-gradient(100deg, #c8a96e 0%, #c8a96e 40%, #d9eef5 50%, #c8a96e 60%, #c8a96e 100%)"
                        }}
                    >
                        {title}
                    </h1>
                </div>
            </div>

            <HeaderDivider />
        </header>
    );
};