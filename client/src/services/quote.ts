// src/services/quote.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { QuoteTarget } from '@/src/features/quote/types';

/**
 * 🗓️ Mirrors getDailyCharacter() exactly, just one join deeper: we need
 * today's quote AND the character who said it (QuoteTarget = quote row +
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
export async function getDailyQuote(): Promise<QuoteTarget | null> {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            quotes:quote_id (
                id, character_id, text, episode, chapter, arc, context,
                character:characters (
                    id, name, gender, race, affiliation, height_cm, age, eye_color,
                    hair_color, first_appearance_chapter, weapon, release,
                    primary_ability, image
                )
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

    const characterData = Array.isArray(quoteRow.character)
        ? quoteRow.character[0]
        : quoteRow.character;

    // 🛡️ A quote whose character_id points nowhere is unusable — treat it
    // the same as "no quote scheduled" rather than shipping a half-built target.
    if (!characterData) return null;

    const { character, ...quoteFields } = quoteRow;

    return {
        ...quoteFields,
        character: characterData,
    } as QuoteTarget;
}