// src/features/release/hooks/unlimited/useReleaseGame.ts
import { getReleaseById, getReleases } from '@/src/features/release/release';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { MAX_UNLIMITED_RELEASE_GUESSES } from '@/src/const/guess';
import { createUnlimitedGuessGameStore } from '@/src/lib/guessGame/createUnlimitedGuessGameStore';
import { BleachRelease } from '@/src/entities/release/schema';
import { Character } from '@/src/entities/character/schema';
import { getCharacterById } from '@/src/features/character/character';

/**
 * The store's generic bound forces target.character to equal TCharacter (BleachRelease,
 * since a release is what's guessed) — it is NOT the wielder. `wielder` carries the real
 * Character for display. Exported so every consumer (components, props) uses this exact
 * shape instead of redeclaring/assuming BleachRelease.
 */
export type FactoryReleaseTarget = Omit<BleachRelease, 'character'> & {
    character: BleachRelease;
    wielder: Character;
};

export const useReleaseGame = createUnlimitedGuessGameStore<
    BleachRelease,
    BleachRelease,
    FactoryReleaseTarget
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

    attachCharacter: (item: BleachRelease): FactoryReleaseTarget | undefined => {
        const wielder = getCharacterById(item.character_id);
        if (!wielder) return undefined;
        return { ...item, character: item, wielder };
    },

    compareGuess: (guess, target) => (guess.id === target.id ? 'correct' : 'wrong'),
    getCompletionKey: (target) => target.id,
    getItemCompletionKey: (item) => item.id,
    hasValidTargetShape: (target) => !!(target as { id?: unknown } | null)?.id,
});