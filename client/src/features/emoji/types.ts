// src/features/emoji/types.ts
import { Character } from '@/src/entities/character/schema';
import { BleachEmojiSet } from '@/src/entities/emoji/schema';
import { GuessGameController, Stats } from '@/src/shared/types/guessGame';

/**
 * 🎯 เหมือน Quote: คำตอบเดียวเป๊ะ ไม่มี higher/lower/partial
 * "guess" คือ Character ที่ผู้เล่นคิดว่าเป็นเจ้าของชุด emoji
 */
export type EmojiGuessStatus = 'correct' | 'wrong';

/**
 * 🔗 emoji set joined กับ Character เต็มๆ — เหมือน QuoteTarget
 * ให้ทุก consumer (display, summary) อ่าน target.character ได้เลย
 * ไม่ต้อง getCharacterById ซ้ำ
 */
export type EmojiTarget = BleachEmojiSet & { character: Character };

export interface EmojiGuessEntry {
    guess: Character;
    status: EmojiGuessStatus;
    isNew?: boolean; // true เฉพาะ guess ล่าสุด → trigger animation ใน EmojiGuessTable
}

/**
 * 🔁 Extends the shared GuessGameController so <GuessSearchBar /> can drive
 * this store with zero special-casing — same contract Quote/Character mode uses.
 */
export interface EmojiGameController extends GuessGameController {
    target: EmojiTarget | null;
    guesses: EmojiGuessEntry[];
    stats: Stats;
    loadStats: () => void;

    /**
     * 🔓 จำนวน emoji ที่เปิดเผยแล้ว (1-4) ของ target ปัจจุบัน
     * เริ่มต้นที่ 1 เสมอเมื่อ initializeGame แล้วไต่ขึ้นทีละ 1 ทุก 2 ครั้งที่เดาผิด
     * จนสุดที่ 4 — ดู logic ทั้งหมดใน useEmojiGame.ts > addGuess()
     */
    revealedCount: number;

    addGuess: (characterId: string) => void;
    setTarget: (target: EmojiTarget) => void;
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
