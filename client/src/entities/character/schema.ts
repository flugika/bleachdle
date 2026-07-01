// src/entities/character/schema.ts
import { z } from 'zod';

export const CharacterSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    gender: z.enum(["Male", "Female", "Unknown"]),
    race: z.array(z.string()), // หรือใช้ enum จากไฟล์ types.ts ของคุณ
    affiliation: z.string(),
    height_cm: z.number(),
    age: z.number(),
    eye_color: z.string(),
    hair_color: z.string(),
    first_appearance_chapter: z.string(),
    weapon: z.array(z.string()),
    release: z.array(z.string()),
    primary_ability: z.array(z.string()),
    image: z.string()
});

export const CharacterDropdownSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    image: z.string()
});

export type Character = z.infer<typeof CharacterSchema>;
export type CharacterDropdown = z.infer<typeof CharacterDropdownSchema>;