// src/lib/wallpaper.ts
import wallpaperData from '@/src/data/wallpapers.json';

export const getWallpapers = (): string[] => {
    // ถ้าไฟล์ใน JSON เรียงแบบ 1, 10, 11 (Alphabetical) แนะนำให้ Sort ก่อนดึงไปใช้ครับ
    return wallpaperData.files.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        return numA - numB;
    });
};

export const getWallpaperCount = (): number => {
    return wallpaperData.count;
};