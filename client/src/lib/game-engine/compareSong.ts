// src/lib/game-engine/compareSong.ts
import { BleachSong } from '@/src/entities/song/schema';
import { SongGuessStatus } from '@/src/features/song/types';

/**
 * 🎯 เพลงมีคำตอบเดียวเป๊ะๆ — ไม่มีการเทียบ artist/album แบบ higher-lower หรือ partial เหมือน
 * character เพราะข้อมูลจริงไม่ช่วยให้เดาต่อง่ายขึ้นเลย (ศิลปิน/อัลบั้มแทบไม่ overlap กันในชุด
 * ข้อมูลเพลง Bleach) ดังนั้น status มีแค่ 2 ค่า: ตรงเพลงเป้าหมายเป๊ะ (correct) หรือไม่ตรง (wrong)
 */
export function getSongGuessStatus(guess: BleachSong, target: BleachSong): SongGuessStatus {
    return guess.id === target.id ? 'correct' : 'wrong';
}