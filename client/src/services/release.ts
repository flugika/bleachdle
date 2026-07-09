import 'server-only';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';

export async function getDailyRelease() {
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

    if (error || !data || !data.releases) return null;

    const releaseRow = Array.isArray(data.releases) ? data.releases[0] : data.releases;
    return releaseRow;
}