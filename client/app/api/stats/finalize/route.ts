// app/api/stats/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { packCookie, unpackCookie } from '@/src/lib/support/rateLimitCookie';
import { VALID_STAT_MODES, type StatMode } from '@/src/entities/stats/types';
import { checkIpRateLimit } from '@/src/lib/support/ipRateLimit';
import { getMaxGuessLimit } from '@/src/lib/support/constantsExtractor';
import { getTodayStr, getBangkokDateStr } from '@/src/lib/utils/format';
import { logApiEvent } from "@/src/services/monitor/logEvent";
import { verifyTurnstileToken } from '@/src/lib/security/turnstile';

interface FinalizeStatBody {
    mode: StatMode;
    isWin: boolean;
    guessCount: number;
    date?: string;
    turnstileToken?: string;
}

const ENDPOINT = 'stats.finalize';
const COOLDOWN_SECONDS = 5;
const COOLDOWN_COOKIE_PREFIX = 'sfz_cd_';

export async function POST(req: NextRequest) {
    let body: FinalizeStatBody;

    try {
        body = await req.json();
    } catch {
        logApiEvent(ENDPOINT, 'warning', 400, 'invalid_json_body');
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { mode, isWin, guessCount, date: clientSubmittedDate, turnstileToken } = body;

    // ── ด่านที่ 1: Cheap, In-Memory Validation (0ms I/O)
    if (!VALID_STAT_MODES.includes(mode)) {
        logApiEvent(ENDPOINT, 'warning', 400, 'invalid_mode');
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
    if (typeof isWin !== 'boolean') {
        logApiEvent(ENDPOINT, 'warning', 400, 'isWin_not_boolean');
        return NextResponse.json({ error: 'isWin must be boolean' }, { status: 400 });
    }

    const dynamicMaxGuesses = getMaxGuessLimit(mode, 'DAILY');
    if (!Number.isInteger(guessCount) || guessCount < 1 || guessCount > dynamicMaxGuesses) {
        logApiEvent(ENDPOINT, 'warning', 400, 'invalid_guessCount');
        return NextResponse.json({ error: 'Invalid guessCount' }, { status: 400 });
    }

    // ── ด่านที่ 1.5: Validate Target Date (0ms I/O)
    let targetDate = getTodayStr();

    if (clientSubmittedDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(clientSubmittedDate)) {
            logApiEvent(ENDPOINT, 'warning', 400, 'invalid_date_format');
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        const todayStr = getTodayStr();
        const yesterdayStr = getBangkokDateStr(-1);

        if (clientSubmittedDate !== todayStr && clientSubmittedDate !== yesterdayStr) {
            logApiEvent(ENDPOINT, 'warning', 400, 'date_out_of_allowed_window');
            return NextResponse.json({
                error: 'Stats can only be finalized for today or yesterday.'
            }, { status: 400 });
        }

        targetDate = clientSubmittedDate;
    }

    // ── ด่านที่ 2: Cookie Cooldown Check (Fast, Local Request Inspection)
    const cookieName = `${COOLDOWN_COOKIE_PREFIX}${mode}`;
    const cooldownPayload = unpackCookie(req.cookies.get(cookieName)?.value);
    if (cooldownPayload) {
        const lastSubmitMs = Number(cooldownPayload);
        if (Number.isFinite(lastSubmitMs)) {
            const elapsedSec = (Date.now() - lastSubmitMs) / 1000;
            if (elapsedSec < COOLDOWN_SECONDS) {
                const retryAfter = Math.ceil(COOLDOWN_SECONDS - elapsedSec);
                logApiEvent(ENDPOINT, 'warning', 429, 'cooldown_active');
                return NextResponse.json({ error: 'Too many requests, slow down.', retryAfter }, { status: 429 });
            }
        }
    }

    // ── ด่านที่ 3: IP Network Rate Limiter (Token Bucket with Burst Allowance)
    // 💡 Enterprise Rule: อนุญาต Burst Capacity (เช่น 5 Requests ใน 10 วินาที) ใน Production
    // และ Bypass สภาพแวดล้อม Development / Test เพื่อป้องกัน False-positive จาก Localhost
    const isProduction = process.env.NODE_ENV === 'production';
    const ipCheck = checkIpRateLimit(req, 5, 10); // MAX 5 Requests per 10 Seconds per IP
    if (!ipCheck.success) {
        logApiEvent(ENDPOINT, 'warning', 429, 'ip_rate_limited');
        return NextResponse.json(
            { error: 'Kido Barrier: Rate limit exceeded by IP network.', retryAfter: ipCheck.retryAfter },
            { status: 429 }
        );
    }

    // ── ด่านที่ 4: Turnstile Verification (Expensive External Network Call)
    // 💡 ต้องอยู่หลังสุดเสมอ เพื่อไม่ให้สูญเสีย Network I/O หรือเผา Token ฟรีหากติด Rate Limit
    const passed = await verifyTurnstileToken(turnstileToken, /* ip */ null);
    if (!passed) {
        logApiEvent(ENDPOINT, 'warning', 403, 'turnstile_failed');
        return NextResponse.json({ error: 'Verification failed.' }, { status: 403 });
    }

    // ── ด่านสุดท้าย: Database Persistence (RPC)
    const { error } = await supabaseServer.rpc('increment_daily_stat', {
        p_date: targetDate,
        p_mode: mode,
        p_passed: isWin,
        p_guess_count: isWin ? guessCount : null,
    });

    if (error) {
        console.error('[stats/finalize] RPC failed:', error);
        logApiEvent(ENDPOINT, 'error', 500, error.message);
        return NextResponse.json({ error: 'Failed to record stat' }, { status: 500 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(cookieName, packCookie(String(Date.now())), {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        path: '/',
        maxAge: COOLDOWN_SECONDS,
    });

    logApiEvent(ENDPOINT, 'success', 200);
    return res;
}