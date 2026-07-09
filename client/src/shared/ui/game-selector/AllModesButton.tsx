// src/shared/ui/AllModesButton.tsx
"use client";

import { useState } from 'react';
import { Tooltip } from '@/src/shared/ui/tooltip';
import { AllModesModal } from './AllModesModal';

export function AllModesButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Tooltip content="Select Mode">
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    /* 🎯 FIX: เปลี่ยนจาก group-btn เป็น group/btn เพื่อให้ผูกกับ group-hover/btn ด้านล่างได้สมบูรณ์ */
                    className="group/btn relative w-10 h-10 flex items-center justify-center text-[#c8a96e] hover:text-[#f5ebd5] transition-colors duration-300 hover:cursor-pointer"
                    aria-label="Select game mode"
                >
                    {/* ✨ PREMIUM EFFECT: Tech Target Brackets (คลี่ออกเมื่อ Hover - ธีมสีทอง) */}
                    <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#c8a96e]" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#c8a96e]" />
                    </div>

                    {/* ✨ PREMIUM EFFECT: Dimensional Rotation using Custom Cubic Bezier */}
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
                        className="transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/btn:rotate-45 group-hover/btn:scale-105 drop-shadow-[0_0_0px_rgba(200,169,110,0)] group-hover/btn:drop-shadow-[0_0_10px_rgba(200,169,110,0.6)]"
                    >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                </button>
            </Tooltip>
            <AllModesModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}