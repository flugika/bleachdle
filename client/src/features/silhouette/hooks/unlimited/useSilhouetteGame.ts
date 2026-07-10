// src/features/silhouette/hooks/unlimited/useSilhouetteGame.ts
import { getCharacterById } from '@/src/features/character/character';
import { getSilhouettes, attachCharacter } from '@/src/features/silhouette/silhouette';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_UNLIMITED_SILHOUETTE_GUESSES } from '@/src/const/guess';
import { createUnlimitedGuessGameStore } from '@/src/lib/guessGame/createUnlimitedGuessGameStore';
import { SilhouetteTarget } from '@/src/features/silhouette/types';
import { Character } from '@/src/entities/character/schema';
import { BleachSilhouette } from '@/src/entities/silhouette/schema';

export const useSilhouetteGame = createUnlimitedGuessGameStore<BleachSilhouette, Character, SilhouetteTarget>({
    storageKeys: {
        progress: STORAGE_KEYS.SILHOUETTE_PROGRESS,
        completed: STORAGE_KEYS.SILHOUETTE_COMPLETED,
        stats: STORAGE_KEYS.SILHOUETTE_STATS,
    },
    gameKey: 'silhouette',
    maxGuesses: () => MAX_UNLIMITED_SILHOUETTE_GUESSES,
    getCharacterById,
    getAllItems: getSilhouettes,
    attachCharacter,
    // 🎯 silhouette นับความจบเป็นราย "ตัวละคร" (character_id) ไม่ใช่ราย entry
    // เพราะถ้าอนาคตมีหลาย silhouette ต่อ 1 ตัวละคร ไม่อยากให้ต้องเดาซ้ำตัวเดิม
    getCompletionKey: (target) => target.character_id,
    getItemCompletionKey: (item) => item.character_id,
});