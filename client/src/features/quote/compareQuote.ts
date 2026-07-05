// src/lib/game-engine/compareQuote.ts
import { Character } from '@/src/entities/character/schema';
import { QuoteGuessStatus } from '@/src/features/quote/types';

/**
 * 🎯 เช็คแค่ว่าตัวละครที่เดาตรงกับ character_id ของ quote เป้าหมายหรือไม่
 * ไม่มี partial เพราะประโยคมีเจ้าของเดียวเสมอ
 */
export function getQuoteStatus(guess: Character, targetCharacterId: string): QuoteGuessStatus {
    return guess.id === targetCharacterId ? 'correct' : 'wrong';
}