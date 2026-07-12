// src/services/song.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { BleachSong } from '@/src/entities/song/schema';
import { getAllSongSegments, getSongById } from '@/src/features/song/song';
import { getTodayStr } from '@/src/lib/utils/format';

export async function getDailySong(): Promise<{ song: BleachSong; segmentId: string } | null> {
    const todayStr = getTodayStr();

    // 1. ดึงทั้ง song_id (Parent) และ song_segment_id (Child) ตรงๆ จาก DB
    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select('song_id, song_segment_id')
        .eq('date', todayStr)
        .maybeSingle();

    // เช็ค error และตรวจสอบว่ามี data ครบถ้วน
    if (error || !data || !data.song_id || !data.song_segment_id) {
        return null;
    }

    // 2. ดึงข้อมูลเพลงเต็มๆ ได้เลยโดยใช้ song_id ที่มีอยู่ (ไม่ต้องอ้อมไปหาจาก Segment แล้ว)
    const parentSong = getSongById(data.song_id);

    // 3. ตรวจสอบว่า Segment นั้นมีอยู่จริง (เพื่อความปลอดภัย)
    const allSegments = getAllSongSegments();
    const isValidSegment = allSegments.some(s => s.id === data.song_segment_id);

    if (!parentSong || !isValidSegment) {
        console.error('[getDailySong] Integrity mismatch: Song or Segment not found in local data');
        return null;
    }

    // 4. ส่งกลับไปทั้ง 2 ค่า
    return {
        song: parentSong,
        segmentId: data.song_segment_id
    };
}