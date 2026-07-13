// src/features/emoji/emoji.ts

import rawEmojiSets from '@/src/data/emojis.json';
import { BleachEmojiSet, EmojiSetSchema } from '@/src/entities/emoji/schema';
import { Character } from '@/src/entities/character/schema';
import { getCharacterById } from '@/src/features/character/character';
import { EmojiTarget } from '@/src/features/emoji/types';

export const getEmojiSets = (): BleachEmojiSet[] => {
    return rawEmojiSets as BleachEmojiSet[];
};

export const getEmojiSetById = (id: string): BleachEmojiSet | undefined => {
    const set = rawEmojiSets.find(e => e.id === id);
    if (!set) return undefined;
    return EmojiSetSchema.parse(set);
};

export const attachCharacter = (emojiSet: BleachEmojiSet): EmojiTarget | undefined => {
    const character = getCharacterById(emojiSet.character_id);
    if (!character) return undefined;
    return { ...emojiSet, character };
};

export const getEmojiSetWithCharacterById = (id: string): EmojiTarget | undefined => {
    const emojiSet = getEmojiSetById(id);
    if (!emojiSet) return undefined;
    return attachCharacter(emojiSet);
};

/**
 * 🔎 Search-bar pool สำหรับ Emoji mode โดยเฉพาะ — เหมือน getQuotableCharacters()
 *
 * ตั้งใจไม่ใช้ getCharacters() (full roster) เพราะ answer pool ของ emoji mode
 * มีแค่ตัวละครที่มีชุด emoji จริงใน emojis.json เท่านั้น ถ้าปล่อยให้ dropdown
 * โชว์ roster เต็ม ผู้เล่นจะเลือกตัวละครที่ไม่มีทางเป็นคำตอบได้ กลายเป็นเสีย
 * guess ฟรี
 *
 * De-dupe ด้วย character_id เพราะ 1 ตัวละครมีหลายชุด emoji ได้ (ในอนาคต)
 * ข้าม id ที่ resolve ไม่เจอ Character จริง (กัน bad data แบบเดียวกับ attachCharacter)
 */
export const getEmojiGuessableCharacters = (): Character[] => {
    const sets = getEmojiSets();
    const seen = new Set<string>();
    const result: Character[] = [];

    for (const set of sets) {
        if (seen.has(set.character_id)) continue;
        seen.add(set.character_id);

        const character = getCharacterById(set.character_id);
        if (character) result.push(character);
    }

    return result;
};
