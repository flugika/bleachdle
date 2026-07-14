// src/features/quote/hooks/unlimited/useQuoteGame.ts
import { getCharacterById } from '@/src/features/character/character';
import { getQuotes } from '@/src/features/quote/quote';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_UNLIMITED_QUOTE_GUESSES } from '@/src/const/guess';
import { createUnlimitedGuessGameStore } from '@/src/lib/guessGame/createUnlimitedGuessGameStore';
import { QuoteTargetHidden } from '@/src/features/quote/types';
import { Character } from '@/src/entities/character/schema';
import { BleachQuote } from '@/src/entities/quote/schema';

export const useQuoteGame = createUnlimitedGuessGameStore<BleachQuote, Character, QuoteTargetHidden>({
    storageKeys: {
        progress: STORAGE_KEYS.QOUTE_PROGRESS,
        completed: STORAGE_KEYS.QOUTE_COMPLETED,
        stats: STORAGE_KEYS.QOUTE_STATS,
    },
    gameKey: 'quote',
    maxGuesses: () => MAX_UNLIMITED_QUOTE_GUESSES,
    getCharacterById,
    getAllItems: getQuotes,
    attachCharacter: (item) => ({ id: item.id, text: item.text, character_id: item.character_id }),
    // 🎯 quote นับความจบเป็นราย "quote" (target.id) ไม่ใช่รายตัวละคร เพราะ 1 ตัวละคร
    // มีได้หลาย quote และแต่ละ quote คือด่านของตัวเอง
    getCompletionKey: (target) => target.id,
    getItemCompletionKey: (item) => item.id,
});