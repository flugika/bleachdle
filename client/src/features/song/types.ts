// src/features/song/types.ts
import { BleachSong } from '@/src/entities/song/schema';

export interface SongGuess {
    id: string;          // ID ของประวัติการเดารอบนั้นๆ
    guess: BleachSong;   // ข้อมูลเพลงที่ผู้เล่นเลือกเดา
    isCorrect: boolean;  // ผลลัพธ์ (True = ชนะตรงตัว / False = ไม่ใช่เพลงนี้)
}

export interface SongGameController {
    guesses: SongGuess[];
    target: BleachSong | null;
    hasFinalized: boolean;
    addGuess: (songId: string) => void;
    resetGame: () => void;
}