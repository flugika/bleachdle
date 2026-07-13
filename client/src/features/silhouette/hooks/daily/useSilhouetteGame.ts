// src/features/silhouette/hooks/daily/useSilhouetteGame.ts
import { getCharacterById } from '@/src/features/character/character';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_DAILY_SILHOUETTE_GUESSES } from '@/src/const/guess';
import { createDailyGuessGameStore } from '@/src/lib/guessGame/createDailyGuessGameStore';
import { SilhouetteTargetHidden } from '@/src/features/silhouette/types';
import { Character } from '@/src/entities/character/schema';

/**
 * ⚠️ INTEGRATION TODO (ดูคำอธิบายในแชท): store ตัวนี้ไม่มี hardReset / resetStreakKeepMax /
 * initializeGame แล้ว ต่างจากของเดิมที่ implement ครบเพราะ SilhouetteGameController
 * (type เดียวกับ unlimited) บังคับไว้ — ถ้า SilhouetteControlPanel/DailySilhouetteWrapper
 * ยัง type เป็น SilhouetteGameController อยู่ ต้องแยก type ใหม่สำหรับ daily ก่อน
 * (ดูตัวอย่างที่ Quote ทำไว้แล้ว: QuoteDailyGameState แยกจาก QuoteGameController)
 */
export const useSilhouetteGame = createDailyGuessGameStore<Character, SilhouetteTargetHidden>({
    storageKeys: {
        progress: STORAGE_KEYS.SILHOUETTE_PROGRESS,
        completed: STORAGE_KEYS.SILHOUETTE_COMPLETED,
        stats: STORAGE_KEYS.SILHOUETTE_STATS,
    },
    gameKey: 'silhouette',
    maxGuesses: () => MAX_DAILY_SILHOUETTE_GUESSES,
    getCharacterById,
});