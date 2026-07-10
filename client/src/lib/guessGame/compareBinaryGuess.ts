// src/shared/lib/guessGame/compareBinaryGuess.ts
import { BinaryGuessStatus } from './types';

/**
 * 🎯 compareQuote.ts และ compareSilhouette.ts เดิมคือฟังก์ชันเดียวกันเป๊ะ
 * (guess.id === targetCharacterId ? 'correct' : 'wrong') — รวมไว้ที่เดียว
 *
 * ถ้าโหมดไหนในอนาคตต้องการ logic ต่างจากนี้ (partial match ฯลฯ) ให้ override
 * ผ่าน config.compareGuess ตอนเรียก factory แทนที่จะมาแก้ไฟล์นี้
 */
export function compareBinaryGuess<TCharacter extends { id: string }>(
    guess: TCharacter,
    targetCharacterId: string
): BinaryGuessStatus {
    return guess.id === targetCharacterId ? 'correct' : 'wrong';
}