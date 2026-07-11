// src/features/release/types.ts
import { BleachRelease } from '@/src/entities/release/schema';
import { Character } from '@/src/entities/character/schema';
import { Stats } from '@/src/lib/guessGame/types';

export type ReleaseGuessStatus = 'correct' | 'wrong';

export interface ReleaseGuessEntry {
    guess: BleachRelease;
    status: ReleaseGuessStatus;
    isNew?: boolean;
}

/**
 * 🔗 Shape ที่ createDailyGuessGameStore / createUnlimitedGuessGameStore ทั้งคู่ต้องการ:
 * TTarget ต้องมี { id, character_id, character: TCharacter } โดย TCharacter คือชนิดที่
 * ผู้เล่น "ทาย" — ในโหมด release คือ BleachRelease เอง ไม่ใช่ Character
 *
 * ดังนั้น target.character = ตัว release เอง (ใช้เทียบ compareGuess)
 * ส่วน target.wielder = Character จริงที่ปล่อยท่านี้ (ใช้แค่โชว์ผล ไม่เกี่ยวกับ compare)
 *
 * ย้ายมาจาก useReleaseGame.ts เดิม เพราะตอนนี้ daily hook ก็ต้องใช้ชนิดเดียวกัน —
 * มี 2 ที่ import ประกาศซ้ำจะ desync กันได้ง่ายเวลามีคนแก้แค่ที่เดียว
 */
export type FactoryReleaseTarget = Omit<BleachRelease, 'character'> & {
    character: BleachRelease;
    wielder: Character;
};

export interface ReleaseGameController {
    target: FactoryReleaseTarget | null;
    guesses: ReleaseGuessEntry[];
    stats: Stats;
    loadStats: () => void;
    addGuess: (releaseId: string) => void;
    setTarget: (target: FactoryReleaseTarget) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetStreakKeepMax: () => void;
}

export type ReleaseGuessable = Pick<ReleaseGameController, 'addGuess' | 'guesses'>;