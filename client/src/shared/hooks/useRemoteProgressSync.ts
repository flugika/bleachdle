// src/shared/hooks/useRemoteProgressSync.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRemoteProgress } from './useRemoteProgress';
import type { GameMode, GameType } from '@/src/lib/sync/syncEngine';

interface RemoteProgressSyncOptions {
    gameMode: GameMode;
    gameType: GameType;
    hasHydrated: boolean;
    localTargetId: string | null;
    localHasFinalized: boolean;
    localGuessCount: number;
    applyRemoteProgress: (remoteTargetId: string, remoteGuesses: unknown[]) => void;
}

export type RemoteProgressBannerState = {
    gameMode: GameMode;
    gameType: GameType;
} & (
        | { visible: false }
        | { visible: true; updatedAt: string; onLoad: () => void; onDismiss: () => void }
    );

const lastSyncedKey = (gameMode: GameMode, gameType: GameType) =>
    `bl_last_synced_progress:${gameMode}:${gameType}`;

function readLastSyncedAt(gameMode: GameMode, gameType: GameType): string | null {
    try {
        return localStorage.getItem(lastSyncedKey(gameMode, gameType));
    } catch {
        return null;
    }
}

function writeLastSyncedAt(gameMode: GameMode, gameType: GameType, updatedAt: string) {
    try {
        localStorage.setItem(lastSyncedKey(gameMode, gameType), updatedAt);
    } catch {
        // ignore
    }
}

export function useRemoteProgressSync({
    gameMode,
    gameType,
    hasHydrated,
    localTargetId,
    localHasFinalized,
    localGuessCount,
    applyRemoteProgress,
}: RemoteProgressSyncOptions): RemoteProgressBannerState {
    const remoteState = useRemoteProgress(gameMode, gameType, hasHydrated);
    const [dismissedTargetId, setDismissedTargetId] = useState<string | null>(null);

    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
        readLastSyncedAt(gameMode, gameType)
    );

    const progress = remoteState.status === 'ready' ? remoteState.progress : null;

    const alreadySynced = useMemo(() => {
        if (!progress?.target_id || !lastSyncedAt) return false;
        return new Date(progress.updated_at).getTime() <= new Date(lastSyncedAt).getTime();
    }, [progress, lastSyncedAt]);

    // 🆕 target เดียวกัน = catch-up เดิม, target ต่างกัน = อีกเครื่อง "เริ่มข้อใหม่"
    // ไปแล้ว ถือเป็นกรณีที่ต้อง sync เหมือนกัน ไม่ใช่แค่ progress ของข้อเดิม
    const sameTarget = progress?.target_id === localTargetId;
    const hasRemoteProgress =
        !!progress?.target_id && Array.isArray(progress.guesses) && progress.guesses.length > 0;
    // unlimited ที่เพิ่งสุ่มข้อใหม่ ส่ง target พร้อม guesses: [] ทันที (ดู
    // syncProgressImmediately ใน initializeGame) — นับเป็น "remote เปลี่ยนข้อ" ได้
    // แม้ guesses จะว่างก็ตาม เพราะ target_id ต่างจาก local คือสัญญาณเดียวที่มี
    const remoteStartedDifferentRound = !!progress?.target_id && !sameTarget;

    // 🟢 ครอบ markSynced ด้วย useCallback เพื่อให้ reference เสถียร
    const markSynced = useCallback((updatedAt: string) => {
        writeLastSyncedAt(gameMode, gameType, updatedAt);
        setLastSyncedAt(updatedAt);
    }, [gameMode, gameType]);

    // ── auto-apply แบบเงียบ: ไม่มี local progress ให้เสีย ไม่ว่า target จะตรงกัน
    // หรือคนละข้อก็ตาม — ปลอดภัย 100% เพราะไม่มีอะไรถูกทับ
    useEffect(() => {
        if (!progress || !progress.target_id) return;
        if (localHasFinalized) return;
        if (alreadySynced) return;
        if (localGuessCount > 0) return; // มี progress อยู่แล้ว ให้ banner ถามแทน
        if (!hasRemoteProgress && !remoteStartedDifferentRound) return; // ไม่มีอะไรให้ sync จริง

        applyRemoteProgress(progress.target_id, progress.guesses);
        markSynced(progress.updated_at);
    }, [
        progress,
        localTargetId,
        localHasFinalized,
        localGuessCount,
        alreadySynced,
        hasRemoteProgress,
        remoteStartedDifferentRound,
        applyRemoteProgress,
        markSynced, // 🟢 ใส่ markSynced ใน dependencies
    ]);

    const shouldShow = useMemo(() => {
        if (!progress || !progress.target_id) return false;
        if (localHasFinalized) return false;
        if (localGuessCount === 0) return false; // เคสนี้ auto-apply จัดการไปแล้วข้างบน
        if (progress.target_id === dismissedTargetId) return false;
        if (alreadySynced) return false;

        // 🆕 โชว์ banner ทั้ง 2 เคส: (a) ข้อเดียวกันแต่ remote มี guess เพิ่ม
        // (b) อีกเครื่อง sync ข้อใหม่มาแล้ว (target ไม่ตรง) — ทั้งคู่ต้องถามก่อน
        // เพราะ local มี progress อยู่ ไม่ auto-apply เงียบๆ
        if (sameTarget && hasRemoteProgress) return true;
        if (remoteStartedDifferentRound) return true;

        return false;
    }, [progress, localGuessCount, localHasFinalized, dismissedTargetId, alreadySynced, sameTarget, hasRemoteProgress, remoteStartedDifferentRound]);

    useEffect(() => {
        setDismissedTargetId(null);
    }, [localTargetId]);

    if (!shouldShow || !progress) return { gameMode, gameType, visible: false };

    return {
        gameMode,
        gameType,
        visible: true,
        updatedAt: progress.updated_at,
        onLoad: () => {
            applyRemoteProgress(progress.target_id as string, progress.guesses);
            markSynced(progress.updated_at);
        },
        onDismiss: () => {
            setDismissedTargetId(progress.target_id);
        },
    };
}