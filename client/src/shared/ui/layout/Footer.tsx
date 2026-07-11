// src/components/Footer.tsx
"use client"; // ⚡ จำเป็นต้องใช้เนื่องจากมีการเรียกใช้งาน React Hooks

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { Z } from '@/src/config/zIndex'; // 🎯 ใช้ z-index scale กลาง แทน hardcode ตัวเลขเอง
// 💡 หมายเหตุ: ปรับเปลี่ยน Path ลิงก์ของ useSenkaimon ให้ตรงกับโครงสร้างจริงของคุณ เช่น @/src/shared/context/NavigationContext

const FOOTER_LINKS = [
    { name: 'HOME', path: '/' },
    { name: 'ABOUT', path: '/about' },
    { name: 'STATS', path: '/stats' },
    { name: 'SUPPORT', path: '/support' },
];

export default function Footer() {
    const { navigate, state } = useSenkaimon();
    const pathname = usePathname();

    // ⚔️ SENKAIMON INTERCEPTOR ENGINE
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        // 1. 🛡️ Senior Safeguard: ตรวจสอบ Modifier Keys
        // หากผู้ใช้กด Ctrl, Cmd, Shift, หรือ Alt + คลิก เพื่อเปิดแท็บใหม่/หน้าต่างใหม่
        // ให้ปล่อยให้เบราว์เซอร์ทำงานตามธรรมชาติ (ไม่ต้องรันอนิเมชันปิดประตูบนหน้าเดิม)
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
            return;
        }

        // 2. 🛡️ ป้องกันการกดลิ้งก์ซ้ำหน้าเดิม หรือกดรัวระหว่างที่ประตูกำลังเปิด-ปิดอยู่
        if (pathname === path || state !== "idle") {
            e.preventDefault();
            return;
        }

        // 3. 💥 สั่งดักระเบิดแรงดันวิญญาณ: สั่งตัดการทำงานของ Next.js Link ชั่วคราว 
        // แล้วโยนสิทธิ์การควบคุมเส้นทางไปให้ระบบประตูเซนไกมงทำงานแทน
        e.preventDefault();
        navigate(path);
    };

    return (
        <footer
            className="w-full border-t border-white/5 bg-[#050505] py-12 px-6 relative"
            style={{ zIndex: Z.footer }}
        >
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">

                {/* Brand Section */}
                <div className="text-center md:text-left">
                    <Link
                        href="/"
                        onClick={(e) => handleNavigation(e, '/')}
                        className="text-sm font-bold tracking-[0.2em] text-white hover:text-[#c8a96e] transition-colors"
                    >
                        BLEACHDLE
                    </Link>
                    <p className="text-[12px] text-white/40 mt-1 uppercase tracking-widest">
                        Soul Society Guessing Engine
                    </p>
                </div>

                {/* Links Navigation */}
                <nav className="flex gap-8">
                    {FOOTER_LINKS.map((link) => {
                        const isActive = pathname === link.path;
                        return (
                            <Link
                                key={link.name}
                                href={link.path}
                                onClick={(e) => handleNavigation(e, link.path)}
                                // เสริม UX: อิงตามสไตล์เกมคอนโซล ไฮไลท์สีทองเมื่ออยู่หน้านั้นๆ ทันที
                                className={`text-[12px] uppercase tracking-[0.2em] transition-colors ${isActive
                                    ? "text-[#c8a96e] font-bold drop-shadow-[0_0_10px_rgba(200,169,110,0.4)]"
                                    : "text-white/50 hover:text-[#c8a96e]"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Metadata/Copyright */}
                <div className="text-[11px] text-white/40 tracking-wider text-center md:text-right">
                    © {new Date().getFullYear()} fukusana.dev <br />
                    Latest Updated: 11 July 2026, 7:03 AM. <br />
                    Thousand-Year Blood War Cour 3 (The Conflict)
                </div>
            </div>
        </footer>
    );
}