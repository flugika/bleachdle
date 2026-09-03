// src/lib/sync/useRemoteProgress.ts
//
// Fetches this player's server-side progress for one (gameMode, gameType)
// once on mount. Intended usage: call it in a wrapper right after hydration,
// and if it returns a target that differs from (or predates) the local
// target, show a lightweight banner — never auto-switch local state on the
// player's behalf, that's a silent-merge mistake in the same spirit as the
// streak-merge issue this whole feature was built to avoid.
'use client';

import { useEffect, useState } from 'react';
import type { GameMode, GameType } from '@/src/lib/sync/syncEngine';

interface RemoteProgress {
    target_id: string | null;
    guesses: unknown[];
    updated_at: string;
}

type FetchState =
    | { status: 'idle' | 'loading' }
    | { status: 'ready'; progress: RemoteProgress | null }
    | { status: 'error' };

export function useRemoteProgress(gameMode: GameMode, gameType: GameType, enabled = true) {
    const [state, setState] = useState<FetchState>({ status: 'idle' });

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        (async () => {
            setState({ status: 'loading' });
            try {
                const res = await fetch(
                    `/api/sync/progress?gameMode=${gameMode}&gameType=${gameType}`,
                    { credentials: 'include', cache: 'no-store' }
                );
                if (cancelled) return;

                if (!res.ok) {
                    // 401 (not provisioned yet) is expected pre-bootstrap — not an error
                    // worth surfacing to the player, just means "nothing to show"
                    setState({ status: res.status === 401 ? 'ready' : 'error', progress: null } as FetchState);
                    return;
                }

                const data = await res.json();
                setState({ status: 'ready', progress: data.progress });
            } catch {
                if (!cancelled) setState({ status: 'error' });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [gameMode, gameType, enabled]);

    return state;
}