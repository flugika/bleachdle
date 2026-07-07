import { Character } from '@/src/entities/character/schema';
import { BleachSilhouette } from '@/src/entities/silhouette/schema';
import { GuessGameController, Stats } from '@/src/shared/types/guessGame';

/**
 * 🎯 เหมือน Quote/Song: คำตอบเดียวเป๊ะ ไม่มี attribute grid
 */
export type SilhouetteGuessStatus = 'correct' | 'wrong';

export type SilhouetteTarget = BleachSilhouette & { character: Character };

export interface SilhouetteGuessEntry {
    guess: Character;
    status: SilhouetteGuessStatus;
    isNew?: boolean;
}

export interface SilhouetteGameController extends GuessGameController {
    target: SilhouetteTarget | null;
    guesses: SilhouetteGuessEntry[];
    stats: Stats;
    loadStats: () => void;
    addGuess: (characterId: string) => void;
    setTarget: (target: SilhouetteTarget) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetStreakKeepMax: () => void;
}