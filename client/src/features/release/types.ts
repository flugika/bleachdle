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
 * TTarget ต้องมี { id, character_id } เท่านั้น (factory ไม่บังคับ field `character`
 * ในระดับ type constraint แล้ว — ดู comment ใน src/lib/guessGame/types.ts)
 *
 * โหมด release: สิ่งที่ผู้เล่น "ทาย" (TCharacter ของ factory) คือตัว BleachRelease เอง
 * ส่วน field `character` ตรงนี้คือ Character จริงที่ปล่อยท่านี้ (เหมือนโหมด Quote/
 * Silhouette) ใช้แค่โชว์ผลตอนเฉลย ไม่เกี่ยวกับ compareGuess (compareGuess เทียบด้วย
 * guess.id === target.id ตรง ๆ ใน useReleaseGame/useReleaseGame)
 *
 * ย้ายมาจาก useReleaseGame.ts เดิม เพราะตอนนี้ daily hook ก็ต้องใช้ชนิดเดียวกัน —
 * มี 2 ที่ import ประกาศซ้ำจะ desync กันได้ง่ายเวลามีคนแก้แค่ที่เดียว
 */

export type ReleaseTargetHidden = Pick<BleachRelease, 'id' | 'character_id' | 'release_type' | 'clip_end_ms'> & {
    scheduledDate?: string;
};

export type ReleaseTarget = BleachRelease & {
    character: Character;
};

export interface ReleaseGameController {
    target: ReleaseTargetHidden | null;
    revealedCharacter: BleachRelease | null;
    guesses: ReleaseGuessEntry[];
    stats: Stats;
    loadStats: () => void;
    addGuess: (releaseId: string) => void;
    setTarget: (target: ReleaseTargetHidden) => void;
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