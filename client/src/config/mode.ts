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

export type Dimension = 'daily' | 'unlimited';

// 🎨 โทนสี Bleach TYBW ไม่ได้มีแค่ทอง — แบ่งเป็น 2 ชั้น:
//   1) DIMENSION_ACCENT: โทนรวมของทั้ง modal เปลี่ยนตาม dimension ที่เลือก
//      Daily (日/พระอาทิตย์) → ทอง-เหลือง อุ่นๆ แบบ Quincy gold / Getsuga ember
//      Unlimited (無/ความไม่มีที่สิ้นสุด) → น้ำเงิน-ฟ้าเย็น แบบ Reiatsu / Quincy Blut
//   2) MODE_ACCENT: แต่ละ discipline มีสีประจำตัวของตัวเอง (เหมือน Sternritter แต่ละคนมีสีต่างกัน)
//      เพื่อให้เห็นความหลากหลายของสี Bleach พร้อมกันในลิสต์เดียว ไม่ใช่ทองล้วนทั้งแถว
export const DIMENSION_ACCENT: Record<Dimension, { label: string; kanji: string; desc: string; base: string; bright: string; glow: string; descTint: string }> = {
    daily: {
        label: 'Daily', kanji: '日', desc: 'One attempt. Resets every night.',
        base: '#c8a96e', bright: '#f2c879', glow: 'rgba(226,140,58,0.35)', descTint: 'text-[#e2a86e]/50',
    },
    unlimited: {
        label: 'Unlimited', kanji: '無', desc: 'Unlimited replays. No reset.',
        base: '#4a90d9', bright: '#7ec8ff', glow: 'rgba(74,144,217,0.35)', descTint: 'text-[#7ec8ff]/50',
    },
};

// 🗺️ ลำดับอ้างอิง — กรองผ่าน FEATURE_FLAGS[dimension] ก่อนเข้า .map() เสมอ
// โหมดที่ flag = false จะไม่ถูก render ออกมาเลย ไม่ใช่แค่ disabled ค้างไว้ให้เห็น
export const MODE_ORDER: SubFeatureKey[] = ['character', 'song', 'quote', 'silhouette', 'emoji', 'release'];

// 🎨 สีประจำตัวของแต่ละ discipline — ดึงจากโทนที่มีจริงใน TYBW (น้ำเงิน/ฟ้า/ส้ม/แดง/ทอง)
export const MODE_ACCENT: Record<SubFeatureKey, { base: string; bright: string; glow: string }> = {
    character: { base: '#4a90d9', bright: '#7ec8ff', glow: 'rgba(74,144,217,0.45)' },  // Quincy reiatsu — น้ำเงิน
    song: { base: '#c8a96e', bright: '#f2cf8a', glow: 'rgba(200,169,110,0.45)' },      // Royal gold — ทอง
    quote: { base: '#e2683a', bright: '#ff9a68', glow: 'rgba(226,104,58,0.45)' },      // Getsuga ember — ส้ม
    silhouette: { base: '#38b6c7', bright: '#7fe3f0', glow: 'rgba(56,182,199,0.45)' },      // Blut ice-cyan — ฟ้า
    emoji: { base: '#d94f4f', bright: '#ff7a7a', glow: 'rgba(217,79,79,0.45)' },       // Hollow crimson — แดง
    release: { base: '#6a6fd9', bright: '#a3a8ff', glow: 'rgba(106,111,217,0.45)' },   // Bankai indigo — น้ำเงินม่วง
};