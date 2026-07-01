// src/config/feature-flags.ts

export const FEATURE_FLAGS = {
    // ── 📅 โหมดทายรายวัน (Daily Mode)
    daily: {
        character: true,
        quote: false,
        image: false,
        emoji: false,
        song: false,
    },

    // ── ♾️ โหมดเล่นไม่จำกัด (Unlimited Mode)
    unlimited: {
        character: true,
        quote: false,
        image: false,
        emoji: false,
        song: false,
    },
} as const;

// ── 🛡️ Type Helpers สำหรับทำนายขอบเขตพลังวิญญาณ (Optional)
export type GameMode = keyof typeof FEATURE_FLAGS;
export type GameSubFeature = keyof typeof FEATURE_FLAGS['daily'];