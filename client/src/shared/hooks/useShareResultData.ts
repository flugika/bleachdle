// src/shared/hooks/useShareResultData.ts
"use client";

import { useMemo } from 'react';
import { ShareResultData, ShareResultMatrixRow, ShareResultTier } from '@/src/shared/ui/summary/ShareResultCard';
import { generateCaseFileId } from '@/src/lib/utils/generateCaseFileId';

interface UseShareResultDataParams {
    gameMode: string;
    prefix: string;              // 'CH' | 'QT' | 'SG' | 'EM' | 'SI'
    icon: string;
    mode: 'daily' | 'unlimited';
    isWin: boolean;
    guessCount: number;
    maxGuesses?: number;
    tier: ShareResultTier;
    currentStreak: number;
    maxStreak: number;
    attemptMatrix?: ShareResultMatrixRow[];
    dateLabel: string;
    seed: string;                 // target id — keeps the case file stable per target
    flavor?: string;
}

export function useShareResultData(params: UseShareResultDataParams): ShareResultData {
    const {
        gameMode, prefix, icon, mode, isWin, guessCount, maxGuesses,
        tier, currentStreak, maxStreak, attemptMatrix, dateLabel, seed, flavor,
    } = params;

    return useMemo<ShareResultData>(() => ({
        gameMode,
        icon,
        playMode: mode,
        isWin,
        guessCount,
        maxGuesses,
        tier,
        currentStreak: isWin ? currentStreak : 0,
        maxStreak,
        attemptMatrix,
        dateLabel,
        caseFileId: generateCaseFileId(seed, prefix),
        flavor,
    }), [gameMode, icon, mode, isWin, guessCount, maxGuesses, tier, currentStreak, maxStreak, attemptMatrix, dateLabel, seed, prefix, flavor]);
}