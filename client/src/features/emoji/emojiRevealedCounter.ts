// src/features/emoji/emojiRevealedCounter.ts
import { DerivedCounterConfig, GuessEntry } from '@/src/lib/guessGame/types';
import { Character } from '@/src/entities/character/schema';

const WRONG_GUESSES_PER_REVEAL = 2;
export const TOTAL_EMOJI_COUNT = 4;
export const INITIAL_REVEALED_EMOJI = 1;

export const revealedCounter: DerivedCounterConfig<Character> = {
    key: 'revealedCount',
    initial: INITIAL_REVEALED_EMOJI,
    compute: (guesses: GuessEntry<Character>[]) => {
        const wrongGuessCount = guesses.filter((g) => g.status === 'wrong').length;
        const revealed = INITIAL_REVEALED_EMOJI + Math.floor(wrongGuessCount / WRONG_GUESSES_PER_REVEAL);
        return Math.min(TOTAL_EMOJI_COUNT, revealed);
    },
    finalizeValue: TOTAL_EMOJI_COUNT,
    isValidRange: (v) => v >= INITIAL_REVEALED_EMOJI && v <= TOTAL_EMOJI_COUNT,
};