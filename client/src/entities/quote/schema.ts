// src/entities/quote/schema.ts
import { z } from 'zod';

// 🗨️ Quote = ประโยคเดียว ผูกกับตัวละครเดียว (character_id) เหมือน table จริง
// + metadata เสริม (episode/chapter/arc/context) ไว้โชว์ตอนเฉลยเท่านั้น ไม่ใช้ระหว่างเล่น
export const QuoteSchema = z.object({
    id: z.string(),
    character_id: z.string(),
    text: z.string(),
    episode: z.number().nullable().optional(),
    chapter: z.number().nullable().optional(),
    arc: z.string().nullable().optional(),
    context: z.string().nullable().optional(),
});

export type BleachQuote = z.infer<typeof QuoteSchema>;