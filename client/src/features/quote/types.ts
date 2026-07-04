// src/features/quote/types.ts
import { Character } from '@/src/entities/character/schema';
import { BleachQuote } from '@/src/entities/quote/schema';

/**
 * 🎯 เหมือน Song: คำตอบเดียวเป๊ะ ไม่มี higher/lower/partial
 * ต่างจาก Song ตรงที่ "guess" คือ Character ไม่ใช่ตัวคำคมเอง
 */
export type QuoteGuessStatus = 'correct' | 'wrong';

export interface QuoteGuessEntry {
    guess: Character;
    status: QuoteGuessStatus;
    isNew?: boolean; // true เฉพาะ guess ล่าสุด → trigger animation ใน QuoteGuessTable
}

export interface QuoteGameController {
    target: BleachQuote | null;
    guesses: QuoteGuessEntry[];
    addGuess: (characterId: string) => void;
    setTarget: (target: BleachQuote) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export type QuoteGuessable = Pick<QuoteGameController, 'addGuess' | 'guesses'>;