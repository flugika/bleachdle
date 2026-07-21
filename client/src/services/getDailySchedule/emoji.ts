// src/services/quote.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { EmojiTargetHidden } from '@/src/features/emoji/types';
import { getTodayStr } from '@/src/lib/utils/format';

// 🎯 Type ของแค่ field ที่ join กลับมา — ไม่ต้อง type ทั้ง response
type EmojiJoinResult = {
    emojis: EmojiTargetHidden | EmojiTargetHidden[] | null;
};

export async function getDailyEmoji(): Promise<EmojiTargetHidden | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            emojis:emoji_id (
                id, character_id
            )
        `)
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data) return null;

    const typedData = data as EmojiJoinResult;

    // 🛡️ Supabase อาจ return joined relation เป็น array
    const emojiRow = Array.isArray(typedData.emojis)
        ? typedData.emojis[0]
        : typedData.emojis;

    if (!emojiRow) return null;

    return {
        ...emojiRow,
        scheduledDate: todayStr,
    } as EmojiTargetHidden & { scheduledDate: string };
}