// src/features/character/__tests__/compareCharacter.test.ts
// pnpm --prefix client test src/features/character/__tests__/compareCharacter.test.ts

// Tests the ACTUAL production comparator imported by
// hooks/daily/useCharacterGame.ts and hooks/unlimited/useCharacterGame.ts,
// instead of a re-implemented stand-in. Adjust the relative import if this
// file's location differs from src/features/character/__tests__/.
import { describe, it, expect } from 'vitest';
import { compareCharacter } from '@/src/features/character/compareCharacter';
import { Character } from '@/src/entities/character/schema';

/**
 * Builds a full, valid Character for tests. Every field compareCharacter
 * reads is given a sane default so each test only needs to override the
 * one or two fields it's actually exercising.
 */
function makeCharacter(overrides: Partial<Character> = {}): Character {
    return {
        id: 'base-character',
        name: 'Base Character',
        image: 'base.png',
        gender: 'Male',
        race: ['Shinigami'],
        affiliation: 'Gotei 13',
        height_cm: 170,
        age: 17,
        eye_color: 'Brown',
        hair_color: 'Black',
        first_appearance_chapter: 'Agent of the Shinigami',
        weapon: ['Weaponized'],
        release: ['Shikai'],
        primary_ability: ['Physical'],
        ...overrides,
    } as Character;
}

