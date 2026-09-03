// src/lib/sync/clearAllLocalGameState.ts
//
// Called exactly once: right before reloading after /api/device/unlink.
// Without this, a device that unlinks keeps whatever streak/completed
// numbers it had under the OLD shared identity sitting in localStorage —
// syncStateOnLoad only OVERWRITES keys where the server has a matching row,
// it never clears keys the server has no row for at all, so a brand-new
// (empty) player_id's zero stats never actually reach localStorage for any
// mode this device hasn't played yet under the new identity. The device
// would show stale numbers indefinitely, contradicting the "this device
// will start fresh" promise made in the unlink confirmation dialog.
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { STATS_KEY_BY_MODE, COMPLETED_KEY_BY_MODE, PROGRESS_KEY_BY_MODE } from './storageKeyMaps';

export function clearAllLocalGameState(): void {
    const keysToWipe = new Set<string>([
        ...Object.values(STATS_KEY_BY_MODE),
        ...Object.values(COMPLETED_KEY_BY_MODE),
        STORAGE_KEYS.SOUL_REGISTRY,
        // progress buckets share the same key as completed's sibling
        // "*_PROGRESS" entries — pull those in too so an in-flight round
        // under the old identity doesn't linger either.
        ...Object.values(PROGRESS_KEY_BY_MODE),
    ]);

    for (const key of keysToWipe) {
        try {
            localStorage.removeItem(key);
        } catch {
            // ignore — worst case a stale key survives, not fatal
        }
    }
}