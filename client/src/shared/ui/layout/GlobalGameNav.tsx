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
import { AboutButton } from '../game-selector/AboutButton';
import { SupportButton } from '../game-selector/SupportButton';

// ─────────────────────────────────────────────
// 🗺️ ROUTE REGISTRY — single source of truth
// ─────────────────────────────────────────────
// Every static page that should show this nav gets ONE entry here, pairing
// its path with the button that represents "you are here" (so that button
// hides itself instead of linking to the current page). Adding a new page
// to the nav is now a one-line addition — no separate whitelist to update,
// no separate {!isX && <XButton/>} block to remember.
type NavButtonConfig = {
    path: string;
    Component: React.ComponentType;
};

const NAV_BUTTONS: NavButtonConfig[] = [
    { path: '/', Component: HomeButton },
    { path: '/stats', Component: StatsButton },
    { path: '/about', Component: AboutButton },
    { path: '/support', Component: SupportButton },
];

// Static paths that should show the nav but don't get their own nav button
// (support has no SupportButton in the row, same for the answer-key archive).
const STATIC_NAV_ONLY_PATHS = [
    '/daily',
    '/unlimited',
    '/soul-society-archives', 
    '/monitor'
];

// Dynamic game routes: /daily/:mode, /unlimited/:mode, /mockup/:mode
const GAME_PATH_REGEX = /^\/(daily|unlimited|mockup)\/([^/]+)$/;

function isNavVisiblePath(pathname: string): boolean {
    return (
        NAV_BUTTONS.some((b) => b.path === pathname) ||
        STATIC_NAV_ONLY_PATHS.includes(pathname) ||
        GAME_PATH_REGEX.test(pathname)
    );
}

export function GlobalGameNav() {
    const pathname = usePathname();

    // 🔧 แก้ Bug: Destructure 'state' ออกมาแทน 'isTransitioning' เพราะ Context ส่งมาแบบนั้น
    const { state } = useSenkaimon();
    const [isHowToOpen, setIsHowToOpen] = useState(false);

    // 🔧 ถ้าสถานะประตูปิดหรือกำลังทำงานอยู่ ให้ซ่อนไปเลย
    if (state !== "idle") return null;

    // 🚪 One readable gate instead of a 7-term !isX && !isY chain — forgetting
    // to register a new page here means the nav simply won't render there,
    // rather than silently breaking an unrelated boolean combination.
    if (!isNavVisiblePath(pathname)) return null;

    const gameMatch = pathname.match(GAME_PATH_REGEX);
    const isValidGamePath = !!gameMatch;
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
                {/* 🗺️ Derived straight from NAV_BUTTONS — each button hides itself
                    on its own page instead of the parent tracking N booleans */}
                {NAV_BUTTONS.filter(({ path }) => path !== pathname).map(({ path, Component }) => (
                    <Component key={path} />
                ))}

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