// src/lib/game-engine/compare.ts
import { Character } from '@/src/entities/character/schema';
import { CharacterAppearance, CharacterRace, ComparisonOutcome, MatchResult } from '@/src/features/character/types';

const ARCS: CharacterAppearance[] = [
    "Agent of the Shinigami",
    "Soul Society",
    "Arrancar",
    "Turn Back The Pendulum",
    "Karakura Town Invasion",
    "Lost Substitute Shinigami",
    "Thousand-Year Blood War"
];

// ฟังก์ชันแปลงเลขให้เป็น Range Key (เพื่อใช้ในการเปรียบเทียบ)
const getAgeRange = (value: number): number => {
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

    if (guess === target) return 'correct';

    return guess < target ? 'higher' : 'lower';
};

const compareAge = (guess: number, target: number): MatchResult => {
    // กรณีข้อมูลไม่ทราบแน่ชัด (-1)
    if (guess === -1 || target === -1) {
        return guess === target ? 'correct' : 'wrong';
    }

    // กรณีเลขไม่เท่ากัน ให้เช็ค Range
    const guessRange = getAgeRange(guess);
    const targetRange = getAgeRange(target);

    // กรณีเลขตรงกันเป๊ะ
    if (guessRange === targetRange) return 'correct';

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

const compareAppearance = (guess: CharacterAppearance, target: CharacterAppearance): MatchResult => {
    if (guess === target) return 'correct';

    const guessIndex = ARCS.indexOf(guess);
    const targetIndex = ARCS.indexOf(target);

    if (guessIndex === -1 || targetIndex === -1) return 'wrong';

    // ถ้าภาคที่ทายอยู่ก่อนภาคเป้าหมาย (Index น้อยกว่า) ให้ตอบ 'higher' เพื่อบอกให้ทายภาคที่ใหม่ขึ้น
    return guessIndex < targetIndex ? 'higher' : 'lower';
};

export const compareCharacter = (guess: Character, target: Character): ComparisonOutcome => {
    const guessRace = guess.race as CharacterRace[];
    const targetRace = target.race as CharacterRace[];
    const guessFirstAp = guess.first_appearance_chapter as CharacterAppearance;
    const targetFirstAp = target.first_appearance_chapter as CharacterAppearance;

    return {
        gender: compareBasic(guess.gender, target.gender),
        race: compareRace(guessRace, targetRace),
        affiliation: compareBasic(guess.affiliation, target.affiliation),
        height: compareNumber(guess.height_cm, target.height_cm),
        age: compareAge(guess.age, target.age),
        eye_color: compareBasic(guess.eye_color, target.eye_color),
        hair_color: compareBasic(guess.hair_color, target.hair_color),
        first_appearance_chapter: compareAppearance(guessFirstAp, targetFirstAp),
        weapon: compareArray(guess.weapon, target.weapon),
        release: compareArray(guess.release, target.release),
        primary_ability: compareArray(guess.primary_ability, target.primary_ability),
        image: guess.image
    };
};