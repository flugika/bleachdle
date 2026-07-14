// src/services/release.ts
import 'server-only';

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';
import { ReleaseTargetHidden } from '@/src/features/release/types';

type ReleaseJoinResult = {
    releases: ReleaseTargetHidden | ReleaseTargetHidden[] | null;
};

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

    const typedData = data as ReleaseJoinResult;
    const releaseRow = Array.isArray(typedData.releases)
        ? typedData.releases[0]
        : typedData.releases;

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