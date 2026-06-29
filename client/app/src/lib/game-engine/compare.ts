// src/lib/game-engine/compare.ts
import { Character } from '@/src/entities/character/schema';
import { CharacterRace, ComparisonOutcome, MatchResult } from '@/src/features/character/types';

// ฟังก์ชันแปลงเลขให้เป็น Range Key (เพื่อใช้ในการเปรียบเทียบ)
const getRange = (value: number): number => {
    if (value === -1) return -1;
    if (value < 100) return value; // 1-99 คืนค่าเดิม
    if (value < 1000) return 100;  // Range 100-999 ให้แทนด้วย 100
    return 1000;                   // Range 1000+ ให้แทนด้วย 1000
};

// Helper: เปรียบเทียบตัวเลข (Higher/Lower)
const compareNumber = (guess: number, target: number): MatchResult => {
    // กรณีข้อมูลไม่ทราบแน่ชัด (-1)
    if (guess === -1 || target === -1) {
        return guess === target ? 'correct' : 'wrong';
    }

    // กรณีเลขตรงกันเป๊ะ
    if (guess === target) return 'correct';

    // กรณีเลขไม่เท่ากัน ให้เช็ค Range
    const guessRange = getRange(guess);
    const targetRange = getRange(target);

    // ถ้าอยู่ใน Range เดียวกัน แต่เลขไม่เท่ากัน (เช่น 19 กับ 20)
    // สำหรับ < 100 เราอยากให้มันบอก higher/lower ได้ปกติ
    if (guessRange === targetRange && guessRange < 100) {
        return guess < target ? 'higher' : 'lower';
    }

    // ถ้า Range ต่างกัน ให้เปรียบเทียบตาม Range
    return guessRange < targetRange ? 'higher' : 'lower';
};

// Helper: เปรียบเทียบ Array (Partial/Correct)
const compareArray = (guess: string[], target: string[]): MatchResult => {
    const intersection = guess.filter(item => target.includes(item));
    if (intersection.length === 0) return 'wrong';
    return intersection.length === target.length && guess.length === target.length
        ? 'correct'
        : 'partial';
};

// Helper: เปรียบเทียบ String พื้นฐาน
const compareBasic = (guess: any, target: any): MatchResult =>
    guess === target ? 'correct' : 'wrong';

// ใน compare.ts
const compareRace = (guessRaces: CharacterRace[], targetRaces: CharacterRace[]): MatchResult => {
    // 1. เช็คว่าทายตรงเป๊ะทุกลำดับ/ครบทุกเผ่าหรือไม่
    const isMatch = guessRaces.length === targetRaces.length &&
        guessRaces.every(r => targetRaces.includes(r));

    if (isMatch) return 'correct';

    // 2. ถ้าทายถูกอย่างน้อย 1 เผ่า (Intersection > 0)
    const isPartial = guessRaces.some(r => targetRaces.includes(r));
    return isPartial ? 'partial' : 'wrong';
};

export const compareCharacters = (guess: Character, target: Character): ComparisonOutcome => {
    const guessRace = guess.race as CharacterRace[];
    const targetRace = target.race as CharacterRace[];

    return {
        gender: compareBasic(guess.gender, target.gender),
        race: compareRace(guessRace, targetRace),
        affiliation: compareBasic(guess.affiliation, target.affiliation),
        height: compareNumber(guess.heightCm, target.heightCm),
        age: compareNumber(guess.age, target.age),
        eyeColor: compareBasic(guess.eyeColor, target.eyeColor),
        hairColor: compareBasic(guess.hairColor, target.hairColor),
        firstAppearanceChapter: compareBasic(guess.firstAppearanceChapter, target.firstAppearanceChapter),
        weapon: compareArray(guess.weapon, target.weapon),
        release: compareArray(guess.release, target.release),
        primaryAbility: compareArray(guess.primaryAbility, target.primaryAbility),
        image: guess.image
    };
};