// app/api/cron/purge-pairing-codes/route.ts
//
// 🆕 also purges device_provision_log rows older than 48h (from 006).
// Schedule should be tightened to every 15 minutes now (see vercel.json)
// rather than hourly — pairing_codes rows are cleaned up almost immediately
// on consume as of 006 (confirm_pairing deletes outright), so this job's
// remaining job is mostly catching ABANDONED codes (created, never
// redeemed) and the two purge_old_* housekeeping calls, all cheap.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const [pairingCodesResult, resultEventsResult, provisionLogResult] = await Promise.allSettled([
        supabaseServer.rpc('purge_expired_pairing_codes'),
        supabaseServer.rpc('purge_old_result_events'),
        supabaseServer.rpc('purge_old_provision_log'),
    ]);

    const errors: string[] = [];
    const jobs = [
        ['pairing_codes', pairingCodesResult],
        ['result_events', resultEventsResult],
        ['provision_log', provisionLogResult],
    ] as const;

    for (const [name, result] of jobs) {
        if (result.status === 'rejected' || result.value.error) {
            const err = result.status === 'rejected' ? result.reason : result.value.error;
            console.error(`[cron/purge] ${name} failed:`, err);
            errors.push(name);
        }
    }

    if (errors.length > 0) {
        return NextResponse.json({ status: 'partial_failure', failed: errors }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok', ranAt: new Date().toISOString() });
}