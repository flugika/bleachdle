// src/lib/sync/useSoulName.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { SyncEngine } from '@/src/lib/sync/syncEngine';
import { STORAGE_KEYS } from '@/src/const/localStorage';

type SoulNameStatus = 'idle' | 'loading' | 'ready' | 'error';

const ALL_MODE_KEYS = ['character', 'song', 'silhouette', 'release', 'emoji', 'quote'] as const;

/** Mirrors the new name into every mode's local SOUL_REGISTRY entry
 *  immediately — this is what makes the rename feel instant everywhere
 *  (other game pages, if already open in another tab) instead of waiting
 *  for each page's own async getSoulName() backfill on next mount. */
function writeNameToAllLocalRegistries(name: string) {
    try {
        const rd = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        for (const mode of ALL_MODE_KEYS) {
            rd[mode] = { ...(rd[mode] || { name: '', count: 0 }), name };
        }
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(rd));
    } catch {
        // localStorage unavailable — the server write still succeeds,
        // this is purely a local-reflection nicety
    }
}

export function useSoulName() {
    const [soulName, setSoulName] = useState<string | null>(null);
    const [status, setStatus] = useState<SoulNameStatus>('idle');

    const refetch = useCallback(async () => {
        setStatus('loading');
        const name = await SyncEngine.getInstance().getSoulName();
        setSoulName(name);
        setStatus('ready');
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    /**
     * UX-first: sets `soulName` and every mode's local registry
     * IMMEDIATELY, before the network call resolves — matches the pattern
     * every other write in this app follows (local first, sync fire-and-
     * forget after). Rolls back to the previous name only if the server
     * call genuinely fails, so a slow/offline network doesn't leave the UI
     * frozen waiting.
     */
    const updateName = useCallback(async (newName: string): Promise<boolean> => {
        const trimmed = newName.trim();
        if (!trimmed) return false;

        const previous = soulName;

        setSoulName(trimmed);
        writeNameToAllLocalRegistries(trimmed);

        const result = await SyncEngine.getInstance().registerSoulName(trimmed);
        if (!result.ok) {
            // roll back — the optimistic update didn't actually take server-side
            setSoulName(previous);
            if (previous) writeNameToAllLocalRegistries(previous);
            return false;
        }
        return true;
    }, [soulName]);

    return { soulName, status, refetch, updateName };
}