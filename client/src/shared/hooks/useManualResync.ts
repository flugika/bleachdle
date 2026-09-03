// src/shared/hooks/useManualResync.ts
'use client';

import { useCallback, useState } from 'react';
import type { GameMode, GameType } from '@/src/lib/sync/syncEngine';

interface RemoteProgressResponse {
    progress: {
        target_id: string | null;
        guesses: unknown[];
        updated_at: string;
    } | null;
}

type ResyncStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export function useManualResync(
    gameMode: GameMode,
    gameType: GameType,
    applyRemoteProgress: (remoteTargetId: string, remoteGuesses: unknown[]) => void
) {
    const [status, setStatus] = useState<ResyncStatus>('idle');

    const resync = useCallback(async () => {
        setStatus('loading');
        try {
            const res = await fetch(
                `/api/sync/progress?gameMode=${gameMode}&gameType=${gameType}`,
                { credentials: 'include', cache: 'no-store' }
            );
            if (!res.ok) {
                setStatus('error');
                return;
            }
            const data = (await res.json()) as RemoteProgressResponse;
            const progress = data.progress;

            // 🆕 เดิมเช็ค guesses.length === 0 แล้วถือว่า "empty" ไม่มีอะไรให้ sync —
            // แต่ target_id ใหม่ที่ guesses ยังว่างเปล่า (เพิ่งกด "next" บนอีกเครื่อง)
            // ก็เป็นข้อมูลที่ "มีความหมาย" ต้องซิงค์เหมือนกัน ไม่ใช่ empty state
            // มีแค่กรณี target_id เป็น null เท่านั้นที่แปลว่า "ไม่มี progress ให้ sync จริงๆ"
            if (!progress || !progress.target_id || !Array.isArray(progress.guesses)) {
                setStatus('empty');
                return;
            }

            applyRemoteProgress(progress.target_id, progress.guesses);
            setStatus('success');
        } catch {
            setStatus('error');
        }
    }, [gameMode, gameType, applyRemoteProgress]);

    return { resync, status };
}