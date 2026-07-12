// src/shared/ui/game-selector/AboutButton.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from '@/src/shared/ui/tooltip';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';

export function AboutButton() {
    const { navigate, state } = useSenkaimon();
    const pathname = usePathname();

    // ⚔️ SENKAIMON INTERCEPTOR — same pattern as HomeButton/StatsButton
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
            return;
        }

        if (pathname === '/about' || state !== "idle") {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        navigate('/about');
    };

    return (
        <Tooltip content="About">
            <Link
                href="/about"
                onClick={handleNavigation}
                aria-label="Go to about page"
                className="group/btn relative w-10 h-10 flex items-center justify-center text-[#d8c6a0] hover:text-[#fff3d6] transition-colors duration-300"
            >
                {/* ✨ Tech Target Brackets — champagne-gold/platinum, distinct from
                    every other button's color (red/purple/green/gold-cyan) */}
                <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#d8c6a0]" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#d8c6a0]" />
                </div>

                {/* ✨ Dimensional lift + glow, champagne-gold */}
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="11" x2="12" y2="16.5" />
                    <circle cx="12" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
            </Link>
        </Tooltip>
    );
}