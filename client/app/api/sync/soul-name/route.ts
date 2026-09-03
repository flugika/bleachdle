// app/api/sync/soul-name/route.ts
//
// 🆕 v2: soul_name is now global (players.soul_name), not per-mode. GET
// added so the Stats page editor and Central46ConfidentialArchive can both
// check "has this player already named themselves" before deciding whether
// to show a name-entry form or just use the existing name silently.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import { filterSoulName } from '@/src/lib/moderation/filterSoulName';

const PostSchema = z.object({
    soulName: z.string().trim().min(1).max(40),
});

export async function GET(req: NextRequest) {
    if (!edgeRateLimit(getRateLimitKey(req), 20, 10_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const { data, error } = await supabaseServer
        .from('players')
        .select('soul_name')
        .eq('id', playerId)
        .maybeSingle();

    if (error) {
        console.error('[sync/soul-name GET] query failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    return NextResponse.json({ soulName: data?.soul_name ?? null });
}

export async function POST(req: NextRequest) {
    if (!verifySameOrigin(req)) {
        return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    }

    if (!edgeRateLimit(getRateLimitKey(req), 10, 60_000)) {
        return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    }

    const playerId = await resolvePlayerFromCookie(req);
    if (!playerId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const parsed = PostSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // 🆕 soul_name is publicly visible (Soul Registry Roll) — basic
    // server-side filter, not a substitute for real moderation if abuse
    // becomes a real problem (see filterSoulName.ts comment)
    const filtered = filterSoulName(parsed.data.soulName);
    if (!filtered.ok) {
        return NextResponse.json({ error: filtered.reason ?? 'invalid name' }, { status: 400 });
    }

    const { data, error } = await supabaseServer.rpc('register_soul_name', {
        p_player_id: playerId,
        p_soul_name: filtered.cleaned,
    });

    if (error) {
        console.error('[sync/soul-name POST] rpc failed:', error);
        return NextResponse.json({ error: 'internal' }, { status: 500 });
    }

    return NextResponse.json({ player: data, soulName: data?.soul_name ?? null });
}