describe('compareCharacter (real implementation)', () => {
    describe('exact match', () => {
        it('returns "correct" for every field when guess === target', () => {
            const character = makeCharacter({ id: 'ichigo' });
            const outcome = compareCharacter(character, character);

            expect(outcome.gender).toBe('correct');
            expect(outcome.race).toBe('correct');
            expect(outcome.affiliation).toBe('correct');
            expect(outcome.height).toBe('correct');
            expect(outcome.age).toBe('correct');
            expect(outcome.eye_color).toBe('correct');
            expect(outcome.hair_color).toBe('correct');
            expect(outcome.first_appearance_chapter).toBe('correct');
            expect(outcome.weapon).toBe('correct');
            expect(outcome.release).toBe('correct');
            expect(outcome.primary_ability).toBe('correct');
            expect(outcome.image).toBe(character.image);
        });
    });

    describe('simple scalar fields (gender / affiliation / eye_color / hair_color)', () => {
        it('returns "wrong" on any mismatch, "correct" on exact match', () => {
            const target = makeCharacter({ gender: 'Female', affiliation: 'Espada', eye_color: 'Violet', hair_color: 'Orange' });
            const guessMismatch = makeCharacter({ gender: 'Male', affiliation: 'Gotei 13', eye_color: 'Brown', hair_color: 'Black' });
            const guessMatch = makeCharacter({ gender: 'Female', affiliation: 'Espada', eye_color: 'Violet', hair_color: 'Orange' });

            const wrongOutcome = compareCharacter(guessMismatch, target);
            expect(wrongOutcome.gender).toBe('wrong');
            expect(wrongOutcome.affiliation).toBe('wrong');
            expect(wrongOutcome.eye_color).toBe('wrong');
            expect(wrongOutcome.hair_color).toBe('wrong');

            const correctOutcome = compareCharacter(guessMatch, target);
            expect(correctOutcome.gender).toBe('correct');
            expect(correctOutcome.affiliation).toBe('correct');
            expect(correctOutcome.eye_color).toBe('correct');
            expect(correctOutcome.hair_color).toBe('correct');
        });
    });

    describe('height (compareNumber)', () => {
        it('returns "correct" when heights are equal', () => {
            const target = makeCharacter({ height_cm: 181 });
            const guess = makeCharacter({ height_cm: 181 });
            expect(compareCharacter(guess, target).height).toBe('correct');
        });

        it('returns "higher" when the guess is shorter than the target', () => {
            const target = makeCharacter({ height_cm: 181 });
            const guess = makeCharacter({ height_cm: 150 });
            expect(compareCharacter(guess, target).height).toBe('higher');
        });

        it('returns "lower" when the guess is taller than the target', () => {
            const target = makeCharacter({ height_cm: 181 });
            const guess = makeCharacter({ height_cm: 200 });
            expect(compareCharacter(guess, target).height).toBe('lower');
        });

        it('treats -1 (unknown height) as "wrong" unless both sides are -1', () => {
            const unknownTarget = makeCharacter({ height_cm: -1 });
            const knownGuess = makeCharacter({ height_cm: 170 });
            expect(compareCharacter(knownGuess, unknownTarget).height).toBe('wrong');

            const bothUnknown = compareCharacter(makeCharacter({ height_cm: -1 }), unknownTarget);
            expect(bothUnknown.height).toBe('correct');
        });
    });

    describe('age (compareAge, with range-bucketing for 100+)', () => {
        it('returns "correct" for an exact match under 100', () => {
            const target = makeCharacter({ age: 17 });
            expect(compareCharacter(makeCharacter({ age: 17 }), target).age).toBe('correct');
        });

        it('returns "higher"/"lower" for close values within the same <100 bucket', () => {
            const target = makeCharacter({ age: 20 });
            expect(compareCharacter(makeCharacter({ age: 19 }), target).age).toBe('higher');
            expect(compareCharacter(makeCharacter({ age: 25 }), target).age).toBe('lower');
        });

        it('buckets 100-999 together as "correct" even if the exact ages differ', () => {
            // getAgeRange(150) === getAgeRange(300) === 100
            const target = makeCharacter({ age: 300 });
            const guess = makeCharacter({ age: 150 });
            expect(compareCharacter(guess, target).age).toBe('correct');
        });

        it('buckets 1000+ together as "correct" even if the exact ages differ', () => {
            const target = makeCharacter({ age: 2000 });
            const guess = makeCharacter({ age: 1500 });
            expect(compareCharacter(guess, target).age).toBe('correct');
        });

        it('returns "higher" when guess bucket is below target bucket (e.g. under-100 vs 100+)', () => {
            const target = makeCharacter({ age: 500 }); // bucket 100
            const guess = makeCharacter({ age: 50 });   // bucket 50
            expect(compareCharacter(guess, target).age).toBe('higher');
        });

        it('returns "lower" when guess bucket is above target bucket', () => {
            const target = makeCharacter({ age: 50 });   // bucket 50
            const guess = makeCharacter({ age: 2000 });  // bucket 1000
            expect(compareCharacter(guess, target).age).toBe('lower');
        });

        it('treats -1 (unknown age) as "wrong" unless both sides are -1', () => {
            const target = makeCharacter({ age: -1 });
            expect(compareCharacter(makeCharacter({ age: 30 }), target).age).toBe('wrong');
            expect(compareCharacter(makeCharacter({ age: -1 }), target).age).toBe('correct');
        });
    });

    describe('first_appearance_chapter (compareAppearance, ordered arc list)', () => {
        it('returns "correct" for the same arc', () => {
            const target = makeCharacter({ first_appearance_chapter: 'Arrancar' });
            expect(compareCharacter(makeCharacter({ first_appearance_chapter: 'Arrancar' }), target).first_appearance_chapter).toBe('correct');
        });

        it('returns "higher" when the guessed arc comes before the target arc', () => {
            const target = makeCharacter({ first_appearance_chapter: 'Thousand-Year Blood War' });
            const guess = makeCharacter({ first_appearance_chapter: 'Soul Society' });
            expect(compareCharacter(guess, target).first_appearance_chapter).toBe('higher');
        });

        it('returns "lower" when the guessed arc comes after the target arc', () => {
            const target = makeCharacter({ first_appearance_chapter: 'Soul Society' });
            const guess = makeCharacter({ first_appearance_chapter: 'Thousand-Year Blood War' });
            expect(compareCharacter(guess, target).first_appearance_chapter).toBe('lower');
        });
    });

    describe('array fields: weapon / release / primary_ability (compareArray)', () => {
        it('returns "correct" only when both arrays match exactly (order independent)', () => {
            const target = makeCharacter({ weapon: ['Weaponized', 'Energy'] });
            expect(compareCharacter(makeCharacter({ weapon: ['Energy', 'Weaponized'] }), target).weapon).toBe('correct');
        });

        it('returns "partial" when there is overlap but not a full match', () => {
            const target = makeCharacter({ weapon: ['Weaponized', 'Energy'] });
            expect(compareCharacter(makeCharacter({ weapon: ['Weaponized'] }), target).weapon).toBe('partial');
            expect(compareCharacter(makeCharacter({ weapon: ['Weaponized', 'Unarmed'] }), target).weapon).toBe('partial');
        });

        it('returns "wrong" when there is zero overlap', () => {
            const target = makeCharacter({ weapon: ['Weaponized'] });
            expect(compareCharacter(makeCharacter({ weapon: ['Unarmed'] }), target).weapon).toBe('wrong');
        });

        it('applies the same rules independently to release and primary_ability', () => {
            const target = makeCharacter({ release: ['Bankai'], primary_ability: ['Kido', 'Physical'] });
            const guess = makeCharacter({ release: ['Shikai'], primary_ability: ['Physical'] });
            const outcome = compareCharacter(guess, target);
            expect(outcome.release).toBe('wrong');
            expect(outcome.primary_ability).toBe('partial');
        });
    });

    describe('race (compareRace)', () => {
        it('returns "correct" for identical race sets regardless of order', () => {
            const target = makeCharacter({ race: ['Shinigami', 'Human'] });
            expect(compareCharacter(makeCharacter({ race: ['Human', 'Shinigami'] }), target).race).toBe('correct');
        });

        it('returns "partial" for at least one overlapping race', () => {
            const target = makeCharacter({ race: ['Shinigami', 'Human'] });
            expect(compareCharacter(makeCharacter({ race: ['Shinigami'] }), target).race).toBe('partial');
            expect(compareCharacter(makeCharacter({ race: ['Shinigami', 'Quincy'] }), target).race).toBe('partial');
        });

        it('returns "wrong" for zero overlap', () => {
            const target = makeCharacter({ race: ['Shinigami'] });
            expect(compareCharacter(makeCharacter({ race: ['Quincy'] }), target).race).toBe('wrong');
        });
    });

    describe('image passthrough', () => {
        it("always echoes the guess's own image, not the target's", () => {
            const target = makeCharacter({ image: 'target.png' });
            const guess = makeCharacter({ image: 'guess.png' });
            expect(compareCharacter(guess, target).image).toBe('guess.png');
        });
    });
});