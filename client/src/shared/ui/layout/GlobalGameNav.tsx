// src/shared/layout/GlobalGameNav.tsx
"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AllModesButton } from '@/src/shared/ui/game-selector/AllModesButton';
import { HowToPlayButton } from '@/src/shared/ui/game-selector/HowToPlayButton';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { HOW_TO_PLAY_MODALS } from '@/src/config/howToPlayModals';
import { HomeButton } from '../game-selector/HomeButton';
import { StatsButton } from '../game-selector/StatsButton';
import { SpotifyPlaylistButton } from '../game-selector/SpotifyPlaylistButton';

export function GlobalGameNav() {
    const pathname = usePathname();

    // 🔧 แก้ Bug: Destructure 'state' ออกมาแทน 'isTransitioning' เพราะ Context ส่งมาแบบนั้น
    const { state } = useSenkaimon();
    const [isHowToOpen, setIsHowToOpen] = useState(false);

    const isHome = pathname === "/";
    const isSupport = pathname === "/support";
    const isStats = pathname === "/stats";
    const isAnswerKey = pathname === "/soul-society-archives";
    const gameMatch = pathname.match(/^\/(daily|unlimited|mockup)\/([^/]+)$/);
    const isMockUp = pathname === `/mockup/release`;
    const isValidGamePath = !!gameMatch;

    if (!isHome && !isValidGamePath && !isSupport && !isMockUp && !isStats && !isAnswerKey) return null;

    // 🔧 ถ้าสถานะประตูปิดหรือกำลังทำงานอยู่ ให้ซ่อนไปเลย
    if (state !== "idle") return null;

    const dailyOrUnlimited = gameMatch?.[1] as 'daily' | 'unlimited' | undefined;
    const modeKey = gameMatch?.[2];

    const ActiveModal = modeKey ? HOW_TO_PLAY_MODALS[modeKey] : undefined;

    return (
        <>
            {/* 🎯 เพิ่ม id="global-game-nav" ให้ style จาก loading.tsx มาคว้าตัวไปซ่อนได้ */}
            <div
                id="global-game-nav"
                className="fixed top-4 right-4 flex items-center gap-2 z-50 pointer-events-auto transition-opacity duration-300 animate-[fadeIn_0.2s_ease-out]"
            >
                {!isHome && <HomeButton />}
                {!isStats && <StatsButton />}
                <SpotifyPlaylistButton />
                <AllModesButton />
                {isValidGamePath && ActiveModal && (
                    <HowToPlayButton onClick={() => setIsHowToOpen(true)} />
                )}
            </div>

            {ActiveModal && dailyOrUnlimited && (
                <ActiveModal
                    isOpen={isHowToOpen}
                    onClose={() => setIsHowToOpen(false)}
                    mode={dailyOrUnlimited}
                />
            )}
        </>
    );
}