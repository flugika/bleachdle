// src/features/emoji/compareEmoji.ts
import { Character } from '@/src/entities/character/schema';
import { EmojiGuessStatus } from '@/src/features/emoji/types';

/**
 * 🎯 เช็คแค่ว่าตัวละครที่เดาตรงกับ character_id ของ emoji set เป้าหมายหรือไม่
 * ไม่มี partial เพราะชุด emoji มีเจ้าของเดียวเสมอ (เหมือน quote mode)
 */
export function getEmojiStatus(guess: Character, targetCharacterId: string): EmojiGuessStatus {
    return guess.id === targetCharacterId ? 'correct' : 'wrong';
}
