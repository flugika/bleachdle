// src/lib/sync/fetchActiveRemoteProgress.ts
import type { GameMode, GameType } from './syncEngine';

export interface RawRemoteProgress {
    target_id: string | null;
    guesses: unknown[];
    updated_at: string;
}

const REMOTE_CHECK_TIMEOUT_MS = 1500;

/**
 * Fetch this player's server-side progress for one (gameMode, gameType),
 * bounded by a hard timeout — used right before an unlimited-mode store
 * picks a new random target, so two devices hitting "next round" close
 * together resume the SAME round instead of silently diverging.
 *
 * Fail-soft by design: any failure (timeout, network, non-200) returns
 * null and the caller falls back to picking a random target as before —
 * this check must never block or break gameplay, only improve it when
 * it succeeds quickly.
 */
export async function fetchActiveRemoteProgress(
    gameMode: GameMode,
    gameType: GameType
): Promise<RawRemoteProgress | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOTE_CHECK_TIMEOUT_MS);

    try {
        const res = await fetch(`/api/sync/progress?gameMode=${gameMode}&gameType=${gameType}`, {
            credentials: 'include',
            signal: controller.signal,
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const data = await res.json();
        return (data.progress as RawRemoteProgress | null) ?? null;
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}