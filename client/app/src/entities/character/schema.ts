// src/entities/character/schema.ts
import { z } from 'zod';

export const CharacterSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    gender: z.enum(["Male", "Female", "Unknown"]),
    race: z.array(z.string()), // หรือใช้ enum จากไฟล์ types.ts ของคุณ
    affiliation: z.string(),
    heightCm: z.number(),
    age: z.number(),
    eyeColor: z.string(),
    hairColor: z.string(),
    firstAppearanceChapter: z.string(),
    weapon: z.array(z.string()),
    release: z.array(z.string()),
    primaryAbility: z.array(z.string()),
    image: z.string()
});

export const CharacterDropdownSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    image: z.string()
});

export type Character = z.infer<typeof CharacterSchema>;
export type CharacterDropdown = z.infer<typeof CharacterDropdownSchema>;