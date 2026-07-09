// src/shared/ui/button/HowToPlayButton.tsx
"use client";

import React, { useState } from "react";
import { Tooltip } from "@/src/shared/ui/tooltip";
// import { HowToPlayModal } from "@/src/shared/ui/modals/HowToPlayModal"; // 👈 Import Modal วิธีเล่นของคุณมาที่นี่

interface HowToPlayButtonProps {
    className?: string;
    tooltipContent?: string;
}

export function HowToPlayButton({
    className = "",
    tooltipContent = "How To Play",
}: HowToPlayButtonProps) {
    const [isOpen, setIsOpen] = useState(false); // 🌟 ควบคุมการเปิด-ปิดในตัวคอมโพเนนต์เองเลย

    return (
        <>
            <Tooltip content={tooltipContent}>
                <button
                    onClick={() => setIsOpen(true)} // 🌟 เปลี่ยนมาสั่งเปิดตรงนี้
                    className={`group/btn relative w-10 h-10 flex items-center justify-center text-[#c8a96e] hover:text-[#6fc3e8] transition-colors duration-300 hover:cursor-pointer ${className}`}
                    aria-label={tooltipContent}
                >
                    {/* ✨ PREMIUM EFFECT: Cyan Tech Target Brackets */}
                    <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#6fc3e8]" />
                        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#6fc3e8]" />
                    </div>

                    {/* ✨ PREMIUM EFFECT: Micro Tilt & Blueprint Glow */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/btn:scale-105 group-hover/btn:-rotate-12 drop-shadow-[0_0_0px_rgba(111,195,232,0)] group-hover/btn:drop-shadow-[0_0_10px_rgba(111,195,232,0.6)]"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </button>
            </Tooltip>

            {/* 🌟 เสียบ Modal วิธีเล่นไว้ตรงนี้ (ทำงานเหมือน AllModesButton) */}
            {/* <HowToPlayModal isOpen={isOpen} onClose={() => setIsOpen(false)} /> */}
        </>
    );
}