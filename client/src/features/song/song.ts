// src/features/song/types.ts
import { BleachSong } from '@/src/entities/song/schema';

/** ผลเทียบแต่ละ field ของการเดาเพลง 1 ครั้ง (คู่ขนานกับ MatchResult ฝั่ง character) */
export type SongMatchResult = 'correct' | 'partial' | 'wrong';

export interface SongComparisonOutcome {
    title: SongMatchResult;   // ตรงเพลงเป๊ะ = correct, ไม่ตรง = wrong (ไม่มี partial เพราะเพลงมีใบเดียว)
    artist: SongMatchResult;  // ศิลปินคนเดียวกันแต่คนละเพลง = partial, ไม่ตรง = wrong
    album: SongMatchResult;   // อัลบั้ม/หมวดตรงเป๊ะ = correct, หมวดเดียวกัน (เช่น OP เหมือนกันคนละเลข) = partial
}

export interface SongGuessEntry {
    guess: BleachSong;
    result: SongComparisonOutcome;
    isNew?: boolean; // true เฉพาะ guess ล่าสุด → trigger animation ใน SongGuessTable
}

/**
 * 🔒 สัญญา (contract) ที่ SongSearchBar.tsx (มีอยู่แล้ว) และ UI อื่นๆ ของโหมดเพลงคาดหวังจาก store
 * โครงสร้างตั้งใจให้เหมือน useCharacterGame ทุกกระเบียดนิ้ว เพื่อให้ทีมที่คุ้นเคยกับฝั่ง
 * character อ่าน/แก้โค้ดฝั่ง song ได้ทันทีโดยไม่ต้องเรียนรู้ pattern ใหม่
 */
export interface SongGameController {
    target: BleachSong | null;
    guesses: SongGuessEntry[];
    addGuess: (songId: string) => void;
    setTarget: (target: BleachSong) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}