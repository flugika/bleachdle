// src/features/song/song.ts

import rawSongs from '@/src/data/songs.json';
import { BleachSong, SongDropdown, SongSchema, SongDropdownSchema } from '@/src/entities/song/schema';

/**
 * ดึงข้อมูลเพลงทั้งหมด พร้อม Validate โครงสร้างด้วย Zod
 */
export const getSongs = (): BleachSong[] => {
    // สามารถใช้ .parse() เพื่อตรวจสอบ Data Integrity ได้ตอนพัฒนา
    return rawSongs as BleachSong[];
};

/**
 * ดึงเฉพาะข้อมูลน้ำหนักเบาสำหรับทำ List เลือกเพลงหรือ Dropdown
 */
export const getSongDropdown = (): SongDropdown[] => {
    return rawSongs.map((song) => {
        const payload = {
            id: song.id,
            title: song.title,
            artist: song.artist ?? 'Unknown'
        };
        // ปลอดภัยยิ่งขึ้นด้วยการรีเทิร์นผ่านคอมไพล์เลอร์ของ Zod
        return SongDropdownSchema.parse(payload);
    });
};

/**
 * ค้นหาข้อมูลเพลงแบบเต็มรูปแบบด้วย ID
 */
export const getSongById = (id: string): BleachSong | undefined => {
    const song = rawSongs.find(s => s.id === id);
    if (!song) return undefined;
    return SongSchema.parse(song);
};

export const getAllSongSegments = () => {
    const allSongs = getSongs();
    
    // ใช้ flatMap แผ่ array ของ segments ออกมา และยัด song_id กลับเข้าไป
    return allSongs.flatMap(song => 
        song.segments.map(segment => ({
            ...segment,
            song_id: song.id
        }))
    );
};