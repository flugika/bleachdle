// src/lib/sync/completedSyncEvent.ts
//
// Lightweight pub/sub for "completed data changed from outside React"
// (i.e. syncStateOnLoad wrote localStorage directly, not through a
// component's own finalizeGame()/hardReset() flow). Wrappers' isGameCompleted
// effects don't re-run on their own when localStorage changes underneath
// them — there's no state/prop that ties them to that write. This event is
// the missing trigger.
//
// Not using React Context because this needs to reach every unlimited
// wrapper mounted anywhere in the tree, and syncStateOnLoad itself runs
// outside any component (called from useDeviceBootstrap). A plain
// window CustomEvent is the simplest thing that reaches both worlds.
import type { GameMode } from './syncEngine';

const EVENT_NAME = 'bl:completed-synced';

export interface CompletedSyncedDetail {
    gameMode: GameMode;
}

export function emitCompletedSynced(gameMode: GameMode): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<CompletedSyncedDetail>(EVENT_NAME, { detail: { gameMode } }));
}

/** Returns an unsubscribe function — call in a useEffect cleanup. */
export function onCompletedSynced(gameMode: GameMode, callback: () => void): () => void {
    if (typeof window === 'undefined') return () => { };
    const handler = (e: Event) => {
        const detail = (e as CustomEvent<CompletedSyncedDetail>).detail;
        if (detail?.gameMode === gameMode) callback();
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}