// app/api/stats/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { packCookie, unpackCookie } from '@/src/lib/support/rateLimitCookie';
import { VALID_STAT_MODES, type StatMode } from '@/src/entities/stats/types';
import { checkIpRateLimit } from '@/src/lib/support/ipRateLimit';
import { getMaxGuessLimit } from '@/src/lib/support/constantsExtractor'; // 🆕 นำเข้า Lib ตัวกรองไดนามิก
import { getTodayStr } from '@/src/lib/utils/format';

interface FinalizeStatBody {
    mode: StatMode;
    isWin: boolean;
    guessCount: number;
}

const COOLDOWN_SECONDS = 5;
const COOLDOWN_COOKIE_PREFIX = 'sfz_cd_';

export async function POST(req: NextRequest) {
    let body: FinalizeStatBody;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { mode, isWin, guessCount } = body;

    // ── ด่าน 1: Cheap, in-memory validation
    if (!VALID_STAT_MODES.includes(mode)) {
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
    if (typeof isWin !== 'boolean') {
        return NextResponse.json({ error: 'isWin must be boolean' }, { status: 400 });
    }

    // 🎯 ใช้ Lib ค้นหาเพดานสูงสุดที่กรองจาก MAX_..._GUESSES ของโหมดนั้นๆ
    // เนื่องจาก API นี้เป็นสถิติประจำเป็นวัน (increment_daily_stat) จึงกำหนดเป็น 'DAILY'
    const dynamicMaxGuesses = getMaxGuessLimit(mode, 'DAILY');

    // 🛡️ ตรวจสอบความถูกต้องโดยอิงจากค่าเพดานที่สแกนได้จริง
    if (!Number.isInteger(guessCount) || guessCount < 1 || guessCount > dynamicMaxGuesses) {
        return NextResponse.json({ error: 'Invalid guessCount' }, { status: 400 });
    }

    // ── ด่าน 2: Cooldown check ด้วย Browser Cookie
    const cookieName = `${COOLDOWN_COOKIE_PREFIX}${mode}`;
    const cooldownPayload = unpackCookie(req.cookies.get(cookieName)?.value);
    if (cooldownPayload) {
        const lastSubmitMs = Number(cooldownPayload);
        if (Number.isFinite(lastSubmitMs)) {
            const elapsedSec = (Date.now() - lastSubmitMs) / 1000;
            if (elapsedSec < COOLDOWN_SECONDS) {
                const retryAfter = Math.ceil(COOLDOWN_SECONDS - elapsedSec);
                return NextResponse.json({ error: 'Too many requests, slow down.', retryAfter }, { status: 429 });
            }
        }
    }

    // ── ด่าน 3: สกัดกั้นด้วย IP Rate Limit
    const ipCheck = checkIpRateLimit(req, 1, COOLDOWN_SECONDS);
    if (!ipCheck.success) {
        return NextResponse.json(
            { error: 'Kido Barrier: Rate limit exceeded by IP network.', retryAfter: ipCheck.retryAfter },
            { status: 429 }
        );
    }

    // ผ่านทุกด่าน -> บันทึกข้อมูลลง Supabase
    const todayStr = getTodayStr();
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