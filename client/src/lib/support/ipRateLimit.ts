// src/lib/support/ipRateLimit.ts

// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

import { NextRequest } from 'next/server';
import crypto from 'crypto';

// สร้างตัวเก็บข้อมูลชั่วคราวในระดับ Global (ไม่หายไปเมื่อเปลี่ยนไฟล์)
const ipCache = new Map<string, { count: number; resetAt: number }>();

// สั่งล้างหน่วยความจำที่หมดอายุทุกๆ 1 นาที เพื่อไม่ให้เกิด Memory Leak
declare global {
     
    var _ipCleanupInterval: ReturnType<typeof setInterval> | undefined;
}

if (typeof global !== 'undefined' && !global._ipCleanupInterval) {
    global._ipCleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, value] of ipCache.entries()) {
            if (now > value.resetAt) {
                ipCache.delete(key);
            }
        }
    }, 60000);
}

/**
 * แปลง IP ของผู้ใช้ให้เป็นรหัสแฮชสุ่มเพื่อความเป็นส่วนตัว 100%
 */
function getAnonymizedIpHash(req: NextRequest): string {
    // 1. ดึงจาก x-forwarded-for (มักจะได้มาเป็นสาย "IP_Client, IP_Proxy1, IP_Proxy2")
    const forwardedFor = req.headers.get('x-forwarded-for');

    // 2. ถ้ามี x-forwarded-for ให้ตัดเอาตัวแรกสุด (นั่นแหละ IP จริงของยูสเซอร์)
    // 3. ถ้าไม่มี ให้ลองดู x-real-ip ถ้าไม่เจอจริงๆ ค่อยหล่นไปที่ 127.0.0.1
    const ip = forwardedFor
        ? forwardedFor.split(',')[0].trim()
        : (req.headers.get('x-real-ip') || '127.0.0.1');

    const salt = process.env.IP_SALT || 'bleachdle-soul-society-salt-2026';
    return crypto.createHash('sha256').update(`${ip}-${salt}`).digest('hex');
}

/**
 * ตรวจสอบความถี่ในการยิงโดยอ้างอิงจากแฮชของ IP (ไม่ต้องพึ่งพิงคุกกี้)
 */
export function checkIpRateLimit(
    req: NextRequest,
    limit: number,
    windowSeconds: number
) {
    const ipHash = getAnonymizedIpHash(req);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const record = ipCache.get(ipHash);

    // 1. ถ้ายิงมาครั้งแรก หรือหมดหน้าต่างเวลาคูลดาวน์เดิมแล้ว -> เริ่มนับใหม่
    if (!record || now > record.resetAt) {
        ipCache.set(ipHash, { count: 1, resetAt: now + windowMs });
        return { success: true, retryAfter: 0 };
    }

    // 2. ถ้ายิงเกินโควตาที่กำหนดในหน้าต่างเวลานี้ -> บล็อกทันที
    if (record.count >= limit) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        return { success: false, retryAfter };
    }

    // 3. ผ่านด่าน -> อัปเดตจำนวนครั้ง
    record.count += 1;
    return { success: true, retryAfter: 0 };
}