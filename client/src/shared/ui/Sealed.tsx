"use client";

// นำเอา useRouter ออก และแทนที่ด้วย useSenkaimon
import ZangetsuLoader from "./loader/ZangetsuLoader";
import { Button } from "@/src/shared/ui/button";
import { useSenkaimon } from "@/src/shared/ui/context/NavigationContext"; // 👈 นำเข้า useSenkaimon ของคุณ
import { useEffect } from "react";

export default function Sealed() {
    const { navigate, reportReady } = useSenkaimon(); // 👈 ดึง reportReady มาใช้งาน

    // 👈 เพิ่ม useEffect ตัวนี้ เพื่อสั่งปลดล็อคให้เซนไกมงเปิดประตู
    useEffect(() => {
        reportReady();
    }, [reportReady]);
    
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center w-screen h-screen bg-[#020205] text-white overflow-hidden select-none">

            {/* 🌌 [BOTTOM ZONE: z-0] เลเยอร์พื้นหลังและแสงเงาคงเดิม */}
            <div className="absolute inset-0 bg-ambient-void pointer-events-none z-0"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#010103_98%)] pointer-events-none z-0 opacity-60"></div>

            {/* LAYER 6: เส้นตัดมิติรอยดาบเฉียงพาดหน้าจอ */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-[150%] h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent rotate-[-35deg] blur-[1px]"></div>
                <div className="absolute w-[150%] h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent rotate-[-35deg] animate-pulse"></div>
            </div>

            {/* 🎬 [FOREGROUND ZONE: z-20] เอฟเฟกต์หน้าจอและกรอบล็อคเป้ามุมจอ */}
            <div className="absolute inset-0 bleach-scanlines pointer-events-none z-20 opacity-40"></div>

            {/* LAYER 7: กรอบล็อกเป้าสภา 46 ขอบจอสุดคลาสสิก */}
            <div className="absolute inset-8 pointer-events-none z-20">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-solid border-white/30"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-solid border-white/30"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-solid border-white/30"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-solid border-white/30"></div>

                <span className="absolute bottom-2 left-8 font-[family-name:var(--font-display)] text-[11px] tracking-[0.4em] text-white/40 uppercase">System // Absolute_Seal_Active</span>
                <span className="absolute top-2 right-8 font-[family-name:var(--font-display)] text-[11px] tracking-[0.4em] text-cyan-400/70 uppercase font-bold">Decree // Central_46_Law</span>
            </div>

            {/* 💎 [CORE ZONE: z-30] */}
            <div className="relative z-30 flex flex-col items-center justify-center w-full max-w-4xl px-4 gap-2">

                {/* อนิเมชั่นแรงดันวิญญาณ */}
                <div className="transform scale-85 md:scale-95 -mb-2">
                    <ZangetsuLoader />
                </div>

                {/* 📜 PREMIUM CENTRAL 46 CINEMATIC PLATE */}
                <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0a0404]/20 to-[#020205]/30 border border-[#e83030]/20 py-5 px-6 md:py-6 md:px-8 backdrop-blur-xl shadow-[0_30px_70px_rgba(0,0,0,0.8),_0_0_50px_rgba(232,48,48,0.03)] transition-all duration-500">

                    {/* ⛩️ Kido Corner Brackets */}
                    <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#e83030] drop-shadow-[0_0_7px_rgba(232,48,48,0.6)]"></div>
                    <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[#e83030] drop-shadow-[0_0_7px_rgba(232,48,48,0.6)]"></div>
                    <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[#e83030] drop-shadow-[0_0_7px_rgba(232,48,48,0.6)]"></div>
                    <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#e83030] drop-shadow-[0_0_7px_rgba(232,48,48,0.6)]"></div>

                    {/* เส้นไกด์นำสายตาชั้นใน */}
                    <div className="absolute inset-1.5 border border-white/[0.02] pointer-events-none"></div>

                    {/* ⚔️ Content Layout */}
                    <div className="text-center relative z-10 flex flex-col items-center gap-3.5">

                        {/* Header Group */}
                        <div className="w-full flex items-center justify-center gap-3">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#e83030]/30 to-[#e83030]/70"></div>

                            <h2 className="text-xl md:text-2xl font-[family-name:var(--font-display)] font-black tracking-[0.4em] bg-gradient-to-r from-[#e83030] via-[#ff5555] to-[#e83030] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(232,48,48,0.4)] uppercase animate-pulse select-none pl-[0.4em]">
                                卍 ACCESS DENIED 卍
                            </h2>

                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#e83030]/30 to-[#e83030]/70"></div>
                        </div>

                        {/* Subtitle / System Log */}
                        <div className="text-[11px] uppercase tracking-[0.4em] font-[family-name:var(--font-display)] text-[#c8a96e]/40 -mt-2">
                            Central 46 Executive Order // Dimensional_Lockdown
                        </div>

                        {/* 🇯🇵 Romaji Section */}
                        <blockquote className="text-xs md:text-sm font-medium tracking-wider text-[#c8a96e]/90 italic font-mono leading-relaxed max-w-xl px-4 border-x border-[#e83030]/15 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
                            "Chūō Shijūroku-shitsu no meirei ni yori, kono mōdo wa fūin sarete imasu."
                        </blockquote>

                        {/* 🇬🇧 English Section */}
                        <p className="text-[11px] md:text-xs leading-relaxed text-neutral-400 uppercase tracking-widest max-w-xl px-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                            This spiritual gateway has been strictly sealed by absolute decree of{' '}
                            <span className="text-neutral-200 font-bold underline decoration-[#e83030]/60 decoration-2 underline-offset-2 tracking-wider">
                                Central 46
                            </span>
                            . All access logs are registered; infiltration is punishable under soul society martial law.
                        </p>

                        {/* Bottom System Code */}
                        <div className="text-[10px] font-mono text-neutral-500 tracking-[0.2em] uppercase mt-0.5">
                            Crypt_ID // 046-FUIN-REIATSU-GATE
                        </div>

                        {/* ⚡ PREMIUM ACTION ZONE ⚡ */}
                        <div className="w-full max-w-md border-t border-white/[0.04] flex flex-col items-center gap-2 group/btn">
                            <Button
                                variant="primary"
                                onClick={() => navigate('/')} // 👈 ใช้งาน navigate จาก Senkaimon ตรงนี้
                                className="w-full text-[11px] tracking-[0.3em] font-black relative overflow-hidden group/shimmer shadow-[0_0_17px_rgba(200,169,110,0.05)] hover:shadow-[0_0_27px_rgba(200,169,110,0.2)] duration-300"
                            >
                                {/* Effect แสงวิ่งผ่าน (Reiatsu Shimmer) ตอนเมาส์ชี้ */}
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-hover/shimmer:animate-[gateShimmer_1.5s_infinite]" />

                                <span className="relative z-10 flex items-center justify-center gap-2 transition-transform duration-300 group-hover/shimmer:translate-x-[-4px]">
                                    ← RETURN TO CORE GATEWAY
                                </span>
                            </Button>

                            {/* Tactical Subtext ที่จะสว่างขึ้นเมื่อโฮเวอร์บริเวณปุ่ม */}
                            <span className="text-[10px] font-mono text-neutral-300 tracking-[0.15em] uppercase opacity-40 group-hover/btn:opacity-100 transition-opacity duration-300">
                                Bypass Protocol // Redirecting to Living World Gateway
                            </span>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}