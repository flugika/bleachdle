// compareSilhouette.ts
import { Character } from '@/src/entities/character/schema';
import { SilhouetteGuessStatus } from '@/src/features/silhouette/types';

export function getSilhouetteStatus(guess: Character, targetCharacterId: string): SilhouetteGuessStatus {
    return guess.id === targetCharacterId ? 'correct' : 'wrong';
}