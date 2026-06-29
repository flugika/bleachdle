'use client';

import { useState } from 'react';
import ZangetsuLoader from '@/src/shared/ui/loader/ZangetsuLoader';

export default function LoadingPreview() {
    const [isLoading, setIsLoading] = useState(true);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center w-screen h-screen bg-[#020205] text-white overflow-hidden select-none">

            {/* 🌌 [BOTTOM ZONE: z-0] เลเยอร์พื้นหลังและแสงเงา (ต้องอยู่ใต้สุดเพื่อไม่ให้บังตัวอักษร) */}
            <div className="absolute inset-0 bg-ambient-void pointer-events-none z-0"></div>
            {/* ย้าย Vignette มาไว้ตรงนี้ เพื่อทำหน้าที่ถมขอบจอให้มืดลง โดยไม่ทับ UI ตัวอักษรและกริด */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#010103_98%)] pointer-events-none z-0 opacity-60"></div>

            {/* LAYER 6: เส้นตัดมิติรอยดาบเฉียงพาดหน้าจอ */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-[150%] h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent rotate-[-35deg] blur-[1px]"></div>
                <div className="absolute w-[150%] h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent rotate-[-35deg] animate-pulse"></div>
            </div>


            {/* 🎬 [FOREGROUND ZONE: z-20] เอฟเฟกต์หน้าจอและกรอบล็อคเป้ามุมจอ */}

            {/* LAYER 1: เส้นสแกนไลน์ฟิล์มภาพยนตร์ (ทับเลเยอร์ UI ทั้งหมดเพื่อสร้าง Texture ผิวฟิล์ม) */}
            <div className="absolute inset-0 bleach-scanlines pointer-events-none z-20 opacity-40"></div>

            {/* LAYER 7: กรอบล็อกเป้าแรงดันวิญญาณขอบจอ */}
            <div className="absolute inset-8 pointer-events-none z-20">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-solid border-white/30"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-solid border-white/30"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-solid border-white/30"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-solid border-white/30"></div>

                <span className="absolute bottom-2 left-8 font-mono text-[9px] tracking-[0.4em] text-white/40 uppercase">System // Reiatsu_Locked</span>
                <span className="absolute top-2 right-8 font-mono text-[9px] tracking-[0.4em] text-cyan-400/70 uppercase font-bold">Stage_3 // Bankai_Unleashed</span>
            </div>


            {/* 💎 [CORE ZONE: z-30] ตัว Loader หลักและข้อความอนิเมชัน */}
            <div className="relative z-30 flex flex-col items-center justify-center translate-y-[-12px]">
                <ZangetsuLoader />
            </div>
        </div>
    );
}