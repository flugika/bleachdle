// src/features/character/validGuessEntry.ts
import { GuessEntry } from './types'; // ปรับ path ตามโครงสร้างโปรเจกต์ของคุณ

export function isValidCharacterGuessEntry(entry: unknown): entry is GuessEntry {
    // 1. เช็คเบื้องต้นว่าเป็น object และไม่เป็น null
    if (typeof entry !== 'object' || entry === null) return false;

    const e = entry as Record<string, unknown>;

    // 2. เช็คว่ามี property 'guess' และ 'result' ที่เป็น object หรือไม่
    if (!e.guess || typeof e.guess !== 'object' || !e.result || typeof e.result !== 'object') {
        return false;
    }

    const result = e.result as Record<string, unknown>;

    // 3. รวบรวมกลุ่มผลลัพธ์ที่เป็นไปได้ทั้งหมดของ MatchResult จาก engine ของคุณ
    const validMatchResults = new Set(['correct', 'wrong', 'higher', 'lower', 'partial']);

    // 4. รายการ keys ทั้งหมดใน ComparisonOutcome ที่ได้มาจาก compareCharacter
    const requiredOutcomeKeys = [
        'gender',
        'race',
        'affiliation',
        'height',
        'age',
        'eye_color',
        'hair_color',
        'first_appearance_chapter',
        'weapon',
        'release',
        'primary_ability'
    ];

    // 5. ตรวจสอบว่าทุก key ในข้อมูลเก่า มีค่าที่ตรงกับระบบปัจจุบันหรือไม่
    const hasValidResults = requiredOutcomeKeys.every(key =>
        validMatchResults.has(result[key] as string)
    );

    return hasValidResults;
}