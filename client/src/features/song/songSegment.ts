import { BleachSong } from '@/src/entities/song/schema';

/**
 * 🎯 SEGMENT = อีก "มุม" ของเพลงเดียวกัน ไม่ใช่ entity ใหม่ใน DB
 * แค่กำหนดจุดเริ่มเล่น (% ของความยาวเพลง) ให้ต่างกันไปตาม variant
 * เพลงเดียว x 3 variant = เพิ่ม effective quiz item โดยไม่ต้องเพิ่มข้อมูลเพลงเลยสักตัว
 */
export const SONG_SEGMENT_START_PERCENTS = [0.08, 0.35, 0.65] as const;

export interface SongSegment {
    id: string;            // `${songId}::${variantIndex}` — ใช้เป็น "id ข้อ" แทน songId ตรงๆ
    songId: string;
    variantIndex: number;
    startPercent: number;  // จุดเริ่ม audio, คูณกับ audio.duration ตอนเล่นจริง
    song: BleachSong;
}

/** สร้างชุด segment ทั้งหมดจาก songs ที่มีอยู่ — ล้วนคำนวณสด ไม่ persist ที่ไหน */
export function buildAllSongSegments(songs: BleachSong[]): SongSegment[] {
    return songs.flatMap((song) =>
        SONG_SEGMENT_START_PERCENTS.map((startPercent, variantIndex) => ({
            id: `${song.id}::${variantIndex}`,
            songId: song.id,
            variantIndex,
            startPercent,
            song,
        }))
    );
}

export function getSegmentById(songs: BleachSong[], segmentId: string): SongSegment | null {
    const [songId, variantStr] = segmentId.split('::');
    const song = songs.find((s) => s.id === songId);
    const variantIndex = Number(variantStr);
    if (!song || Number.isNaN(variantIndex)) return null;

    return {
        id: segmentId,
        songId,
        variantIndex,
        startPercent: SONG_SEGMENT_START_PERCENTS[variantIndex] ?? SONG_SEGMENT_START_PERCENTS[0],
        song,
    };
}

/**
 * 🗓️ DAILY MODE: schedule table เก็บแค่ song_id (ไม่แตะ schema ตามที่ขอ)
 * แต่เราต้อง "เลือก variant ให้เหมือนกันทุกคนในวันเดียวกัน" → ใช้ deterministic hash
 * จาก (date + songId) แทนการสุ่ม ป้องกันคนละคนเจอคนละ segment ของวันเดียวกัน
 */
export function getDeterministicSegmentForDaily(
    song: BleachSong,
    isoDate: string // 'YYYY-MM-DD'
): SongSegment {
    const seed = `${isoDate}::${song.id}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const variantIndex = hash % SONG_SEGMENT_START_PERCENTS.length;

    return {
        id: `${song.id}::${variantIndex}`,
        songId: song.id,
        variantIndex,
        startPercent: SONG_SEGMENT_START_PERCENTS[variantIndex],
        song,
    };
}

/** 🎵 Clip duration progression แบบ Heardle — single source of truth ผูกกับ MAX_GUESSES */
export const SONG_CLIP_DURATIONS_SEC = [0.2, 1, 3, 5, 10, 15] as const;

/** guessCount = จำนวนที่ทายไปแล้ว (ยังไม่นับครั้งที่กำลังจะทาย) */
export function getClipDurationForGuessCount(guessCount: number): number {
    const idx = Math.min(guessCount, SONG_CLIP_DURATIONS_SEC.length - 1);
    return SONG_CLIP_DURATIONS_SEC[idx];
}