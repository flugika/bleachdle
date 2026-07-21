import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';
import { DailyCharacterResponse } from '@/src/features/character';

// 2. Helper Type สำหรับคุม Type ของ Supabase Join (แบบเดียวกับ silhouette.ts)
type CharacterJoinResult = {
    characters: { id: string } | { id: string }[] | null;
};

export async function getDailyCharacter(): Promise<DailyCharacterResponse | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            characters:character_id (id)
        `)
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data) return null;

    // 🛡️ Cast Type เพื่อเคลียร์ Error: "Property 'id' does not exist"
    const typedData = data as unknown as CharacterJoinResult;
    const characterData = Array.isArray(typedData.characters)
        ? typedData.characters[0]
        : typedData.characters;

    if (!characterData) return null;

    return {
        ...characterData,
        scheduledDate: todayStr, 
    };
}