// src/features/emoji/types.ts
import { Character } from '@/src/entities/character/schema';
import { BleachEmojiSet } from '@/src/entities/emoji/schema';
import { GuessGameController, Stats } from '@/src/lib/guessGame/types';

export type EmojiGuessStatus = 'correct' | 'wrong';

/** 🆕 สิ่งที่ client ถือระหว่างเล่น — มีแค่ character_id เฉยๆ ไม่มี name/image */
export type EmojiTargetHidden = Pick<BleachEmojiSet, "id" | "character_id">;

/** ตัวเต็ม — ใช้ตอน finalize แล้วเท่านั้น (revealedCharacter ใน store) */
export type EmojiTarget = BleachEmojiSet & { character: Character };

export interface EmojiGuessEntry {
    guess: Character;
    status: EmojiGuessStatus;
    isNew?: boolean;
}

export interface EmojiGameController extends GuessGameController {
    target: EmojiTargetHidden | null;      // 🔧 เปลี่ยนจาก EmojiTarget
    revealedCharacter: Character | null;   // 🆕 เต็มเฉพาะตอน isWin, ไม่งั้น null
    guesses: EmojiGuessEntry[];
    stats: Stats;
    loadStats: () => void;
    revealedCount: number;
    addGuess: (characterId: string) => void;
    setTarget: (target: EmojiTargetHidden) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetStreakKeepMax: () => void;
}

export type EmojiGuessable = Pick<EmojiGameController, 'addGuess' | 'guesses'>;