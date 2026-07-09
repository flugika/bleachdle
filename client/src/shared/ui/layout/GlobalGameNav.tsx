// 📄 src/shared/layout/GlobalGameNav.tsx
"use client";

import { usePathname } from 'next/navigation';
import { AllModesButton } from '@/src/shared/ui/game-selector/AllModesButton';
import { HowToPlayButton } from '@/src/shared/ui/HowToPlayButton';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext'; // 🌟 ดึง Context ประตูเซ็นไกมอนมาช่วย

export function GlobalGameNav() {
    const pathname = usePathname();
    const { isTransitioning } = useSenkaimon() as any; // 🌟 เผื่อบริบทระบบคุณมี state ตรวจจับการเปลี่ยนหน้า

    // 🎯 1. เช็คสิทธิ์ของหน้าเว็บ
    const isHome = pathname === "/";
    const isValidGamePath = /^\/(daily|unlimited)\/[^/]+$/.test(pathname);

    // ❌ เงื่อนไขที่ 1: ถ้าไม่ใช่หน้า Home และไม่ใช่หน้าเล่นเกมที่ถูกต้อง (เช่น หน้า 404 / catchAll) -> ซ่อนทันที!
    if (!isHome && !isValidGamePath) return null;

    // ❌ เงื่อนไขที่ 2: ถ้ากำลังกดเปลี่ยนหน้าและระบบ Senkaimon กำลังทำงาน -> ซ่อนเพื่อความเนียนตาแบบ Cinematic
    if (isTransitioning) return null;

    return (
        /* เพิ่มแอนิเมชันจางเข้าเบาๆ ตอนปรากฏตัว จะได้ไม่ดูกระตุกตาครับ */
        <div className="fixed top-4 right-4 flex items-center gap-2 z-50 pointer-events-auto transition-opacity duration-300 animate-[fadeIn_0.2s_ease-out]">
            {/* ปุ่มสลับโหมด */}
            <AllModesButton />

            {/* ปุ่ม How to play (ขึ้นเฉพาะหน้าสู้/หน้าเล่นเกม ไม่ขึ้นหน้าแรก) */}
            {isValidGamePath && <HowToPlayButton />}
        </div>
    );
}