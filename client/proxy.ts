// proxy.ts (วางที่ root ของ client/ แทนที่ middleware.ts)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiRateLimit, getRateLimitKey } from './src/lib/rateLimit';

export async function proxy(req: NextRequest) {
    let key: string;
    try {
        key = getRateLimitKey(req);
    } catch {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    try {
        const { success } = await apiRateLimit.limit(key);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }
    } catch (err) {
        console.error('[proxy] rate limit check failed, allowing request:', err);
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};