// src/services/quote.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { QuoteTargetHidden } from '@/src/features/quote/types';
import { getTodayStr } from '@/src/lib/utils/format';

/**
 * 🗓️ Mirrors getDailyCharacter() exactly, just one join deeper: we need
 * today's quote AND the character who said it (QuoteTargetHidden = quote row +
 * .character), so downstream consumers (QuoteSummaryGuess, QuoteTestimonyDisplay,
 * the race-emblem effect) can read target.character without a second round-trip.
 *
 * ⚠️ ASSUMPTION: this expects a `quote_daily_schedule` table shaped like:
 *     date DATE PRIMARY KEY, quote_id TEXT REFERENCES quotes(id)
 * If your project instead reuses the same `daily_schedule` table as
 * character mode (with a nullable `quote_id` column added to it), just
 * swap the `.from('quote_daily_schedule')` below to `.from('daily_schedule')`
 * — everything else stays the same.
 */
export async function getDailyQuote(): Promise<QuoteTargetHidden | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            quotes:quote_id (
                id, character_id, text, episode, chapter, arc, context
            )
        `)
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data) return null;

    // Same one-vs-many defensiveness as getDailyCharacter: Supabase can return
    // the joined relation as an array depending on how the FK is inferred.
    const quoteRow: any = Array.isArray((data as any).quotes)
        ? (data as any).quotes[0]
        : (data as any).quotes;

    if (!quoteRow) return null;

    const { ...quoteFields } = quoteRow;

    return {
        ...quoteFields,
    } as QuoteTargetHidden;
}