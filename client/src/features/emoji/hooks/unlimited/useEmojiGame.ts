// src/features/emoji/hooks/unlimited/useEmojiGame.ts
import { getCharacterById } from '@/src/features/character/character';
import { getEmojiSets } from '@/src/features/emoji/emoji';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_UNLIMITED_EMOJI_GUESSES } from '@/src/const/guess';
import { createUnlimitedGuessGameStore } from '@/src/lib/guessGame/createUnlimitedGuessGameStore';
import { EmojiTargetHidden } from '@/src/features/emoji/types';
import { Character } from '@/src/entities/character/schema';
import { BleachEmojiSet } from '@/src/entities/emoji/schema';
import { revealedCounter } from '@/src/features/emoji/emojiRevealedCounter';

export const useEmojiGame = createUnlimitedGuessGameStore<BleachEmojiSet, Character, EmojiTargetHidden>({
    storageKeys: {
        progress: STORAGE_KEYS.EMOJI_PROGRESS,
        completed: STORAGE_KEYS.EMOJI_COMPLETED,
        stats: STORAGE_KEYS.EMOJI_STATS,
    },
    gameKey: 'emoji',
    maxGuesses: () => MAX_UNLIMITED_EMOJI_GUESSES,
    getCharacterById,
    getAllItems: getEmojiSets,
    attachCharacter: (item) => {
        const character = getCharacterById(item.character_id);
        if (!character) return undefined;
        return { id: item.id, character_id: item.character_id } as EmojiTargetHidden; // ไม่แนบ emoji_list
    },
    // 🎯 นับความจบเป็นราย emoji set (target.id) เหมือนของเดิม ไม่ใช่รายตัวละคร
    // (โค้ดเดิมเช็ค !completedIds.includes(s.id) และ mark completedData.unlimited ด้วย target.id)
    getCompletionKey: (target) => target.id,
    getItemCompletionKey: (item) => item.id,
    derivedCounters: [revealedCounter],
});