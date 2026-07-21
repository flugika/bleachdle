// src/services/quote.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { QuoteTargetHidden } from '@/src/features/quote/types';
import { getTodayStr } from '@/src/lib/utils/format';

type QuoteJoinResult = {
    quotes: QuoteTargetHidden | QuoteTargetHidden[] | null;
};

export async function getDailyQuote(): Promise<QuoteTargetHidden | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            quotes:quote_id (
                id, character_id, text
            )
        `)
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data) return null;

    // Same one-vs-many defensiveness as getDailyCharacter: Supabase can return
    // the joined relation as an array depending on how the FK is inferred.
    const typedData = data as QuoteJoinResult;
    const quoteRow = Array.isArray(typedData.quotes)
        ? typedData.quotes[0]
        : typedData.quotes;

    if (!quoteRow) return null;

    const { ...quoteFields } = quoteRow;

    return {
        ...quoteFields,
        scheduledDate: todayStr,
    } as QuoteTargetHidden & { scheduledDate: string };
}