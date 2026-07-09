// src/lib/support/constantsExtractor.ts
import * as guessConfig from '@/src/const/guess';

/**
 * 🛠️ Reusable Utility: ค้นหาค่าใน Object Module ตามรูปแบบ Prefix, Suffix และคำค้นหาด้านใน
 * เผื่อนำไปประยุกต์ใช้กับ Pattern คอนสแตนต์อื่นๆ ในอนาคต
 */
export function getConstantByPattern(
    moduleObj: Record<string, any>,
    prefix: string,
    suffix: string,
    keywords: string[]
): any {
    const upperKeywords = keywords.map(kw => kw.toUpperCase());

    // วนลูปหาคีย์ที่ตรงตามเงื่อนไขทั้งหมด
    const targetKey = Object.keys(moduleObj).find((key) => {
        const matchPattern = key.startsWith(prefix) && key.endsWith(suffix);
        if (!matchPattern) return false;

        // ต้องมีกลุ่มคำสำคัญครบทุกคำ (เช่น 'DAILY' และ 'CHARACTER')
        return upperKeywords.every(kw => key.toUpperCase().includes(kw));
    });

    return targetKey ? moduleObj[targetKey] : undefined;
}

/**
 * 🎯 Specific Helper: ดึงขีดจำกัดการเดาสูงสุดของแต่ละโหมดเกมแบบไดนามิก
 */
export function getMaxGuessLimit(mode: string, type: 'DAILY' | 'UNLIMITED' = 'DAILY'): number {
    const maxGuesses = getConstantByPattern(
        guessConfig,
        'MAX_',       // 🔎 ขึ้นต้นด้วย MAX_
        '_GUESSES',   // 🔎 ลงท้ายด้วย _GUESSES
        [type, mode]  // 🔎 มีคำว่า DAILY/UNLIMITED และชื่อโหมดผสมอยู่ด้านใน
    );

    // Fallback เผื่อหาคอนสแตนต์ไม่เจอ ป้องกันเซิร์ฟเวอร์พัง (Defensive Programming)
    return typeof maxGuesses === 'number' ? maxGuesses : 15;
}