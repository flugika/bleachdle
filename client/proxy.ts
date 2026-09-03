// proxy.ts

// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { edgeRateLimit } from './src/lib/rateLimit';

// ==========================================
// 🔑 Guarded route registry
// ==========================================
// เพิ่ม route ใหม่แค่เติม entry เดียวในนี้ ไม่ต้องเขียน logic ซ้ำ
type GuardConfig = {
    pathPrefix: string;
    secret: string | undefined;
    cookieName: string;
    headerName: string;
    cookiePath: string; // '/' ถ้ามี client fetch ไป /api/... คนละ path
    devBypass: boolean; // true = อนุญาตแบบไม่ต้องมี secret ตอน NODE_ENV !== 'production'
};

const GUARDS: GuardConfig[] = [
    {
        pathPrefix: '/soul-society-archives',
        secret: process.env.ADMIN_SECRET_KEY,
        cookieName: 'bleachdle_admin_auth',
        headerName: 'x-archive-key',
        cookiePath: '/soul-society-archives',
        devBypass: false, // หน้าเฉลยเกม ห้ามหลุดแม้ dev
    },
    {
        pathPrefix: '/monitor',
        secret: process.env.MONITOR_SECRET_KEY,
        cookieName: 'mntr_key',
        headerName: 'x-monitor-key',
        cookiePath: '/',
        devBypass: true,
    },
    {
        pathPrefix: '/mockup',
        secret: process.env.MOCKUP_SECRET_KEY,
        cookieName: 'mckp_key',
        headerName: 'x-mockup-key',
        cookiePath: '/',
        devBypass: true,
    },
];

export const config = {
    matcher: [
        '/api/:path*',
        '/soul-society-archives/:path*',
        '/monitor/:path*',
        '/mockup/:path*',
    ],
};

// ==========================================
// 🛡️ Utilities
// ==========================================

// เทียบ secret แบบ constant-time กัน timing attack
// (แม้ risk จริงจะต่ำในเคสนี้ แต่เป็น best practice มาตรฐานเวลาต้องเทียบ secret กับ input จากภายนอก)
function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

// Deny แบบ "ไม่ให้รู้ว่า route นี้มีอยู่จริง"
// สำคัญ: ห้าม rewrite ไปที่ '/404' ตรงๆ เพราะ App Router ไม่มี route file
// ชื่อ /404 จริง (ต่างจาก Pages Router) — rewrite ไปที่ path ที่ "ไม่มีอยู่จริง"
// ต่างหาก ที่จะทำให้ Next.js เรียก not-found.tsx ให้เองพร้อม status 404 ที่ถูกต้อง
// เติม random suffix กัน path ชนกับ route จริงในอนาคตโดยบังเอิญ
function denyAsNotFound(req: NextRequest): NextResponse {
    const notFoundUrl = new URL(`/__sealed__`, req.url);
    const response = NextResponse.rewrite(notFoundUrl, { status: 404 });
    // กัน CDN/browser cache จำ response 404 นี้ไว้ (ไม่งั้น cache ที่ edge
    // อาจทำให้ request ครั้งถัดไปได้ 404 ค้างแม้ auth ผ่านแล้วก็ตาม)
    response.headers.set('Cache-Control', 'no-store');
    return response;
}

// Log security event แยกจุดเดียว เผื่อต่อ Sentry/Datadog/SIEM ทีหลัง
function logAccessDenied(pathname: string, ip: string, reason: string) {
    console.warn(`[SECURITY] Access denied: ${pathname} | ip=${ip} | reason=${reason}`);
}

// ==========================================
// 🛡️ Core guard logic — ใช้ซ้ำได้ทุก route ใน GUARDS
// ==========================================
function evaluateGuard(req: NextRequest, guard: GuardConfig, ip: string): NextResponse {
    const { secret, cookieName, headerName, cookiePath, devBypass } = guard;
    const pathname = req.nextUrl.pathname;

    if (!secret) {
        // ลืมตั้ง ENV ตอน deploy — ป้องกันเคสเผลอเปิดให้ทุกคนใน production
        if (devBypass && process.env.NODE_ENV !== 'production') {
            return NextResponse.next();
        }
        logAccessDenied(pathname, ip, 'secret_not_configured');
        return denyAsNotFound(req);
    }

    const cookieValue = req.cookies.get(cookieName)?.value;
    const hasValidCookie = !!cookieValue && safeCompare(cookieValue, secret);
    const headerValue = req.headers.get(headerName);
    const hasValidHeader = !!headerValue && safeCompare(headerValue, secret);
    const secretParam = req.nextUrl.searchParams.get('secret');

    // Exchange query param → cookie ครั้งแรก แล้ว redirect ตัด query ทิ้งเสมอ
    // (ไม่ว่าจะมี cookie อยู่แล้วหรือไม่ กัน ?secret= ค้างใน URL/history/log)
    if (secretParam && safeCompare(secretParam, secret)) {
        const clean = new URL(pathname, req.url);
        const response = NextResponse.redirect(clean, { status: 303 });
        if (!hasValidCookie) {
            response.cookies.set(cookieName, secret, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: cookiePath,
            });
        }
        return response;
    }

    if (hasValidCookie || hasValidHeader) {
        return NextResponse.next();
    }

    logAccessDenied(pathname, ip, 'invalid_or_missing_credentials');
    return denyAsNotFound(req);
}

// ==========================================
// Entry point
// ==========================================
export async function proxy(req: NextRequest) {
    const url = req.nextUrl;
    const pathname = url.pathname;

    const rawIp = req.headers.get('x-forwarded-for')
        ?? req.headers.get('x-real-ip')
        ?? '127.0.0.1';
    const ip = rawIp.split(',')[0].trim();

    // ---- Guarded routes (archives / monitor / mockup) ----
    const matchedGuard = GUARDS.find((g) => pathname.startsWith(g.pathPrefix));
    if (matchedGuard) {
        return evaluateGuard(req, matchedGuard, ip);
    }

    // ---- Asset routes ----
    if (pathname.startsWith('/api/asset')) {
        const isAllowed = edgeRateLimit(`asset:${ip}`, 120, 10000);
        if (!isAllowed) {
            return NextResponse.json(
                { error: 'Asset rate limit exceeded. Please slow down.' },
                { status: 429 }
            );
        }
        return NextResponse.next();
    }

    // ---- Sensitive API routes ----
    if (pathname.startsWith('/api')) {
        const isAllowed = edgeRateLimit(`api:${ip}`, 10, 10000);
        if (!isAllowed) {
            return NextResponse.json(
                { error: 'Too many API requests.' },
                { status: 429 }
            );
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}