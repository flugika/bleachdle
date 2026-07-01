// src/lib/utils/format.ts

import { CharacterRace, MatchResult } from "@/src/features/character";

export const formatAge = (age: number): string => {
    if (age === -1) return "Unknow";
    if (age < 100) return String(age);
    if (age < 1000) return "100-999";
    return "1000+";
};

// ใช้แบบเดียวกันกับ height_cm ตามความเหมาะสม
export const formatHeight = (height: number): string => {
    if (height === -1) return "Unknow";
    return `${height} cm`;
};