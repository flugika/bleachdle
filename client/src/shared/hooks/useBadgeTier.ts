// src/features/character/hooks/useBadgeTier.ts
import { useMemo } from 'react';
import { CHARACTER_TIERS, SONG_TIERS } from '@/src/const/summary'; // 👈 อิงตาม path จริงของคุณ

export function useCharacterTier(maxStreak: number) {
    return useMemo(() => {
        // ค้นหายศที่เหมาะสมจากระดับแรงดันวิญญาณสูงสุด
        return CHARACTER_TIERS.find(t => maxStreak >= t.min) 
            || CHARACTER_TIERS[CHARACTER_TIERS.length - 1];
    }, [maxStreak]);
}

export function useSongTier(maxStreak: number) {
    return useMemo(() => {
        // ค้นหายศที่เหมาะสมจากระดับแรงดันวิญญาณสูงสุด
        return SONG_TIERS.find(t => maxStreak >= t.min) 
            || SONG_TIERS[SONG_TIERS.length - 1];
    }, [maxStreak]);
}