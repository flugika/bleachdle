// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { edgeRateLimit, getRateLimitKey } from './src/lib/rateLimit';

export async function proxy(req: NextRequest) {
    let key: string;
    try {
        key = getRateLimitKey(req);
    } catch {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    // 🛡️ จำกัดไอพีละ 5 ครั้ง ต่อ 10 วินาที (คำนวณสดบน Edge ความเร็ว 0ms)
    const isAllowed = edgeRateLimit(key, 5, 10000);

    if (!isAllowed) {
        return NextResponse.json(
            { error: 'Too many requests, slow down.' },
            { status: 429 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};