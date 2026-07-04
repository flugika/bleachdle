// src/hooks/useDailyWallpaper.ts
"use client";
import { useEffect } from 'react';
import { getWallpapers } from '@/src/lib/utils/ui';

export const useDailyWallpaper = () => {
    useEffect(() => {
        const files = getWallpapers();
        if (files.length === 0) return;

        // 1. คำนวณหาลำดับวันของปี (1-365)
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay); // ได้เลข 1 ถึง 365

        // 2. คำนวณ Index โดยใช้ modulo กับจำนวนไฟล์ที่มีจริง
        // คราวนี้มันจะวนลูปผ่านทั้ง 41 รูปไปเรื่อยๆ ตลอดทั้งปีครับ
        const index = (dayOfYear - 1) % files.length;
        const selectedWallpaper = files[index];

        document.documentElement.style.setProperty(
            '--bg-image',
            `url('/assets/wallpapers/${selectedWallpaper}')`
        );
    }, []);
};