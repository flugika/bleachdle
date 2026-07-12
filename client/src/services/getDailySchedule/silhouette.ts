// src/services/silhouette.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { SilhouetteTarget } from '@/src/features/silhouette/types';
import { getTodayStr } from '@/src/lib/utils/format';

/**
 * 🗓️ Mirrors getDailyQuote() 1:1 — เปลี่ยนแค่ตารางลูกจาก `quotes` เป็น `silhouettes`
 * และ field set ให้ตรงกับ DDL จริง (id, character_id, image) แทน text/episode/chapter/arc/context.
 *
 * ผลลัพธ์ SilhouetteTarget = silhouette row + .character แนบมาให้เลย เพื่อให้ consumer
 * ฝั่ง client (SilhouetteSummaryGuess, SilhouetteImage ผ่าน control panel, ฯลฯ)
 * อ่าน target.character ได้ทันทีโดยไม่ต้อง round-trip หา character อีกรอบ
 *
 * ⚠️ ASSUMPTION (เหมือน quote เป๊ะ): ใช้ตาราง `daily_schedule` เดิมร่วมกับ character/quote
 * โดยเติมคอลัมน์ nullable `silhouette_id` เข้าไป (ดู sql/2026_add_silhouette_daily_schedule.sql)
 * ถ้าโปรเจกต์จริงแยกตาราง `silhouette_daily_schedule` ต่างหาก ให้สลับ `.from('daily_schedule')`
 * เป็น `.from('silhouette_daily_schedule')` ด้านล่างแทน — โครงที่เหลือเหมือนเดิมทุกอย่าง
 */
export async function getDailySilhouette(): Promise<SilhouetteTarget | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            silhouettes:silhouette_id (
                id, character_id, image,
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

    // 🛡️ เหมือน getDailyQuote/getDailyCharacter เป๊ะ: Supabase อาจคืน relation ที่ join
    // มาเป็น array ขึ้นอยู่กับวิธี infer FK เลยต้องกัน 1-vs-many ไว้เสมอ
    const silhouetteRow: any = Array.isArray((data as any).silhouettes)
        ? (data as any).silhouettes[0]
        : (data as any).silhouettes;

    if (!silhouetteRow) return null;

    const characterData = Array.isArray(silhouetteRow.character)
        ? silhouetteRow.character[0]
        : silhouetteRow.character;

    // 🛡️ silhouette ที่ character_id ชี้ไปไม่เจอตัวจริง ถือว่าใช้ไม่ได้ — treat เหมือน
    // "วันนี้ยังไม่ schedule silhouette" แทนที่จะส่ง target ที่ half-built ออกไป
    if (!characterData) return null;

    const { character, ...silhouetteFields } = silhouetteRow;

    return {
        ...silhouetteFields,
        character: characterData,
    } as SilhouetteTarget;
}