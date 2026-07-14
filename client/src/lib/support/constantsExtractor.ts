// src/lib/support/constantsExtractor.ts
import * as guessConfig from '@/src/const/guess';

/**
 * 🛠️ Reusable Utility: ค้นหาค่าใน Object Module ตามรูปแบบ Prefix, Suffix และคำค้นหาด้านใน
 * เผื่อนำไปประยุกต์ใช้กับ Pattern คอนสแตนต์อื่นๆ ในอนาคต
 */
export function getConstantByPattern(
    moduleObj: Record<string, unknown>,
    prefix: string,
    suffix: string,
    keywords: string[]
): unknown {
    const upperKeywords = keywords.map(kw => kw.toUpperCase());

    const targetKey = Object.keys(moduleObj).find((key) => {
        const matchPattern = key.startsWith(prefix) && key.endsWith(suffix);
        if (!matchPattern) return false;

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
        'MAX_',
        '_GUESSES',
        [type, mode]
    );

    return typeof maxGuesses === 'number' ? maxGuesses : 15;
}