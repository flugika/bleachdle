// src/shared/ui/game-selector/HomeButton.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from '@/src/shared/ui/tooltip';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';

export function HomeButton() {
    const { navigate, state } = useSenkaimon();
    const pathname = usePathname();

    // ⚔️ SENKAIMON INTERCEPTOR — เหมือน Footer.tsx เป๊ะ
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // 1. 🛡️ เปิดแท็บใหม่/หน้าต่างใหม่ตามธรรมชาติ ถ้ากด modifier key
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
            return;
        }

        // 2. 🛡️ กันกดซ้ำหน้าเดิม หรือกดรัวตอนประตูกำลังทำงาน
        if (pathname === '/' || state !== "idle") {
            e.preventDefault();
            return;
        }

        // 3. 💥 ตัด Next.js Link ชั่วคราว โยนสิทธิ์ให้ระบบประตู Senkaimon แทน
        e.preventDefault();
        navigate('/');
    };

    return (
        <Tooltip content="Home">
            <Link
                href="/"
                onClick={handleNavigation}
                aria-label="Go to home"
                className="group/btn relative w-10 h-10 flex items-center justify-center text-[#7ec9a0] hover:text-[#c8f0d8] transition-colors duration-300"
            >
                {/* ✨ Tech Target Brackets - โทนเขียวหยก */}
                <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#7ec9a0]" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#7ec9a0]" />
                </div>

                {/* ✨ Dimensional lift + glow เขียวหยก */}
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
                    className="transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/btn:-translate-y-0.5 group-hover/btn:scale-105 drop-shadow-[0_0_0px_rgba(126,201,160,0)] group-hover/btn:drop-shadow-[0_0_10px_rgba(126,201,160,0.6)]"
                >
                    <path d="M3 9.5 12 3l9 6.5" />
                    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
                </svg>
            </Link>
        </Tooltip>
    );
}