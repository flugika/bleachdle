// proxy.ts

// /soul-society-archives?secret=

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { edgeRateLimit, getRateLimitKey } from './src/lib/rateLimit';

// 🔑 คีย์ลับสิทธิ์ Admin — ต้องตั้งใน .env (ห้าม hardcode fallback ใน production)
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;
const SECRET_COOKIE_NAME = 'bleachdle_admin_auth';
const SECRET_HEADER_NAME = 'x-archive-key'; // ใช้ header แทน query string เพื่อไม่ให้หลุดใน log/history

export async function proxy(req: NextRequest) {
    const url = req.nextUrl;
    const pathname = url.pathname;

    // ==========================================
    // 🛡️ SECURITY LAYER: Soul Society Archives Gatekeeper
    // ==========================================
    // ✅ FIX: เดิมเช็ค 'src/soul-society-archives' (ไม่มี '/' นำหน้า) ทำให้เงื่อนไขนี้
    // ไม่เคยเป็นจริง เพราะ pathname ของ Next.js จะขึ้นต้นด้วย '/' เสมอ
    // ผลคือหน้าเฉลยเปิดให้ทุกคนเข้าได้แบบไม่มีการป้องกันใดๆ เลยในโปรดักชัน
    if (pathname.startsWith('/soul-society-archives')) {
        if (!ADMIN_SECRET) {
            // ป้องกันเคส ลืมตั้ง ENV ตอน deploy แล้วเผลอเปิดหน้าเฉลยให้ทุกคน
            return NextResponse.rewrite(new URL('/404', req.url));
        }

        const hasCookie = req.cookies.has(SECRET_COOKIE_NAME);

        // ✅ อ่าน secret จาก header แทน query param
        // (query param จะไปโผล่ใน server access log, Vercel analytics, browser history,
        //  และ Referer header ตอนคลิกลิงก์ออกจากหน้านั้น — header ไม่หลุดไปที่ไหนพวกนี้)
        const secretHeader = req.headers.get(SECRET_HEADER_NAME);
        // รองรับ query param ไว้ "เฉพาะตอน exchange เป็น cookie ครั้งแรก" เท่านั้น (ดูด้านล่าง)
        const secretParam = url.searchParams.get('secret');

        if (hasCookie || secretHeader === ADMIN_SECRET) {
            return NextResponse.next();
        }

        if (secretParam === ADMIN_SECRET) {
            // แลก query param เป็น cookie แล้ว "redirect ตัด query string ทิ้งทันที"
            // เพื่อไม่ให้ secret ค้างอยู่ใน URL bar / history / referrer อีกต่อไป
            const clean = new URL(pathname, req.url);
            const response = NextResponse.redirect(clean, { status: 303 });
            response.cookies.set(SECRET_COOKIE_NAME, 'authorized', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // ลดจาก 30 วัน เหลือ 7 วัน (ลดเวลาเสี่ยงถ้าลิงก์หลุด)
                path: '/soul-society-archives',
            });
            return response;
        }

        // ปฏิเสธสิทธิ์: แกล้งทำเป็น 404
        return NextResponse.rewrite(new URL('/404', req.url));
    }

    // ==========================================
    // ⚡ RATE LIMIT LAYER: API Protection Engine
    // ==========================================
    if (pathname.startsWith('/api')) {
        let key: string;
        try {
            key = getRateLimitKey(req);
        } catch {
            return NextResponse.json({ error: 'Bad request' }, { status: 400 });
        }

        const isAllowed = edgeRateLimit(key, 5, 10000);

        if (!isAllowed) {
            return NextResponse.json(
                { error: 'Too many requests, slow down.' },
                { status: 429 }
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/api/:path*',
        '/soul-society-archives/:path*',
    ],
};