// src/services/emoji.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { EmojiTargetHidden } from '@/src/features/emoji/types';
import { getTodayStr } from '@/src/lib/utils/format';

/**
 * 🗓️ Mirrors getDailyQuote() exactly — ต่างกันแค่ join ไป emojis แทน quotes
 * ⚠️ ASSUMPTION: เหมือนกัน ต้องมี column emoji_id ใน daily_schedule
 *     (หรือ table แยก emoji_daily_schedule ก็ปรับ .from() ตรงนี้ตัวเดียว)
 */
export async function getDailyEmoji(): Promise<EmojiTargetHidden | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            emojis:emoji_id (
                id, character_id, emoji_list
            )
        `)
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data) return null;

    // 🛡️ เหมือน getDailyQuote: Supabase อาจ return joined relation เป็น array
    const emojiRow: any = Array.isArray((data as any).emojis)
        ? (data as any).emojis[0]
        : (data as any).emojis;

    if (!emojiRow) return null;

    const { ...emojiFields } = emojiRow;

    return {
        ...emojiFields,
    } as EmojiTargetHidden;
}