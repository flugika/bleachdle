// src/shared/ui/game-selector/SupportButton.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from '@/src/shared/ui/tooltip';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';

export function SupportButton() {
    const { navigate, state } = useSenkaimon();
    const pathname = usePathname();

    // ⚔️ SENKAIMON INTERCEPTOR — same pattern as HomeButton/StatsButton/AboutButton
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
            return;
        }

        if (pathname === '/support' || state !== "idle") {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        navigate('/support');
    };

    return (
        <Tooltip content="Support">
            <Link
                href="/support"
                onClick={handleNavigation}
                aria-label="Go to support page"
                className="group/btn relative w-10 h-10 flex items-center justify-center text-[#5eb8c9] hover:text-[#a3e4f2] transition-colors duration-300"
            >
                {/* ✨ Tech Target Brackets — teal/aqua, distinct from every other button's color
                    (red/gold-cyan/green/purple/champagne-gold) */}
                <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#5eb8c9]" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#5eb8c9]" />
                </div>

                {/* ✨ Dimensional lift + glow, teal/aqua */}
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
                    className="transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/btn:-translate-y-0.5 group-hover/btn:scale-105 drop-shadow-[0_0_0px_rgba(94,184,201,0)] group-hover/btn:drop-shadow-[0_0_10px_rgba(94,184,201,0.6)]"
                >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
                    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
                    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
                    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
                    <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
                </svg>
            </Link>
        </Tooltip>
    );
}