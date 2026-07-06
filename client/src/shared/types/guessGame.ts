// src/shared/types/guessGame.ts

/**
 * 🔌 Generic contract that any "search-and-guess" game store must satisfy
 * so that ONE <GuessSearchBar /> can drive Character mode, Quote mode, or
 * any future "who said/owns/appears" mode — without cloning the component.
 *
 * Both useCharacterGame() and useQuoteGame() implement this shape today.
 * If you add a Song mode, its store just needs to satisfy this too.
 */
export interface GuessGameController {
    guesses: { guess: { id: string } }[];
    addGuess: (id: string) => void;
}

export interface Stats {
    currentStreak: number;
    maxStreak: number;
}