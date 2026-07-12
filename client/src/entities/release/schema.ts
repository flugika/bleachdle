// src/entities/release/schema.ts
import { z } from 'zod';

export const ReleaseTypeEnum = z.enum(['Shikai', 'Bankai', 'Resurreccion', 'Vollstandig']);

export const ReleaseSchema = z.object({
    id: z.string(),
    character_id: z.string(),
    release_type: ReleaseTypeEnum,
    trigger_phrase: z.string(),
    technique_name: z.string(),
    technique_translation: z.string().nullable().optional(),
    audio_url: z.string(),
    clip_end_ms: z.number(),
    source_episode: z.string().nullable().optional(),
});

export type ReleaseType = z.infer<typeof ReleaseTypeEnum>;
export type BleachRelease = z.infer<typeof ReleaseSchema>;