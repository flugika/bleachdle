// src/shared/lib/raceEmblem.ts
import { Character } from '@/src/entities/character/schema';

export interface RaceEmblem {
    file: string;
    color: string;
}

export const EMBLEM_DATA: Record<string, RaceEmblem> = {
    "shinigami": { file: "shinigami.webp", color: "#f8fafc" },
    "quincy": { file: "quincy.webp", color: "#00d2ff" },
    "arrancar": { file: "arrancar.webp", color: "#ff2a2a" },
    "hollow": { file: "arrancar.webp", color: "#9333ea" },
    "fullbringer": { file: "Xcution.webp", color: "#10b981" },
    "mod soul": { file: "mod_soul.webp", color: "#f59e0b" },
    "substitute shinigami": { file: "daiko_shinigami.webp", color: "#ff8a00" },
    "visored": { file: "visored.webp", color: "#e11d48" },
    "human": { file: "soul.webp", color: "#94a3b8" },
    "soul": { file: "soul.webp", color: "#7dd3fc" },
    "unknown": { file: "soul.webp", color: "#52525b" },
};

const SUBSTITUTE_SHINIGAMI_NAMES = ["Ichigo Kurosaki", "Kugo Ginjo"];

const PRIORITY_ORDER = [
    "arrancar",
    "quincy",
    "fullbringer",
    "shinigami",
    "hollow",
    "mod soul",
    "human",
    "soul",
    "unknown",
];

export function useRaceEmblem(
    character: Pick<Character, 'name' | 'race'> | null | undefined
): RaceEmblem | null {
    if (!character) return null;

    if (SUBSTITUTE_SHINIGAMI_NAMES.includes(character.name)) {
        return EMBLEM_DATA["substitute shinigami"];
    }

    if (!character.race || !Array.isArray(character.race) || character.race.length === 0) {
        return EMBLEM_DATA["unknown"];
    }

    const normalizedRaces = character.race.map((r) => r.toLowerCase().trim());

    if (normalizedRaces.includes("shinigami") && normalizedRaces.includes("hollow")) {
        return EMBLEM_DATA["visored"];
    }

    const matchedRace = PRIORITY_ORDER.find((race) => normalizedRaces.includes(race));
    return matchedRace ? EMBLEM_DATA[matchedRace] : EMBLEM_DATA["unknown"];
}