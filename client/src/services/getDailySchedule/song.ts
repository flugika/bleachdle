// src/services/song.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getAllSongSegments, getSongById } from '@/src/features/song/song';
import { getTodayStr } from '@/src/lib/utils/format';
import { DailySongResponse } from '@/src/features/song/types';

export async function getDailySong(): Promise<DailySongResponse | null> {
    const todayStr = getTodayStr();

    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select('song_id, song_segment_id')
        .eq('date', todayStr)
        .maybeSingle();

    if (error || !data || !data.song_id || !data.song_segment_id) {
        return null;
    }

    const parentSong = getSongById(data.song_id);
    const allSegments = getAllSongSegments();
    const isValidSegment = allSegments.some(s => s.id === data.song_segment_id);

    if (!parentSong || !isValidSegment) {
        console.error('[getDailySong] Integrity mismatch: Song or Segment not found in local data');
        return null;
    }

    return {
        song: parentSong,
        segmentId: data.song_segment_id,
        scheduledDate: todayStr,
    };
}