// src/features/song/types.ts
import { BleachSong } from '@/src/entities/song/schema';
import { Stats } from '@/src/lib/guessGame/types';

/**
 * 🎯 เพลงตอบเดียวเป๊ะ ไม่มีการเทียบ field ย่อย (artist/album) แบบ higher-lower/partial เหมือน
 * character เพราะข้อมูลจริงไม่ช่วยให้เดาต่อง่ายขึ้นเลย (ศิลปิน/อัลบั้มแทบไม่ overlap กันในชุดเพลง
 * Bleach) ดังนั้นผลของแต่ละการเดามีแค่ 2 สถานะ: ตรงเพลงเป้าหมายเป๊ะ (correct) หรือไม่ตรง (wrong)
 */
export type SongGuessStatus = 'correct' | 'wrong';

export interface DailySongResponse {
    song: BleachSong;
    segmentId: string;
    scheduledDate: string;
}

export interface SongGuessEntry {
    guess: BleachSong;
    status: SongGuessStatus;
    isNew?: boolean; // true เฉพาะ guess ล่าสุด → trigger animation ใน SongGuessTable
}

/**
 * 🔒 สัญญา (contract) ที่ SongSearchBar.tsx และ UI อื่นๆ ของโหมดเพลงคาดหวังจาก store
 * โครงสร้างตั้งใจให้เหมือน useCharacterGame ทุกกระเบียดนิ้ว (ยกเว้นรูปแบบผลการเดาที่ต่างกัน)
 */
export interface SongGameController {
    target: BleachSong | null;
    targetSegmentId: string | null;
    guesses: SongGuessEntry[];
    stats: Stats; // 🆕
    loadStats: () => void; // 🆕
    addGuess: (songId: string) => void;
    setTarget: (target: BleachSong) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetStreakKeepMax: () => void; // 🆕
}

export interface DailySongGameState {
    target: BleachSong | null;
    targetSegmentId: string | null;
    guesses: SongGuessEntry[];
    stats: Stats; // 🆕
    addGuess: (songId: string) => void;
    setTarget: (target: BleachSong) => void;
    initializeGame: (target?: BleachSong, segmentId?: string) => void;
    finalizeGame: (isWin: boolean) => void;
    loadStats: () => void; // 🆕
    resetGame: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export type SongGuessable = Pick<SongGameController, 'addGuess' | 'guesses'>;