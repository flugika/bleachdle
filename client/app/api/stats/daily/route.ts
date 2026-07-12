// app/api/stats/daily/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';
import { getRateLimitKey, edgeRateLimit } from '@/src/lib/rateLimit';
import { logApiEvent } from "@/src/services/monitor/logEvent";

export const revalidate = 60; // stats ไม่จำเป็นต้อง realtime, cache ที่ edge 1 นาทีพอ

const ENDPOINT = 'stats.daily';

export async function GET(req: NextRequest) {
    // 🛡️ 1. สกัดดาวรุ่งด้วย Rate Limit ก่อนทำอย่างอื่น
    const limitKey = getRateLimitKey(req);
    // อนุญาตให้ IP เดิมยิงได้ 10 ครั้ง ในรอบ 10 วินาที (ปรับแต่งตัวเลขได้ตามต้องการ)
    const isAllowed = edgeRateLimit(limitKey, 10, 10000);

    if (!isAllowed) {
        console.warn(`[stats/daily] Rate limit exceeded for IP: ${limitKey}`);
        logApiEvent(ENDPOINT, 'warning', 429, 'rate_limited');
        return NextResponse.json({ error: 'Too many requests, please slow down.' }, { status: 429 });
    }

    // 🚀 2. ถ้าผ่านด่านมาได้ ค่อยไปดึงข้อมูล
    const date = getTodayStr();
    const { data, error } = await supabaseServer.rpc('get_daily_stats', { p_date: date });

    if (error) {
        console.error('[stats/daily] RPC failed:', error);
        logApiEvent(ENDPOINT, 'error', 500, error.message);
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }

    logApiEvent(ENDPOINT, 'success', 200);
    return NextResponse.json({ date, stats: data ?? {} });
}