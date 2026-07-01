// src/app/api/stats/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/supabase';

const VALID_MODES = ['character', 'song', 'image', 'release', 'emoji'] as const;
type StatMode = typeof VALID_MODES[number];

interface FinalizeStatBody {
    mode: StatMode;
    isWin: boolean;
    guessCount: number;
}

export async function POST(req: NextRequest) {
    let body: FinalizeStatBody;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { mode, isWin, guessCount } = body;

    // ── Validate input ก่อนแตะ DB เสมอ เพราะนี่คือ public endpoint
    if (!VALID_MODES.includes(mode)) {
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }
    if (typeof isWin !== 'boolean') {
        return NextResponse.json({ error: 'isWin must be boolean' }, { status: 400 });
    }
    if (!Number.isInteger(guessCount) || guessCount < 1 || guessCount > 10) {
        return NextResponse.json({ error: 'Invalid guessCount' }, { status: 400 });
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

    return NextResponse.json({ success: true });
}