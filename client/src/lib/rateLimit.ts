// src/lib/rateLimit.ts
import type { NextRequest } from 'next/server';

// 🧠 เก็บข้อมูลแฮชใน Memory ของ Edge Node ตัวนั้นๆ (0 Cost)
// ข้อจำกัด: ถ้า Edge Instance ดับหรือกระจายไปคนละภูมิภาค คิวสุ่มจะแยกกัน 
// แต่สำหรับกันบอทยิงรัว (Burst Attack) ถือว่าเอาอยู่ 100% โดยไม่ต้องพึ่งฐานข้อมูล
const memoryStore = new Map<string, { count: number; resetTime: number }>();

export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim();
    return ip || '127.0.0.1';
}

export function getRateLimitKey(req: NextRequest): string {
    const ip = getClientIp(req);
    const path = new URL(req.url).pathname;
    return `${ip}:${path}`;
}

export function edgeRateLimit(key: string, limit = 5, windowMs = 10000): boolean {
    const now = Date.now();
    const record = memoryStore.get(key);

    // ล้างข้อมูลเก่าที่หมดอายุขัย (กัน Memory Leak บน Edge)
    if (record && now > record.resetTime) {
        memoryStore.delete(key);
    }

    const currentRecord = memoryStore.get(key);

    if (!currentRecord) {
        // ครั้งแรกในรอบวินโดวส์นี้
        memoryStore.set(key, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (currentRecord.count >= limit) {
        // เกินจำนวนที่กำหนดใน 10 วินาที
        return false;
    }

    currentRecord.count += 1;
    return true;
}