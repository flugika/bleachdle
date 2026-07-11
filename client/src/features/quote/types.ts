// src/features/quote/types.ts
import { Character } from '@/src/entities/character/schema';
import { BleachQuote } from '@/src/entities/quote/schema';
import { GuessGameController, Stats } from '@/src/lib/guessGame/types';

/**
 * 🎯 เหมือน Song: คำตอบเดียวเป๊ะ ไม่มี higher/lower/partial
 * ต่างจาก Song ตรงที่ "guess" คือ Character ไม่ใช่ตัวคำคมเอง
 */
export type QuoteGuessStatus = 'correct' | 'wrong';

/**
 * 🔗 A quote joined with its speaker's full Character record.
 * This is what the store's `target` holds so every consumer (testimony
 * card, summary reveal, control panel, race-emblem effect) gets the
 * character for free instead of doing a second getCharacterById lookup.
 *
 * Build one via `attachCharacter()` / `getQuoteWithCharacterById()`
 * in src/features/quote/quote.ts.
 */
export type QuoteTarget = BleachQuote & { character: Character };

export interface QuoteGuessEntry {
    guess: Character;
    status: QuoteGuessStatus;
    isNew?: boolean; // true เฉพาะ guess ล่าสุด → trigger animation ใน QuoteGuessTable
}

/**
 * 🔁 Extends the shared GuessGameController so <GuessSearchBar /> can drive
 * this store with zero special-casing — same contract Character mode uses.
 */
export interface QuoteGameController extends GuessGameController {
    target: QuoteTarget | null;
    guesses: QuoteGuessEntry[];
    stats: Stats; // 🆕
    loadStats: () => void; // 🆕
    addGuess: (characterId: string) => void;
    setTarget: (target: QuoteTarget) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetStreakKeepMax: () => void; // 🆕
}

export type QuoteGuessable = Pick<QuoteGameController, 'addGuess' | 'guesses'>;