// src/lib/rateLimit.ts
//
// ⚠️ SCOPE OF THIS FILE: this is a cheap, best-effort burst brake for a
// single edge instance. It is NOT the defense against pairing-code
// brute-force — that job belongs to pairing_codes.attempt_count in Postgres
// (see 001_pairing_schema.sql: check_pairing_code / confirm_pairing), which
// is the single source of truth across every region/instance and cannot be
// bypassed by spreading requests across IPs or edge nodes.
//
// Use this for what it's actually good at: slowing down a single client
// hammering an endpoint. Do not rely on it alone for anything where the
// attack surface is "guess a short code" or "brute force a secret".
import type { NextRequest } from 'next/server';

interface Bucket {
    count: number;
    windowStart: number;
}

const memoryStore = new Map<string, Bucket>();

// Periodic sweep instead of "only clean up on next hit to the same key" —
// the old version leaked entries forever for one-shot IPs. Cheap timer,
// bounded by SWEEP_INTERVAL_MS regardless of traffic shape.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
    if (now - lastSweep < SWEEP_INTERVAL_MS) return;
    lastSweep = now;
    for (const [key, bucket] of memoryStore) {
        if (now - bucket.windowStart > windowMs * 2) memoryStore.delete(key);
    }
}

export function getClientIp(req: NextRequest): string {
    // NOTE: only trust this if your deployment target strips/overwrites
    // inbound X-Forwarded-For before it reaches the app (Vercel and
    // Cloudflare do this correctly by default when properly configured).
    // If self-hosting behind a bare reverse proxy, verify this explicitly —
    // otherwise a client can spoof this header and evade the limiter
    // entirely by rotating a fake IP on every request.
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim();
    return ip || '127.0.0.1';
}

export function getRateLimitKey(req: NextRequest): string {
    const ip = getClientIp(req);
    const path = new URL(req.url).pathname;
    return `${ip}:${path}`;
}

/**
 * Sliding-ish window: instead of a hard reset at windowStart + windowMs
 * (which lets 2x limit through at the boundary), we shift the window start
 * forward once it's fully elapsed rather than deleting-and-recreating, and
 * treat "count" as approximate-over-the-last-window. Good enough for burst
 * suppression; still not a substitute for the DB-backed check above.
 */
export function edgeRateLimit(key: string, limit = 5, windowMs = 10_000): boolean {
    const now = Date.now();
    sweep(now, windowMs);

    const bucket = memoryStore.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
        memoryStore.set(key, { count: 1, windowStart: now });
        return true;
    }

    if (bucket.count >= limit) return false;

    bucket.count += 1;
    return true;
}