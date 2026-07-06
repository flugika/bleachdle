// app/api/stats/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { packCookie, unpackCookie } from '@/src/lib/support/rateLimitCookie';
import { VALID_STAT_MODES, type StatMode } from '@/src/entities/stats/types';
import { verifyTurnstileToken } from '@/src/lib/security/turnstile';

interface FinalizeStatBody {
    mode: StatMode;
    isWin: boolean;
    guessCount: number;
    turnstileToken: string;
}

// ── กันยิงถี่: ไม่ต้องเข้มเท่า /api/support (ไม่มีเนื้อหาต้องกัน spam)
// แค่กันสคริปต์ยิงรัวๆ เพื่อปั่นตัวเลข daily_stats
// Turnstile คือชั้นป้องกันเสริม (defense-in-depth) สำหรับคนที่ตั้งใจข้าม cookie cooldown
// (เช่น script ที่ไม่เก็บ cookie หรือ clear cookie ทุกครั้ง) ไม่ได้มาแทน cooldown
const COOLDOWN_SECONDS = 5;
const COOLDOWN_COOKIE_PREFIX = 'sfz_cd_'; // แยก cookie ต่อ mode กันโหมดนึงบล็อกอีกโหมด

export async function POST(req: NextRequest) {
    let body: FinalizeStatBody;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { mode, isWin, guessCount, turnstileToken } = body;

    // ── 1. Cheap, in-memory validation FIRST — ไม่ยิง network call (Turnstile) ทิ้งเปล่าๆ
    // สำหรับ request ที่ malformed อยู่แล้วตั้งแต่ shape พื้นฐาน
    if (!VALID_STAT_MODES.includes(mode)) {
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
    if (typeof isWin !== 'boolean') {
        return NextResponse.json({ error: 'isWin must be boolean' }, { status: 400 });
    }
    if (!Number.isInteger(guessCount) || guessCount < 1 || guessCount > 10) {
        return NextResponse.json({ error: 'Invalid guessCount' }, { status: 400 });
    }
    if (typeof turnstileToken !== 'string' || turnstileToken.length === 0) {
        return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
    }

    // ── 2. Cooldown check (signed cookie, ต่อ mode ต่อ device) ──
    // เช็คก่อน Turnstile เพราะถูกกว่า (ไม่มี network call) — ถ้าติด cooldown อยู่แล้ว
    // ไม่จำเป็นต้องเสีย round-trip ไป Cloudflare เลย
    const cookieName = `${COOLDOWN_COOKIE_PREFIX}${mode}`;
    const cooldownPayload = unpackCookie(req.cookies.get(cookieName)?.value);
    if (cooldownPayload) {
        const lastSubmitMs = Number(cooldownPayload);
        if (Number.isFinite(lastSubmitMs)) {
            const elapsedSec = (Date.now() - lastSubmitMs) / 1000;
            if (elapsedSec < COOLDOWN_SECONDS) {
                const retryAfter = Math.ceil(COOLDOWN_SECONDS - elapsedSec);
                return NextResponse.json(
                    { error: 'Too many requests, slow down.', retryAfter },
                    { status: 429 }
                );
            }
        }
    }

    // ── 3. Turnstile verify (network call — the expensive check, done last) ──
    // const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const isHuman = await verifyTurnstileToken(turnstileToken, null);

    if (!isHuman) {
        return NextResponse.json({ error: 'Security verification failed' }, { status: 403 });
    }

    const todayStr = new Date().toLocaleDateString('en-CA');

    const { error } = await supabaseServer.rpc('increment_daily_stat', {
        p_date: todayStr,
        p_mode: mode,
        p_passed: isWin,
        p_guess_count: isWin ? guessCount : null,
    });

    if (error) {
        console.error('[stats/finalize] RPC failed:', error);
        return NextResponse.json({ error: 'Failed to record stat' }, { status: 500 });
    }

    const res = NextResponse.json({ success: true });

    res.cookies.set(cookieName, packCookie(String(Date.now())), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: COOLDOWN_SECONDS,
    });

    return res;
}