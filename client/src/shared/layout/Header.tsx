"use client";

import { Tooltip } from '@/src/shared/ui/tooltip'; // ปรับ path ตามโปรเจกต์ของคุณ

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
    return (
        <header className="w-full">
            {/* How To Play Trigger */}
            <Tooltip content="How To Play" className="absolute top-4 right-4">
                <button
                    onClick={onOpenHowTo}
                    className="text-[#c8a96e] opacity-70 hover:opacity-100 transition-opacity hover:cursor-pointer"
                    aria-label="How to play"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </button>
            </Tooltip>

            {/* Content container */}
            <div className="max-w-[80%] mx-auto px-4 py-8 flex flex-col items-center text-center">

                {/* Department Label */}
                <div className="relative mb-3">
                    <span className="text-[9px] tracking-[0.4em] text-[#c8a96e]/70 uppercase font-semibold">
                        {subtitle}
                    </span>
                </div>

                {/* Main Title with "Scanner Brackets" */}
                <div className="relative px-8 py-3">
                    {/* Decorative Corners */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#c8a96e]/50" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#c8a96e]/50" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#c8a96e]/50" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#c8a96e]/50" />

                    <h1 className="text-4xl font-bold tracking-[0.3em] text-[#c8a96e] drop-shadow-[0_0_15px_rgba(200,169,110,0.3)]"
                        style={{ fontFamily: "'Cinzel', serif" }}>
                        {title}
                    </h1>
                </div>
            </div>

            <div className="w-full flex items-center justify-center px-[5%] opacity-90">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
                <div className="mx-8 relative flex items-center justify-center">
                    <div className="w-6 h-6 border border-[#c8a96e] rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(200,169,110,0.3)] bg-black/20">
                        <div className="w-1.5 h-1.5 bg-[#c8a96e] rotate-0 shadow-[0_0_8px_#c8a96e]" />
                    </div>
                    <div className="absolute -left-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                    <div className="absolute -right-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
            </div>
        </header>
    );
};