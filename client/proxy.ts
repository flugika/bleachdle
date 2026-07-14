// proxy.ts

// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

// /soul-society-archives?secret=
// /monitor?secret=

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { edgeRateLimit, getRateLimitKey } from './src/lib/rateLimit';

// 🔑 คีย์ลับสิทธิ์ Admin — ต้องตั้งใน .env (ห้าม hardcode fallback ใน production)
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;
const SECRET_COOKIE_NAME = 'bleachdle_admin_auth';
const SECRET_HEADER_NAME = 'x-archive-key'; // ใช้ header แทน query string เพื่อไม่ให้หลุดใน log/history

// 🔑 คีย์ลับ Monitor dashboard — แยกจาก ADMIN_SECRET_KEY โดยเจตนา
const MONITOR_SECRET = process.env.MONITOR_SECRET;
const MONITOR_COOKIE_NAME = 'mntr_key';
const MONITOR_HEADER_NAME = 'x-monitor-key';

// กฎใหม่ของ Next.js ตัวจับคู่ย้ายกลับมาอยู่ที่นี่
export const config = {
    matcher: [
        '/api/:path*',
        '/soul-society-archives/:path*',
        '/monitor/:path*',
    ],
};

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

        // 🐛 FIX: เดิมเช็ค secretParam เฉพาะตอนที่ยังไม่มี hasCookie เท่านั้น
        // (อยู่ใน else-if ถัดจากบล็อกด้านล่าง) ทำให้ถ้ามี cookie อยู่แล้ว
        // (เช่น bookmark เก่า, tab ที่ยังไม่ reload) แต่ ?secret= ยังค้างอยู่ใน URL
        // โค้ดจะ NextResponse.next() เฉยๆ โดยไม่เคยตัด query string ทิ้งเลย
        // ค่า secret เลยค้างอยู่ใน URL bar / history ต่อไปเรื่อยๆ
        // ➜ ย้ายเช็ค secretParam ขึ้นมาก่อน แล้ว "redirect ตัด query ทิ้งเสมอ"
        // ไม่ว่าจะมี cookie อยู่แล้วหรือไม่ก็ตาม
        if (secretParam === ADMIN_SECRET) {
            const clean = new URL(pathname, req.url);
            const response = NextResponse.redirect(clean, { status: 303 });
            if (!hasCookie) {
                response.cookies.set(SECRET_COOKIE_NAME, 'authorized', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 7, // ลดจาก 30 วัน เหลือ 7 วัน (ลดเวลาเสี่ยงถ้าลิงก์หลุด)
                    path: '/soul-society-archives',
                });
            }
            return response;
        }

        if (hasCookie || secretHeader === ADMIN_SECRET) {
            return NextResponse.next();
        }

        // ปฏิเสธสิทธิ์: แกล้งทำเป็น 404
        return NextResponse.rewrite(new URL('/404', req.url));
    }

    // ==========================================
    // 🛡️ SECURITY LAYER: Monitor Dashboard Gatekeeper
    // ==========================================
    // เดิม /monitor เช็ค key === MONITOR_SECRET ใน page.tsx เฉยๆ แล้ว render
    // ต่อเลย ไม่เคย redirect ตัด query string ทิ้ง ทำให้ ?key=... ค้างอยู่ใน
    // URL bar / history / server access log / referrer ตลอดไปทุกครั้งที่เข้า
    // (เหมือนปัญหาเดิมของ soul-society-archives) และไม่มีจุดไหนตั้ง cookie
    // จริงเลยทั้งที่ comment ใน monitorAuth.ts สัญญาไว้ว่าจะจำให้ — ย้าย auth
    // มาไว้ตรงนี้ ให้ทำงานแบบเดียวกับด้านบนแทน
    if (pathname.startsWith('/monitor')) {
        // ไม่ได้ตั้ง MONITOR_SECRET ไว้ — เปิดได้เฉพาะ local dev เท่านั้น
        // (คงพฤติกรรมเดิมจาก isAuthorizedForMonitor เดิมไว้)
        if (!MONITOR_SECRET) {
            if (process.env.NODE_ENV !== 'production') {
                return NextResponse.next();
            }
            return NextResponse.rewrite(new URL('/404', req.url));
        }

        const hasCookie = req.cookies.get(MONITOR_COOKIE_NAME)?.value === MONITOR_SECRET;
        const secretHeader = req.headers.get(MONITOR_HEADER_NAME);
        const secretParam = url.searchParams.get('secret');

        // 🐛 FIX: เช็ค secretParam ก่อนเสมอ แล้ว redirect ตัด query ทิ้งทุกครั้ง
        // ไม่ว่าจะมี cookie ที่ valid อยู่แล้วหรือไม่ — กัน ?secret= ค้างคาใน URL
        // เวลาเปิดลิงก์เก่าซ้ำทั้งที่ล็อกอินอยู่แล้ว (เคสเดียวกับด้านบน)
        if (secretParam === MONITOR_SECRET) {
            const clean = new URL(pathname, req.url);
            const response = NextResponse.redirect(clean, { status: 303 });
            if (!hasCookie) {
                response.cookies.set(MONITOR_COOKIE_NAME, MONITOR_SECRET, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 7,
                    // ⚠️ path ต้องเป็น '/' ไม่ใช่ '/monitor' — MonitorClient.tsx fetch
                    // ข้อมูล refresh ไปที่ /api/monitor/health ซึ่งอยู่คนละ path,
                    // ถ้า scope cookie ไว้แค่ /monitor จะไม่ถูกส่งไปกับ request นั้น
                    // แล้ว isAuthorizedForMonitor จะปฏิเสธทุกครั้งที่ client refresh
                    path: '/',
                });
            }
            return response;
        }

        if (hasCookie || secretHeader === MONITOR_SECRET) {
            return NextResponse.next();
        }

        // ปฏิเสธสิทธิ์: ไม่ต้องแกล้งเป็น 404 เหมือน archives (ไม่ใช่หน้าเฉลยเกม)
        // แต่ก็ไม่ควรเผยว่าหน้านี้มีอยู่โดยไม่มีเหตุผล — rewrite ไปหน้า sealed แทน
        return NextResponse.rewrite(new URL('/monitor/sealed', req.url));
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