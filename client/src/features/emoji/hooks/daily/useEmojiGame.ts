// src/features/emoji/hooks/daily/useEmojiGame.ts
import { getCharacterById } from '@/src/features/character/character';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_DAILY_EMOJI_GUESSES } from '@/src/const/guess';
import { createDailyGuessGameStore } from '@/src/lib/guessGame/createDailyGuessGameStore';
import { EmojiTarget } from '@/src/features/emoji/types';
import { Character } from '@/src/entities/character/schema';
import { revealedCounter } from '@/src/features/emoji/emojiRevealedCounter';

export const useEmojiGame = createDailyGuessGameStore<Character, EmojiTarget, { revealedCount: number }>({
    storageKeys: {
        progress: STORAGE_KEYS.EMOJI_PROGRESS,
        completed: STORAGE_KEYS.EMOJI_COMPLETED,
        stats: STORAGE_KEYS.EMOJI_STATS,
    },
    gameKey: 'emoji',
    maxGuesses: () => MAX_DAILY_EMOJI_GUESSES,
    getCharacterById,
    // compareGuess default = guess.id === target.character_id ก็คือ getEmojiStatus เป๊ะ ไม่ต้อง override
    derivedCounters: [{ ...revealedCounter, key: 'revealedCount' }],
});