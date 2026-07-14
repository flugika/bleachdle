// src/features/emoji/emoji.ts

import rawEmojiSets from '@/src/data/emojis.json';
import { BleachEmojiSet, EmojiSetSchema } from '@/src/entities/emoji/schema';
import { Character } from '@/src/entities/character/schema';
import { getCharacterById } from '@/src/features/character/character';
import { EmojiTarget } from '@/src/features/emoji/types';
import { EmojiTargetHidden } from '@/src/features/emoji/types';
import { TOTAL_EMOJI_COUNT } from '@/src/features/emoji/emojiRevealedCounter';

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

export type EmojiTile = { emoji: string | null; isRevealed: boolean };

/**
 * target มีแค่ id/character_id (จาก server) → หา emoji_list ตัวเต็มจาก
 * emojiSets (bundle เดียวกับ client, ไม่ผ่าน network) แล้ว slice ตาม
 * revealedCount เท่านั้น ที่เหลือ mask เป็น null กัน component เผลอ
 * .map(e => e.emoji) ทั้ง array แล้วเห็นครบ 4 ตัวก่อนเวลา
 */
export function getRevealedEmojiTiles(
    target: EmojiTargetHidden | null,
    emojiSets: BleachEmojiSet[],
    revealedCount: number
): EmojiTile[] {
    const fullSet = target ? emojiSets.find((s) => s.id === target.id) : undefined;
    const emojiList = fullSet?.emoji_list ?? [];

    return Array.from({ length: TOTAL_EMOJI_COUNT }, (_, i) => {
        const isRevealed = i < revealedCount;
        return { emoji: isRevealed ? (emojiList[i] ?? null) : null, isRevealed };
    });
}