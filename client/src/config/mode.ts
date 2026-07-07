// src/config/mode.ts
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
    /**
     * Short HUD-style status line for page headers, e.g.
     *   <SubHeader title={BL_MODES_METADATA.character.title} subtitle={BL_MODES_METADATA.character.statusLine} />
     * Keeps real Bleach-lore terms (Reiatsu, Reishi, etc.) but phrases them so
     * they read plainly at a glance — no dictionary required.
     */
    statusLine: string;
}

// 🔒 LOCKED — do not reword: "character" and "song" titles are final.
export const BL_MODES_METADATA: Record<SubFeatureKey, ModeConfig> = {
    character: {
        id: "character",
        title: "REIRAKU PERCEPTION", // 🔒 locked
        romaji: "REIRAKU SHIKI • 霊絡識",
        symbol: "霊", // Soul / Spirit
        desc: "Guess the character from a series of clues — race, affiliation, height, and more.",
        technicalTerm: "REISHI PULSE: CLASSIFIED",
        statusLine: "System // Scanning for Reiatsu Signature",
    },
    song: {
        id: "song",
        title: "REIATSU RESONANCE", // 🔒 locked
        romaji: "REIATSU SHINDŌ • 霊圧振動",
        symbol: "音", // Sound / Echo
        desc: "Listen to a short audio clip and name the Bleach song or OST track.",
        technicalTerm: "HADŌ RESONANCE: ACTIVE",
        statusLine: "System // Tuning Into Spiritual Frequency",
    },
    quote: {
        id: "quote",
        title: "KOTODAMA REVERBERATION",
        romaji: "KOTODAMA ECHO • 言霊響",
        symbol: "言", // Word / Incantation
        desc: "Read the line, then guess which character said it.",
        technicalTerm: "BAKUDŌ COMMAND: VERBAL",
        statusLine: "System // Replaying Recorded Voice Print",
    },
    silhouette: {
        id: "silhouette",
        title: "SHIKAKU VISUALIZATION",
        romaji: "SHIKAKU GENSŌ • 視覚幻想",
        symbol: "斬", // Slay / Zanpakuto
        desc: "Guess the character hidden behind a tiled grid. Incorrect guesses will randomly unlock and open another tile, gradually exposing more of the silhouette.",
        technicalTerm: "KAGE MOCKUP: ENCRYPTED",
        statusLine: "System // Unveiling Reiatsu Grid",
    },
    emoji: {
        id: "emoji",
        title: "REISHI SYMBOLOGY",
        romaji: "REISHI MONSHŌ • 霊子紋章",
        symbol: "紋", // Crest / Emblem
        desc: "Guess the character from a set of emoji clues.",
        technicalTerm: "SEAL TYPE: SEIREITEI GRID",
        statusLine: "System // Decoding Spirit Particle Cipher",
    },
    release: {
        id: "release",
        title: "KAIHŌ INVOCATION",
        romaji: "KAIHŌ SENGEN • 解放宣言",
        symbol: "解", // Release
        desc: "See the release moment, then type the exact command used to unleash the Zanpakutō.",
        technicalTerm: "SHIKAI SEAL: UNLOCKED",
        statusLine: "System // Awaiting Release Command",
    },
};