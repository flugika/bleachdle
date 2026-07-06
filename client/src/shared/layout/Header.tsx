"use client";

import { Tooltip } from '@/src/shared/ui/tooltip';
import { HeaderDivider } from './HeaderDivider';
import { AllModesButton } from '@/src/shared/ui/game-selector/AllModesButton';
import SoulSyncLoader from '../ui/loader/SoulSyncLoader';
import { useEffect, useState } from 'react';

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
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <header className="w-full relative">
            {/* Top-right icon row */}
            {/* แทนที่โค้ดส่วนปุ่มตรงมุมขวาบนใน Header.tsx ของคุณ */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {/* ปุ่มสลับโหมด */}
                <AllModesButton />

                {/* ปุ่ม How to play */}
                <Tooltip content="How To Play">
                    <button
                        onClick={onOpenHowTo}
                        className="group/btn relative w-10 h-10 flex items-center justify-center text-[#c8a96e] hover:text-[#6fc3e8] transition-colors duration-300 hover:cursor-pointer"
                        aria-label="How to play"
                    >
                        {/* ✨ PREMIUM EFFECT: Cyan Tech Target Brackets (คลี่ออกประกบมุมตรงข้าม) */}
                        <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#6fc3e8]" />
                            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#6fc3e8]" />
                        </div>

                        {/* ✨ PREMIUM EFFECT: Micro Tilt & Blueprint Glow */}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/btn:scale-105 group-hover/btn:-rotate-12 drop-shadow-[0_0_0px_rgba(111,195,232,0)] group-hover/btn:drop-shadow-[0_0_10px_rgba(111,195,232,0.6)]"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </button>
                </Tooltip>
            </div>

            {/* Content container */}
            <div className="max-w-[80%] mx-auto px-4 py-8 flex flex-col items-center text-center">
                {/* วงแสง Background Aura */}
                <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[10vh] bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.25)_0%,transparent_60%)] pointer-events-none z-0 blur-[100px] transition-all duration-[2000ms] ease-in-out ${isMounted ? "opacity-100 scale-100" : "opacity-0 scale-90"
                        }`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.2)_0%,transparent_30%)] animate-[pulse_4s_ease-in-out_infinite]" />
                </div>

                {/* 🎯 FIX: เพิ่มคลาสจัดกึ่งกลางแนวตั้ง-แนวนอนให้ตรงกับแกน Background */}
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