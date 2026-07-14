// src/components/WallpaperInitializer.tsx
"use client"; // ประกาศว่าอันนี้คือ Client Component

import { useDailyWallpaper } from "@/src/shared/hooks/useDailyWallpaper"; // ปรับ path ให้ถูกนะครับ
// import { useTestWallpaper } from "@/src/shared/hooks/useTestWallpaper";

export const WallpaperInitializer = () => {
    // useTestWallpaper();
    useDailyWallpaper(); // รัน Hook ตรงนี้
    return null; // ไม่ต้อง render อะไรออกมาทั้งสิ้น
};