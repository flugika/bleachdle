import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        // ลด breakpoint ให้เหลือเท่าที่จำเป็นจริงๆ สำหรับเกมนี้
        deviceSizes: [640, 828, 1200, 1920],
        imageSizes: [64, 128, 256],

        // Cache รูปที่ transform แล้วให้นานขึ้น ลดการ re-transform ซ้ำ
        minimumCacheTTL: 2678400, // 31 วัน

        // ใช้ format เดียว ลด transformation ต่อรูป (ต้นทางเป็น .webp อยู่แล้ว)
        formats: ['image/webp'],

        // จำกัด quality ที่อนุญาต ลด variation ของ transformation
        qualities: [75],
    },
};

export default nextConfig;