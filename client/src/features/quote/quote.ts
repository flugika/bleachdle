// src/features/quote/quote.ts

import rawQuotes from '@/src/data/quotes.json';
import { BleachQuote, QuoteSchema } from '@/src/entities/quote/schema';
import { Character } from '@/src/entities/character/schema';
import { getCharacterById } from '@/src/features/character/character';
import { QuoteTarget } from '@/src/features/quote/types';

export const getQuotes = (): BleachQuote[] => {
    return rawQuotes as BleachQuote[];
};

export const getQuoteById = (id: string): BleachQuote | undefined => {
    const quote = rawQuotes.find(q => q.id === id);
    if (!quote) return undefined;
    return QuoteSchema.parse(quote);
};

export const attachCharacter = (quote: BleachQuote): QuoteTarget | undefined => {
    const character = getCharacterById(quote.character_id);
    if (!character) return undefined;
    return { ...quote, character };
};

export const getQuoteWithCharacterById = (id: string): QuoteTarget | undefined => {
    const quote = getQuoteById(id);
    if (!quote) return undefined;
    return attachCharacter(quote);
};

/**
 * 🔎 Search-bar pool สำหรับ Quote mode โดยเฉพาะ
 *
 * ตั้งใจไม่ใช้ getCharacters() (full roster) เพราะ answer pool ของ quote mode
 * มีแค่ตัวละครที่มี quote จริงใน quotes.json เท่านั้น ถ้าปล่อยให้ dropdown
 * โชว์ roster เต็ม ผู้เล่นจะเลือกตัวละครที่ไม่มีทางเป็นคำตอบได้ กลายเป็นเสีย
 * guess ฟรี หรือถ้า no-op ก็จะดู broken
 *
 * De-dupe ด้วย character_id เพราะ 1 ตัวละครมีหลาย quote ได้
 * ข้าม id ที่ resolve ไม่เจอ Character จริง (กัน bad data แบบเดียวกับ attachCharacter)
 */
export const getQuotableCharacters = (): Character[] => {
    const quotes = getQuotes();
    const seen = new Set<string>();
    const result: Character[] = [];

    for (const quote of quotes) {
        if (seen.has(quote.character_id)) continue;
        seen.add(quote.character_id);

        const character = getCharacterById(quote.character_id);
        if (character) result.push(character);
    }

    return result;
};