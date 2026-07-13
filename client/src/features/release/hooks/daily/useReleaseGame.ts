// src/features/release/hooks/daily/useReleaseGame.ts
import { getReleaseById } from '@/src/features/release/release';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_DAILY_RELEASE_GUESSES } from '@/src/const/guess';
import { createDailyGuessGameStore } from '@/src/lib/guessGame/createDailyGuessGameStore';
import { BleachRelease } from '@/src/entities/release/schema';
import { ReleaseTargetHidden } from '@/src/features/release/types';

export const useReleaseGame = createDailyGuessGameStore<BleachRelease, ReleaseTargetHidden>({
    storageKeys: {
        progress: STORAGE_KEYS.RELEASE_PROGRESS,
        completed: STORAGE_KEYS.RELEASE_COMPLETED,
        stats: STORAGE_KEYS.RELEASE_STATS,
    },
    gameKey: 'release',
    maxGuesses: () => MAX_DAILY_RELEASE_GUESSES,
    getCharacterById: getReleaseById, // 🎯 "guess" ที่รับเข้ามาคือ release id เหมือน unlimited

    // 🎯 target.character คือตัว release เอง (ดู FactoryReleaseTarget) → เทียบด้วย id
    // ไม่ใช่ target.character_id เหมือน default ของ factory (นั่นออกแบบมาสำหรับโหมดที่
    // guess เป็น Character เช่น Quote)
    compareGuess: (guess, target) => (guess.id === target.id ? 'correct' : 'wrong'),

    // 🆕 FIX: ต้อง override คู่กับ compareGuess เสมอ — ทั้งคู่นิยาม "คำตอบคืออะไร"
    // เหมือนกัน (target.id ไม่ใช่ target.character_id) ถ้า override แค่ compareGuess
    // อย่างเดียว finalizeGame จะไปเรียก getCharacterById(target.character_id) แทน
    // ซึ่งหาไม่เจอ (character_id ไม่ใช่ release id) → revealedCharacter เป็น null เสมอ
    resolveAnswerId: (target) => target.id,

    // 🩹 default hasValidTargetShape เช็ค target.character ซึ่ง release เก่าที่ persist ไว้
    // ก่อนหน้านี้ (ถ้ามี) ก็มี .character เป็น release เสมออยู่แล้ว แต่เช็ค .id ตรงๆ ชัดเจนกว่า
    // และสอดคล้องกับที่ unlimited hook ใช้
    hasValidTargetShape: (target) => !!(target as { id?: unknown } | null)?.id,
});