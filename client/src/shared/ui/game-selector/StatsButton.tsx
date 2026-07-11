// src/shared/ui/game-selector/StatsButton.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from '@/src/shared/ui/tooltip';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';

export function StatsButton() {
    const { navigate, state } = useSenkaimon();
    const pathname = usePathname();

    // ⚔️ SENKAIMON INTERCEPTOR — pattern เดียวกับ HomeButton/Footer
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // 1. 🛡️ เปิดแท็บใหม่/หน้าต่างใหม่ตามธรรมชาติ ถ้ากด modifier key
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
            return;
        }

        // 2. 🛡️ กันกดซ้ำหน้าเดิม หรือกดรัวตอนประตูกำลังทำงาน
        if (pathname === '/stats' || state !== "idle") {
            e.preventDefault();
            return;
        }

        // 3. 💥 ตัด Next.js Link ชั่วคราว โยนสิทธิ์ให้ระบบประตู Senkaimon แทน
        e.preventDefault();
        navigate('/stats');
    };

    return (
        <Tooltip content="Stats">
            <Link
                href="/stats"
                onClick={handleNavigation}
                aria-label="Go to stats"
                className="group/btn relative w-10 h-10 flex items-center justify-center text-[#b28ee0] hover:text-[#ddc4f5] transition-colors duration-300"
            >
                {/* ✨ Tech Target Brackets - โทนม่วงอเมทิสต์ (ต่างจากทอง/ฟ้า/เขียวของปุ่มอื่น) */}
                <div className="absolute inset-0 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100 transition-all duration-300 pointer-events-none">
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#b28ee0]" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#b28ee0]" />
                </div>

                {/* ✨ Dimensional lift + glow ม่วงอเมทิสต์ */}
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
                    className="transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/btn:-translate-y-0.5 group-hover/btn:scale-105 drop-shadow-[0_0_0px_rgba(178,142,224,0)] group-hover/btn:drop-shadow-[0_0_10px_rgba(178,142,224,0.6)]"
                >
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            </Link>
        </Tooltip>
    );
}