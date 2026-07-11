// src/features/release/types.ts
import { BleachRelease } from '@/src/entities/release/schema';
import { Stats } from '@/src/shared/types/guessGame';

/**
 * 🎯 เหมือน Song ไม่ใช่เหมือน Quote: คำตอบคือ record ของ release เอง (technique_name)
 * ไม่ใช่ Character — ผู้เล่นเลือก release จาก search bar โดยตรง ระบบเทียบด้วย id/technique_name
 * ของ record นั้น ไม่ใช่ข้อความที่พิมพ์ (compare logic คืนแค่ correct | wrong ไม่มี higher/lower)
 */
export type ReleaseGuessStatus = 'correct' | 'wrong';

export interface ReleaseGuessEntry {
    guess: BleachRelease;
    status: ReleaseGuessStatus;
    isNew?: boolean; // true เฉพาะ guess ล่าสุด → trigger animation ใน ReleaseGuessTable
}

/**
 * 🔒 สัญญาที่ ReleaseSearchBar.tsx และ UI อื่นๆ ของโหมด release คาดหวังจาก store
 * โครงสร้างตั้งใจให้เหมือน useSongGame ทุกกระเบียดนิ้ว (guess เป็น item เดียวกับที่ทาย
 * ไม่ใช่ Character ที่ถูก attach เข้ามาแบบ Quote mode)
 */
export interface ReleaseGameController {
    target: BleachRelease | null;
    guesses: ReleaseGuessEntry[];
    stats: Stats;
    loadStats: () => void;
    addGuess: (releaseId: string) => void;
    setTarget: (target: BleachRelease) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetStreakKeepMax: () => void;
}

export interface DailyReleaseGameState {
    target: BleachRelease | null;
    guesses: ReleaseGuessEntry[];
    stats: Stats;
    addGuess: (releaseId: string) => void;
    setTarget: (target: BleachRelease) => void;
    initializeGame: (target?: BleachRelease) => void;
    finalizeGame: (isWin: boolean) => void;
    loadStats: () => void;
    resetGame: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export type ReleaseGuessable = Pick<ReleaseGameController, 'addGuess' | 'guesses'>;