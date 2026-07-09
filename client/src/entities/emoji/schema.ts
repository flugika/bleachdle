// src/entities/emoji/schema.ts
import { z } from 'zod';

// 🧩 EmojiSet = ชุด 4 emoji ผูกกับตัวละครเดียว (character_id) เหมือน table จริง
// emoji_list ต้องมีเป๊ะ 4 ตัว เรียงจาก "หลวมสุด" ไป "ชัดสุด" — ตัวแรกคือตัวที่เปิดให้เห็น
// ตั้งแต่ต้นเกม ส่วนตัวที่ 2-4 ถูกเฉลยทีละตัวทุก 2 ครั้งที่เดาผิด (ดู useEmojiGame.ts)
export const EmojiSetSchema = z.object({
    id: z.string(),
    character_id: z.string(),
    emoji_list: z.array(z.string().min(1)).length(4),
});

export type BleachEmojiSet = z.infer<typeof EmojiSetSchema>;
