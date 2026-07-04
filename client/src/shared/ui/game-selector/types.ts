// src/features/game-selector/types.ts
import { FEATURE_FLAGS } from "@/src/config/feature.flags";

export type ModeType = "daily" | "unlimited";
export type SubFeatureKey = keyof typeof FEATURE_FLAGS.daily;

export interface ModeConfig {
    id: SubFeatureKey;
    title: string;
    romaji: string;
    symbol: string; // อักขระพู่กันญี่ปุ่นแทนสัญลักษณ์ธรรมดา
    desc: string;
    technicalTerm: string; // ศัพท์วิถีมาร/ยมทูตเสริมความพรีเมียมด้านดีไซน์
}

export const BL_MODES_METADATA: Record<SubFeatureKey, ModeConfig> = {
    character: {
        id: "character",
        title: "REIRAKU PERCEPTION",
        romaji: "REIRAKU SHIKI • 霊絡識",
        symbol: "霊", // Soul / Spirit
        desc: "Trace and identify the distinct soul signature hidden within the spiritual threads.",
        technicalTerm: "REISHI PULSE: CLASSIFIED",
    },
    song: {
        id: "song",
        title: "REIATSU RESONANCE",
        romaji: "REIATSU SHINDŌ • 霊圧振動",
        symbol: "音", // Sound / Echo
        desc: "Attune your senses to the rhythmic frequencies of the battlefield's spiritual pressure.",
        technicalTerm: "HADŌ RESONANCE: ACTIVE",
    },
    quote: {
        id: "quote",
        title: "KOTODAMA REVERBERATION",
        romaji: "KOTODAMA ECHO • 言霊響",
        symbol: "言", // Word / Incantation
        desc: "Decode the cryptic soul echoes and release declarations uttered by the Zanpakutō.",
        technicalTerm: "BAKUDŌ COMMAND: VERBAL",
    },
    image: {
        id: "image",
        title: "SHIKAKU VISUALIZATION",
        romaji: "SHIKAKU GENSŌ • 視覚幻想",
        symbol: "斬", // Slay / Zanpakuto
        desc: "Reconstruct shattered visual patterns of memories materializing from the Seireitei.",
        technicalTerm: "KAGE MOCKUP: ENCRYPTED",
    },
    emoji: {
        id: "emoji",
        title: "REISHI SYMBOLOGY",
        romaji: "REISHI MONSHŌ • 霊子紋章",
        symbol: "紋", // Crest / Emblem
        desc: "Decipher the highly compressed spirit particles arrayed in cryptic iconograph sequences.",
        technicalTerm: "SEAL TYPE: SEIRETTEI GRID",
    },
};