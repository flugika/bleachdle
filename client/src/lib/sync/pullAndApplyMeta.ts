// src/lib/sync/pullAndApplyMeta.ts
//
// Sibling to syncStateOnLoad, for call sites that CANNOT afford a full page
// reload (manual resync mid-session) — same server fetch + same localStorage
// write, but returns the resolved values so the caller can push them into
// the live Zustand store + component state directly instead of waiting for
// a remount to pick up localStorage.
import type { GameMode, GameType } from './syncEngine';
import type { Stats } from '@/src/lib/guessGame/types';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { STATS_KEY_BY_MODE, COMPLETED_KEY_BY_MODE } from './storageKeyMaps';
import { clientFetch } from '@/src/lib/api/clientFetch';

interface ServerStatRow {
    game_mode: GameMode; game_type: GameType;
    current_streak: number; max_streak: number;
    played_count: number; passed_count: number;
    guess_distribution: Record<string, number>;
}
interface ServerCompletedRow { game_mode: GameMode; game_type: GameType; completed_key: string; }
interface ServerSoulRegistryRow {
    game_mode: GameMode;
    reincarnation_count: number;
    soul_name: string | null;
}

export interface PulledMeta {
    stats: Stats | null;
    completed: string[];
    reincarnationCount: number | null;
    soulName: string | null;
}

function toStats(row: ServerStatRow): Stats {
    return {
        currentStreak: row.current_streak,
        maxStreak: row.max_streak,
        playedCount: row.played_count,
        passedCount: row.passed_count,
        guessDistribution: row.guess_distribution ?? {},
    };
}

/**
 * Pull this (gameMode, gameType)'s stats/completed/registry, write through
 * to localStorage (so later reads/reloads stay consistent), and return the
 * resolved values so the caller can also push them into live component/
 * store state without a reload. Fail-soft per section, same as
 * syncStateOnLoad.
 */
export async function pullAndApplyMeta(gameMode: GameMode, gameType: GameType): Promise<PulledMeta> {
    const [statsRes, completedRes, registryRes] = await Promise.allSettled([
        clientFetch('/api/sync/stats', { credentials: 'include' }),
        clientFetch('/api/sync/completed', { credentials: 'include' }),
        clientFetch('/api/sync/soul-registry', { credentials: 'include' }),
    ]);

    let resolvedStats: Stats | null = null;
    if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const { stats } = (await statsRes.value.json()) as { stats: ServerStatRow[] };
        const row = stats.find((r) => r.game_mode === gameMode && r.game_type === gameType);
        if (row) {
            resolvedStats = toStats(row);
            const key = STATS_KEY_BY_MODE[gameMode];
            const bucket = JSON.parse(localStorage.getItem(key) || '{}');
            bucket[gameType] = resolvedStats;
            localStorage.setItem(key, JSON.stringify(bucket));
        }
    }

    let resolvedCompleted: string[] = [];
    if (completedRes.status === 'fulfilled' && completedRes.value.ok) {
        const { completed } = (await completedRes.value.json()) as { completed: ServerCompletedRow[] };
        resolvedCompleted = completed
            .filter((r) => r.game_mode === gameMode && r.game_type === gameType)
            .map((r) => r.completed_key);
        const key = COMPLETED_KEY_BY_MODE[gameMode];
        const bucket = JSON.parse(localStorage.getItem(key) || '{}');
        bucket[gameType] = resolvedCompleted;
        localStorage.setItem(key, JSON.stringify(bucket));
    }

    let resolvedReincarnationCount: number | null = null;
    let resolvedSoulName: string | null = null;
    if (registryRes.status === 'fulfilled' && registryRes.value.ok) {
        const { registry } = (await registryRes.value.json()) as { registry: ServerSoulRegistryRow[] };
        const row = registry.find((r) => r.game_mode === gameMode);
        if (row) {
            resolvedReincarnationCount = row.reincarnation_count;
            resolvedSoulName = row.soul_name;
            const bucket = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
            bucket[gameMode] = {
                name: row.soul_name ?? bucket[gameMode]?.name ?? '', // อย่าล้างชื่อ local ถ้า server ไม่มี
                count: row.reincarnation_count,
            };
            localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(bucket));
        }
    }

    return {
        stats: resolvedStats,
        completed: resolvedCompleted,
        reincarnationCount: resolvedReincarnationCount,
        soulName: resolvedSoulName,
    };
}