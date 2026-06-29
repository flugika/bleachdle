// src/hooks/useTestWallpaper.ts
"use client";
import { useEffect } from 'react';
import { getWallpapers } from '@/src/lib/utils/ui';

export const useTestWallpaper = () => {
    useEffect(() => {
        const updateWallpaper = () => {
            const files = getWallpapers();
            if (files.length === 0) return;

            // ใช้ getMinutes() เพื่อเปลี่ยนภาพตามนาทีปัจจุบัน (0-59)
            const currentMinute = new Date().getMinutes();

            // ใช้ % files.length เพื่อให้วนลูปถ้ามีรูปน้อยกว่า 60 รูป
            const index = currentMinute % files.length;
            const selectedWallpaper = files[index];

            console.log(`⏱️ Wallpaper changed to: ${selectedWallpaper}`); // ไว้เช็คใน Console

            document.documentElement.style.setProperty(
                '--bg-image',
                `url('/assets/${selectedWallpaper}')`
            );
        };

        // รันครั้งแรกทันที
        updateWallpaper();

        // ตั้งเวลาให้เปลี่ยนทุก 1 นาที (60,000 ms)
        const interval = setInterval(updateWallpaper, 60000);

        // Cleanup function (สำคัญมากเพื่อป้องกัน Memory Leak)
        return () => clearInterval(interval);
    }, []);
};