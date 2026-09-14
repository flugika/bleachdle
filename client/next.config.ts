import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ลด breakpoint ให้เหลือเท่าที่จำเป็นจริงๆ สำหรับเกมนี้
    // (การ์ดตัวละคร, silhouette, emblem ส่วนใหญ่ไม่ต้องการหลาย breakpoint ขนาดนี้)
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [64, 128, 256],
    
    // Cache รูปที่ transform แล้วให้นานขึ้น ลดการ re-transform ซ้ำ
    minimumCacheTTL: 2678400, // 31 วัน
  },
};

export default nextConfig;