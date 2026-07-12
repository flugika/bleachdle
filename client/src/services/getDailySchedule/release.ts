// src/services/release.ts
import 'server-only';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';
import { FactoryReleaseTarget } from '@/src/features/release/types';
import { getCharacterById } from '@/src/features/character/character';

export async function getDailyRelease(): Promise<FactoryReleaseTarget | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            releases:release_id (
                id, character_id, release_type, trigger_phrase, technique_name,
                technique_translation, audio_url, clip_end_ms, source_episode,
                character:characters (id, name, image)
            )
        `)
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data) return null;

    const releaseRow: any = Array.isArray((data as any).releases)
        ? (data as any).releases[0]
        : (data as any).releases;

    if (!releaseRow) return null;

    const characterData = Array.isArray(releaseRow.character)
        ? releaseRow.character[0]
        : releaseRow.character;

    // 🛡️ เหมือน getDailyQuote: release ที่ character_id ชี้ไปไม่เจอตัวละครจริง ถือว่าใช้ไม่ได้
    if (!characterData) return null;

    const { character, ...releaseFields } = releaseRow;

    // 🎯 นี่คือจุดต่างจาก quote: character ในผลลัพธ์สุดท้ายคือ "ตัว release เอง"
    // (ให้ตรงกับ FactoryReleaseTarget / compareGuess ที่เทียบด้วย target.id) ส่วนตัวละคร
    // จริงเก็บแยกไว้ที่ wielder — ห้ามสลับสองอันนี้ ไม่งั้น compareGuess ของ useReleaseGame
    // จะเทียบผิดตัว (จะกลายเป็นเทียบ character แทน release)
    return {
        ...releaseFields,
        character: getCharacterById(releaseFields.character_id),
    } as FactoryReleaseTarget;
}