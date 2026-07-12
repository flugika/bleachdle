// src/services/emoji.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { EmojiTarget } from '@/src/features/emoji/types';
import { getTodayStr } from '@/src/lib/utils/format';

/**
 * 🗓️ Mirrors getDailyQuote() exactly — ต่างกันแค่ join ไป emojis แทน quotes
 * ⚠️ ASSUMPTION: เหมือนกัน ต้องมี column emoji_id ใน daily_schedule
 *     (หรือ table แยก emoji_daily_schedule ก็ปรับ .from() ตรงนี้ตัวเดียว)
 */
export async function getDailyEmoji(): Promise<EmojiTarget | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            emojis:emoji_id (
                id, character_id, emoji_list,
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

    // 🛡️ เหมือน getDailyQuote: Supabase อาจ return joined relation เป็น array
    const emojiRow: any = Array.isArray((data as any).emojis)
        ? (data as any).emojis[0]
        : (data as any).emojis;

    if (!emojiRow) return null;

    const characterData = Array.isArray(emojiRow.character)
        ? emojiRow.character[0]
        : emojiRow.character;

    // 🛡️ emoji set ที่ character_id ชี้ไปหาตัวละครที่ไม่มีอยู่จริง → ถือว่าไม่มี daily วันนี้
    if (!characterData) return null;

    const { character, ...emojiFields } = emojiRow;

    return {
        ...emojiFields,
        character: characterData,
    } as EmojiTarget;
}