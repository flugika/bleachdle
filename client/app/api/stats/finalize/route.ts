// app/api/stats/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/supabase';
import { packCookie, unpackCookie } from '@/src/lib/support/rateLimitCookie';
import { VALID_STAT_MODES, type StatMode } from '@/src/entities/stats/types';

interface FinalizeStatBody {
    mode: StatMode;
    isWin: boolean;
    guessCount: number;
}

// ── กันยิงถี่: ไม่ต้องเข้มเท่า /api/support (ไม่มีเนื้อหาต้องกัน spam)
// แค่กันสคริปต์ยิงรัวๆ เพื่อปั่นตัวเลข daily_stats
const COOLDOWN_SECONDS = 5;
const COOLDOWN_COOKIE_PREFIX = 'sfz_cd_'; // แยก cookie ต่อ mode กันโหมดนึงบล็อกอีกโหมด

export async function POST(req: NextRequest) {
    let body: FinalizeStatBody;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { mode, isWin, guessCount } = body;

    // ── Validate input ก่อนแตะ DB เสมอ เพราะนี่คือ public endpoint
    if (!VALID_STAT_MODES.includes(mode)) {
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
    if (typeof isWin !== 'boolean') {
        return NextResponse.json({ error: 'isWin must be boolean' }, { status: 400 });
    }
    if (!Number.isInteger(guessCount) || guessCount < 1 || guessCount > 10) {
        return NextResponse.json({ error: 'Invalid guessCount' }, { status: 400 });
    }

    // ── Cooldown check (signed cookie, ต่อ mode ต่อ device) ──
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

    const todayStr = new Date().toLocaleDateString('en-CA');

    const { error } = await supabase.rpc('increment_daily_stat', {
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