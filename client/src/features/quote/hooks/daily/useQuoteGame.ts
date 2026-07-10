// src/features/quote/hooks/daily/useQuoteGame.ts
import { getCharacterById } from '@/src/features/character/character';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_DAILY_QUOTE_GUESSES } from '@/src/const/guess';
import { createDailyGuessGameStore } from '@/src/lib/guessGame/createDailyGuessGameStore';
import { QuoteTarget } from '@/src/features/quote/types';
import { Character } from '@/src/entities/character/schema';

export const useQuoteGame = createDailyGuessGameStore<Character, QuoteTarget>({
    storageKeys: {
        progress: STORAGE_KEYS.QOUTE_PROGRESS,
        completed: STORAGE_KEYS.QOUTE_COMPLETED,
        stats: STORAGE_KEYS.QOUTE_STATS,
    },
    gameKey: 'quote',
    maxGuesses: () => MAX_DAILY_QUOTE_GUESSES,
    getCharacterById,
    // compareGuess / isValidGuessEntry / hasValidTargetShape ใช้ default ของ factory ได้เลย
});