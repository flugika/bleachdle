// src/features/release/hooks/unlimited/useReleaseGame.ts
import { getReleaseById, getReleases } from '@/src/features/release/release';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_UNLIMITED_RELEASE_GUESSES } from '@/src/const/guess';
import { createUnlimitedGuessGameStore } from '@/src/lib/guessGame/createUnlimitedGuessGameStore';
import { BleachRelease } from '@/src/entities/release/schema';
import { ReleaseTargetHidden } from '@/src/features/release/types';

export const useReleaseGame = createUnlimitedGuessGameStore<
    BleachRelease,
    BleachRelease,
    ReleaseTargetHidden
>({
    storageKeys: {
        progress: STORAGE_KEYS.RELEASE_PROGRESS,
        completed: STORAGE_KEYS.RELEASE_COMPLETED,
        stats: STORAGE_KEYS.RELEASE_STATS,
    },
    gameKey: 'release',
    maxGuesses: () => MAX_UNLIMITED_RELEASE_GUESSES,
    getCharacterById: getReleaseById,
    getAllItems: getReleases,

    attachCharacter: (item) => ({ id: item.id, release_type: item.release_type, character_id: item.character_id, clip_end_ms: item.clip_end_ms }),

    compareGuess: (guess, target) => (guess.id === target.id ? 'correct' : 'wrong'),
    // 🆕 FIX: เหตุผลเดียวกับ daily hook — ต้อง override คู่กับ compareGuess เสมอ
    // มิเช่นนั้น finalizeGame จะ resolve คำตอบผิด id แล้วได้ revealedCharacter = null
    resolveAnswerId: (target) => target.id,
    getCompletionKey: (target) => target.id,
    getItemCompletionKey: (item) => item.id,
    hasValidTargetShape: (target) => !!(target as { id?: unknown } | null)?.id,
});