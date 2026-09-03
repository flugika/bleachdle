// src/shared/ui/game-selector/DeviceLinkButton.tsx
//
// Styled to match every other button in GlobalGameNav's row (w-10 h-10
// icon-only + Tooltip, see AboutButton for the reference pattern) rather
// than a text-label pill — this renders in the same fixed top-right cluster
// as Home/Stats/About/Support/Spotify/AllModes, so it needs to look like a
// sibling of those, not a different UI language.
'use client';

import { useState } from 'react';
import { Tooltip } from '@/src/shared/ui/tooltip';
import { PairingModal } from '@/src/shared/ui/pairing/PairingModal';

export function DeviceLinkButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Tooltip content="Link Device">
                <button
                    onClick={() => setIsOpen(true)}
                    aria-label="Link another device to sync your streaks"
                    className="group/btn relative w-10 h-10 flex items-center justify-center text-[#d8c6a0] hover:text-[#fff3d6] transition-colors duration-300"
                >
                    <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#d8c6a0]" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#d8c6a0]" />
                    </div>

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
                        className="transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/btn:-translate-y-0.5 group-hover/btn:scale-105 drop-shadow-[0_0_0px_rgba(216,198,160,0)] group-hover/btn:drop-shadow-[0_0_10px_rgba(255,243,214,0.6)]"
                    >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                </button>
            </Tooltip>

            <PairingModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onLinked={() => {
                    // pullServerStatsAndReload() inside PairingModal handles the
                    // actual refresh — nothing extra needed here
                }}
            />
        </>
    );
}