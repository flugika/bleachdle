// src/lib/guessGame/__tests__/compareBinaryGuess.test.ts
// pnpm --prefix client test src/lib/guessGame/__tests__/compareBinaryGuess.test.ts

// Tests the ACTUAL production function imported by both
// createDailyGuessGameStore.ts and createUnlimitedGuessGameStore.ts,
// instead of a re-implementation. Import path assumes this file sits
// in a __tests__ folder next to compareBinaryGuess.ts — adjust if needed.
import { describe, it, expect } from 'vitest';
import { compareBinaryGuess } from '../compareBinaryGuess';

describe('compareBinaryGuess (real implementation)', () => {
    it('returns "correct" when guess.id matches the target character id', () => {
        const guess = { id: 'ichigo-kurosaki' };
        expect(compareBinaryGuess(guess, 'ichigo-kurosaki')).toBe('correct');
    });

    it('returns "wrong" when guess.id does not match the target character id', () => {
        const guess = { id: 'rukia-kuchiki' };
        expect(compareBinaryGuess(guess, 'ichigo-kurosaki')).toBe('wrong');
    });

    it('is case-sensitive and does not fuzzy-match ids', () => {
        const guess = { id: 'Ichigo-Kurosaki' };
        expect(compareBinaryGuess(guess, 'ichigo-kurosaki')).toBe('wrong');
    });

    it('is order/whitespace-strict — near-miss ids are still "wrong"', () => {
        const guess = { id: 'ichigo-kurosaki ' }; // trailing space
        expect(compareBinaryGuess(guess, 'ichigo-kurosaki')).toBe('wrong');
    });

    it('works with richer TCharacter shapes (extra fields ignored, only .id matters)', () => {
        const guess = { id: 'uryuu-ishida', name: 'Uryuu Ishida', race: ['Quincy'] };
        expect(compareBinaryGuess(guess, 'uryuu-ishida')).toBe('correct');
        expect(compareBinaryGuess(guess, 'ichigo-kurosaki')).toBe('wrong');
    });

    it('is generic: works for any object satisfying { id: string }, e.g. a Release-mode "character"', () => {
        // Regression guard for the Release-mode case documented in types.ts —
        // the "thing being guessed" isn't always a Character, it can be any
        // { id } shaped entity (e.g. a Release), compared against target.id
        // rather than target.character_id.
        const releaseAsGuess = { id: 'getsuga-tenshou' };
        expect(compareBinaryGuess(releaseAsGuess, 'getsuga-tenshou')).toBe('correct');
        expect(compareBinaryGuess(releaseAsGuess, 'senbonzakura')).toBe('wrong');
    });
});