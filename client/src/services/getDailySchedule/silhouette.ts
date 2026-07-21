// src/services/silhouette.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { SilhouetteTargetHidden } from '@/src/features/silhouette/types';
import { getTodayStr } from '@/src/lib/utils/format';

type SilhouetteJoinResult = {
    silhouettes: SilhouetteTargetHidden | SilhouetteTargetHidden[] | null;
};

export async function getDailySilhouette(): Promise<SilhouetteTargetHidden | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            silhouettes:silhouette_id (id, character_id)
        `)
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data) return null;

    // 🛡️ เหมือน getDailyQuote/getDailyCharacter เป๊ะ: Supabase อาจคืน relation ที่ join
    // มาเป็น array ขึ้นอยู่กับวิธี infer FK เลยต้องกัน 1-vs-many ไว้เสมอ
    const typedData = data as SilhouetteJoinResult;
    const silhouetteRow = Array.isArray(typedData.silhouettes)
        ? typedData.silhouettes[0]
        : typedData.silhouettes;

    if (!silhouetteRow) return null;

    const { ...silhouetteFields } = silhouetteRow;

    return {
        ...silhouetteFields,
        scheduledDate: todayStr,
    } as SilhouetteTargetHidden & { scheduledDate: string };
}