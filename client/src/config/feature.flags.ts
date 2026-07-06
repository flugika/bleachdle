// src/config/feature-flags.ts

export const FEATURE_FLAGS = {
    // ── 📅 โหมดทายรายวัน (Daily Mode)
    daily: {
        character: true,
        quote: true,
        image: false,
        emoji: false,
        song: true,
        release: false,
    },

    // ── ♾️ โหมดเล่นไม่จำกัด (Unlimited Mode)
    unlimited: {
        character: true,
        quote: true,
        image: false,
        emoji: false,
        song: true,
        release: false,
    },

    mockupSong: false,
    support: true,
} as const;

// ── 🛡️ Type Helpers สำหรับทำนายขอบเขตพลังวิญญาณ (Optional)
export type GameMode = keyof typeof FEATURE_FLAGS;
export type GameSubFeature = keyof typeof FEATURE_FLAGS['daily'];