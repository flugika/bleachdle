// src/services/release.ts
import 'server-only';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';
import { ReleaseTargetHidden } from '@/src/features/release/types';
import { getCharacterById } from '@/src/features/character/character';

export async function getDailyRelease(): Promise<ReleaseTargetHidden | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            releases:release_id (
                id, character_id, release_type, clip_end_ms
            )
        `)
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data) return null;

    const releaseRow: any = Array.isArray((data as any).releases)
        ? (data as any).releases[0]
        : (data as any).releases;

    if (!releaseRow) return null;

    const { ...releaseFields } = releaseRow;

    // 🎯 นี่คือจุดต่างจาก quote: character ในผลลัพธ์สุดท้ายคือ "ตัว release เอง"
    // (ให้ตรงกับ FactoryReleaseTargetHidden / compareGuess ที่เทียบด้วย target.id) ส่วนตัวละคร
    // จริงเก็บแยกไว้ที่ wielder — ห้ามสลับสองอันนี้ ไม่งั้น compareGuess ของ useReleaseGame
    // จะเทียบผิดตัว (จะกลายเป็นเทียบ character แทน release)
    return {
        ...releaseFields,
    } as ReleaseTargetHidden;
}