// src/entities/release/schema.ts
import { z } from 'zod';
import { CharacterSchema } from '../character/schema';

export const ReleaseTypeEnum = z.enum(['Shikai', 'Bankai', 'Resurreccion', 'Vollstandig']);

export const ReleaseSchema = z.object({
    id: z.string(),
    character_id: z.string(),
    character: CharacterSchema,
    release_type: ReleaseTypeEnum,
    trigger_phrase: z.string(),          // played during the guessing clip only
    technique_name: z.string(),          // 🎯 the answer — fuzzy-matched, romanized/normalized at seed time
    technique_translation: z.string().nullable().optional(), // shown on reveal + also searchable
    audio_url: z.string(),   // same file used for both guess clip (0 → clip_end_ms) and full reveal
    clip_end_ms: z.number(),
    source_episode: z.string().nullable().optional(), // TYBW vs regular arcs need free-text, not int
});

export type ReleaseType = z.infer<typeof ReleaseTypeEnum>;
export type BleachRelease = z.infer<typeof ReleaseSchema>;