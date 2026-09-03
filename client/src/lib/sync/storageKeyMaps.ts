// src/lib/sync/storageKeyMaps.ts
import { STORAGE_KEYS } from '@/src/const/localStorage';
import type { GameMode } from './syncEngine';

/** One STORAGE_KEYS.*_STATS entry per mode — keep in sync if a new mode is added. */
export const STATS_KEY_BY_MODE: Record<GameMode, string> = {
    character: STORAGE_KEYS.CHARACTER_STATS,
    song: STORAGE_KEYS.SONG_STATS,
    silhouette: STORAGE_KEYS.SILHOUETTE_STATS,
    release: STORAGE_KEYS.RELEASE_STATS,
    emoji: STORAGE_KEYS.EMOJI_STATS,
    quote: STORAGE_KEYS.QOUTE_STATS,
};

/** One STORAGE_KEYS.*_COMPLETED entry per mode. */
export const COMPLETED_KEY_BY_MODE: Record<GameMode, string> = {
    character: STORAGE_KEYS.CHARACTER_COMPLETED,
    song: STORAGE_KEYS.SONG_COMPLETED,
    silhouette: STORAGE_KEYS.SILHOUETTE_COMPLETED,
    release: STORAGE_KEYS.RELEASE_COMPLETED,
    emoji: STORAGE_KEYS.EMOJI_COMPLETED,
    quote: STORAGE_KEYS.QOUTE_COMPLETED,
};

export const PROGRESS_KEY_BY_MODE: Record<GameMode, string> = {
    character: STORAGE_KEYS.CHARACTER_PROGRESS,
    song: STORAGE_KEYS.SONG_PROGRESS,
    silhouette: STORAGE_KEYS.SILHOUETTE_PROGRESS,
    release: STORAGE_KEYS.RELEASE_PROGRESS,
    emoji: STORAGE_KEYS.EMOJI_PROGRESS,
    quote: STORAGE_KEYS.QOUTE_PROGRESS,
};