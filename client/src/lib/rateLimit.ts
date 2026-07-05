// src/lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';   // ← เพิ่มบรรทัดนี้

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const apiRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 s'),
});

export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim();
    if (!ip) {
        throw new Error('Unable to determine client IP');
    }
    return ip;
}

export function getRateLimitKey(req: NextRequest): string {
    const ip = getClientIp(req);
    const path = new URL(req.url).pathname;
    return `${ip}:${path}`;
}