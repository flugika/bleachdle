// src/entities/song/schema.ts
import { z } from 'zod';
import { localOrRemoteUrlSchema } from '@/src/lib/utils/absolutePathEntities'

// 1. กำหนดเซกเมนต์ย่อยที่เก็บเวลา start_time_ms ตัวจริง
export const SongSegmentSchema = z.object({
    id: z.string(),
    segment_name: z.string(),
    start_time_ms: z.number(), // มิลลิวินาทีที่ใช้ดักตำแหน่งเสียง
    difficulty_level: z.string()
});

// 2. กำหนดโครงสร้างเพลงหลักตามไฟล์ JSON
export const SongSchema = z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string().default('Unknown'),
    album: z.string().nullable().optional(),
    audio_url: localOrRemoteUrlSchema,
    youtube_url: z.string().url().nullable().optional(),
    spotify_url: z.string().url().nullable().optional(),
    character_id: z.string().nullable().optional(),
    segments: z.array(SongSegmentSchema).default([]) // 🟢 ผูกอาเรย์เซกเมนต์ย่อยที่นี่
});

export const SongDropdownSchema = z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string()
});

export type BleachSongSegment = z.infer<typeof SongSegmentSchema>;
export type BleachSong = z.infer<typeof SongSchema>;
export type SongDropdown = z.infer<typeof SongDropdownSchema>;