// app/api/pair/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { checkIpRateLimit } from '@/src/lib/support/ipRateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // 🛡️ Guard 1: IP Rate Limit (จำกัด 10 Requests / 60 วินาที) ป้องกัน DoS สภาพแวดล้อมสแปมแท็บ
    const rateLimit = checkIpRateLimit(req, 10, 60);
    if (!rateLimit.success) {
        return NextResponse.json(
            { error: 'Too many status check requests' },
            {
                status: 429,
                headers: { 'Retry-After': String(rateLimit.retryAfter) }
            }
        );
    }

    const code = req.nextUrl.searchParams.get('code');
    if (!code || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ status: 'invalid' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseServer
            .from('pairing_codes')
            .select('expires_at')
            .eq('code', code)
            .maybeSingle();

        if (error) {
            return NextResponse.json({ status: 'error' }, { status: 500 });
        }

        const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

        if (data) {
            if (new Date(data.expires_at).getTime() < Date.now()) {
                return NextResponse.json({ status: 'expired' }, { headers });
            }
            return NextResponse.json({ status: 'active' }, { headers });
        }

        return NextResponse.json({ status: 'used' }, { headers });
    } catch {
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}