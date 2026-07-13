import type { NextConfig } from "next";

// 🔧 เดิม headers() ใส่ Cache-Control ให้ path /assets/audio/:path* เพราะไฟล์เสียง
// เคยอยู่ใน public/assets/audio (Next serve เป็น static file ตรงๆ) — headers() ใน
// next.config ทำงานกับ static asset / route ที่มีอยู่จริงเท่านั้น มันไม่ได้ "ย้าย"
// หรือ "สร้าง" อะไรให้ ตอนนี้ไฟล์ย้ายไปไว้ที่ /assets-private (ระดับเดียวกับ public/,
// นอก webroot) แล้ว path /assets/audio/:path* เลยไม่มีไฟล์ให้ match อีกต่อไป —
// ตัด rule นี้ทิ้ง แล้วไปเซ็ต Cache-Control ตรงในตัว route handler ที่ serve ไฟล์แทน
// (ดู src/app/api/asset/audio/[...path]/route.ts)
const nextConfig: NextConfig = {};

export default nextConfig;