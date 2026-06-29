// src/components/WallpaperInitializer.tsx
"use client"; // ประกาศว่าอันนี้คือ Client Component

import { useDailyWallpaper } from "./useDailyWallpaper"; // ปรับ path ให้ถูกนะครับ
import { useTestWallpaper } from "./useTestWallpaper";

export const WallpaperInitializer = () => {
    useTestWallpaper();
    // useDailyWallpaper(); // รัน Hook ตรงนี้
    return null; // ไม่ต้อง render อะไรออกมาทั้งสิ้น
};