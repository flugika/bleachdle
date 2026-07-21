import { Character } from '@/src/entities/character/schema';
import { BleachSilhouette } from '@/src/entities/silhouette/schema';
import { GuessGameController, Stats } from '@/src/lib/guessGame/types';

/**
 * 🎯 เหมือน Quote/Song: คำตอบเดียวเป๊ะ ไม่มี attribute grid
 */
export type SilhouetteGuessStatus = 'correct' | 'wrong';

export type SilhouetteTargetHidden = Pick<BleachSilhouette, "id" | "character_id"> & {
    scheduledDate?: string;
};

export type SilhouetteTarget = BleachSilhouette & { character: Character };

export interface SilhouetteGuessEntry {
    guess: Character;
    status: SilhouetteGuessStatus;
    isNew?: boolean;
}

export interface SilhouetteGameController extends GuessGameController {
    target: SilhouetteTargetHidden | null;
    revealedCharacter: Character | null;
    guesses: SilhouetteGuessEntry[];
    stats: Stats;
    loadStats: () => void;
    addGuess: (characterId: string) => void;
    setTarget: (target: SilhouetteTargetHidden) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetStreakKeepMax: () => void;
}

/**
 * 🆕 เหมือน QuoteGuessable เป๊ะ — component ที่แค่ "โชว์ + รับเดา" (ControlPanel, SearchBar)
 * ควรรับ type แคบตัวนี้ ไม่ใช่ SilhouetteGameController เต็ม เพราะ daily store ไม่มี
 * hardReset/initializeGame/resetStreakKeepMax (ไม่มี concept นั้นใน daily) — ถ้า panel
 * บังคับรับ type เต็ม จะบังคับให้ daily store ต้อง implement method ที่ไม่มีความหมายทิ้งไว้
 * เฉยๆ แค่เพื่อให้ type ผ่าน ซึ่งไม่ตรงกับหลัก Interface Segregation
 */
export type SilhouetteGuessable = Pick<SilhouetteGameController, 'addGuess' | 'guesses'>;