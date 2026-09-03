// src/lib/sync/syncStateOnLoad.ts
//
// THE piece that was missing: this is what makes "play on computer, open
// iPad" actually carry over. Runs once per page load, right after device
// bootstrap confirms identity (see useDeviceBootstrap.ts). Not gated behind
// pairing — this runs for every authenticated device, paired or not,
// because a solo device's OWN server state is also the authoritative
// record of everything that succeeded server-side (every finalizeGame()
// already calls submitResult()/record_completed() on this exact device
// too — server truth should never be "behind" local truth except when a
// sync call genuinely failed, which SyncStatusBanner already surfaces).
//
// Policy: pull server stats + completed + reincarnation counts → compare
// against what's currently in localStorage → if different, overwrite
// localStorage AND reload once (guarded by sessionStorage so we never
// reload-loop). If identical (by far the common case — nothing changed
// since last visit), no reload, completely invisible to the player.
//
// 🆕 reincarnation_count reconciliation: previously SOUL_REGISTRY.*.count
// only ever moved forward optimistically on handleHardReset() and was NEVER
// pulled back from server truth — a reincarnate() call that failed
// (offline, dropped request) left local count permanently ahead of server
// with no way to self-heal. Now included in the same reconcile pass as
// stats/completed.
//
// Deliberately does NOT pull player_progress here — mid-round state is
// handled separately by the passive RemoteProgressBanner (a silent
// auto-load of someone's IN-PROGRESS guesses would be a much more jarring
// experience than a reload before they've started looking at anything).
import { STORAGE_KEYS } from '@/src/const/localStorage';
import type { Stats } from '@/src/lib/guessGame/types';
import type { GameMode, GameType } from './syncEngine';
import { STATS_KEY_BY_MODE, COMPLETED_KEY_BY_MODE } from './storageKeyMaps';
import { clientFetch } from '@/src/lib/api/clientFetch';
import { applyRemoteStatsToStore } from './storeAccessMaps';
import { emitCompletedSynced } from './completedSyncEvent';

interface ServerStatRow {
    game_mode: GameMode;
    game_type: GameType;
    current_streak: number;
    max_streak: number;
    played_count: number;
    passed_count: number;
    guess_distribution: Record<string, number>;
}

interface ServerCompletedRow {
    game_mode: GameMode;
    game_type: GameType;
    completed_key: string;
}

interface ServerSoulRegistryRow {
    game_mode: GameMode;
    reincarnation_count: number;
}

const RELOAD_GUARD_KEY = 'bl_sync_reloaded_at';
const RELOAD_GUARD_TTL_MS = 60_000; // don't reload again within this window even across remounts

function toStats(row: ServerStatRow): Stats {
    return {
        currentStreak: row.current_streak,
        maxStreak: row.max_streak,
        playedCount: row.played_count,
        passedCount: row.passed_count,
        guessDistribution: row.guess_distribution ?? {},
    };
}

function readBucket(key: string): Record<string, unknown> {
    try {
        return JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
        return {};
    }
}

function shouldSkipReload(): boolean {
    try {
        const last = sessionStorage.getItem(RELOAD_GUARD_KEY);
        if (!last) return false;
        return Date.now() - Number(last) < RELOAD_GUARD_TTL_MS;
    } catch {
        return false; // sessionStorage unavailable (rare/private mode) — allow reload
    }
}

function markReloaded() {
    try {
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
        // ignore — worst case we might reload twice in a row, not a big deal
    }
}

export async function syncStateOnLoad(): Promise<{ changed: boolean }> {
    const [statsRes, completedRes, registryRes] = await Promise.allSettled([
        clientFetch('/api/sync/stats', { credentials: 'include' }),
        clientFetch('/api/sync/completed', { credentials: 'include' }),
        clientFetch('/api/sync/soul-registry', { credentials: 'include' }),
    ]);

    if (statsRes.status !== 'fulfilled' || !statsRes.value.ok) return { changed: false };
    if (completedRes.status !== 'fulfilled' || !completedRes.value.ok) return { changed: false };
    // 🆕 soul-registry is best-effort — don't abort the whole reconcile if
    // just this one call fails, stats/completed reconciliation still matters
    const registryOk = registryRes.status === 'fulfilled' && registryRes.value.ok;

    const { stats } = (await statsRes.value.json()) as { stats: ServerStatRow[] };
    const { completed } = (await completedRes.value.json()) as { completed: ServerCompletedRow[] };
    const registry = registryOk
        ? ((await (registryRes as PromiseFulfilledResult<Response>).value.json()) as { registry: ServerSoulRegistryRow[] }).registry
        : [];

    let anythingChanged = false;

    // ── stats ────────────────────────────────────────────────────────────
    const statsByMode = new Map<GameMode, ServerStatRow[]>();
    for (const row of stats) {
        const list = statsByMode.get(row.game_mode) ?? [];
        list.push(row);
        statsByMode.set(row.game_mode, list);
    }

    for (const [mode, rows] of statsByMode) {
        const key = STATS_KEY_BY_MODE[mode];
        if (!key) continue;

        const localBucket = readBucket(key);
        const serverBucket = { ...localBucket } as Record<string, Stats>;

        for (const row of rows) {
            serverBucket[row.game_type] = toStats(row);
        }

        if (JSON.stringify(serverBucket) !== JSON.stringify(localBucket)) {
            localStorage.setItem(key, JSON.stringify(serverBucket));
            anythingChanged = true;

            // 🆕 push เข้า live store ตรงๆ ด้วย — ไม่มี reload แล้ว การเขียน
            // localStorage อย่างเดียวไม่ทำให้ store ที่ mount อยู่ re-render
            for (const row of rows) {
                applyRemoteStatsToStore(row.game_mode, row.game_type, toStats(row));
            }
        }
    }

    // ── completed ────────────────────────────────────────────────────────
    const completedByMode = new Map<GameMode, ServerCompletedRow[]>();
    for (const row of completed) {
        const list = completedByMode.get(row.game_mode) ?? [];
        list.push(row);
        completedByMode.set(row.game_mode, list);
    }

    for (const [mode, rows] of completedByMode) {
        const key = COMPLETED_KEY_BY_MODE[mode];
        if (!key) continue;

        const localBucket = readBucket(key);
        const serverBucket = { ...localBucket } as Record<string, string[]>;

        const byType = new Map<GameType, string[]>();
        for (const row of rows) {
            const list = byType.get(row.game_type) ?? [];
            list.push(row.completed_key);
            byType.set(row.game_type, list);
        }
        for (const [gameType, keys] of byType) {
            serverBucket[gameType] = keys;
        }

        if (JSON.stringify(serverBucket) !== JSON.stringify(localBucket)) {
            localStorage.setItem(key, JSON.stringify(serverBucket));
            anythingChanged = true;
            emitCompletedSynced(mode);
        }
    }

    // ── 🆕 reincarnation count (SOUL_REGISTRY.*.count) ──────────────────
    // Note: SOUL_REGISTRY also stores `.name` per mode, which we do NOT
    // touch here — soul_name reconciliation happens via the separate
    // getSoulName()/backfill path in each wrapper (see useSoulName.ts /
    // the per-mode backfill effects), not this pass. Only `.count` is
    // server-authoritative reincarnation tracking.
    if (registry.length > 0) {
        const soulRegistryBucket = readBucket(STORAGE_KEYS.SOUL_REGISTRY) as Record<
            string,
            { name?: string; count?: number }
        >;
        const nextSoulRegistryBucket = { ...soulRegistryBucket };
        let registryChanged = false;

        for (const row of registry) {
            const existing = nextSoulRegistryBucket[row.game_mode] ?? { name: '', count: 0 };
            if ((existing.count ?? 0) !== row.reincarnation_count) {
                nextSoulRegistryBucket[row.game_mode] = { ...existing, count: row.reincarnation_count };
                registryChanged = true;
            }
        }

        if (registryChanged) {
            localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(nextSoulRegistryBucket));
            anythingChanged = true;
        }
    }

    // modes/types that exist locally but have NO server rows at all (e.g.
    // this device never finalized anything for that mode) are intentionally
    // left untouched — nothing to reconcile against, local is already correct
    return { changed: anythingChanged };
}

/**
 * Call once, right after device bootstrap confirms identity. Reloads the
 * page exactly once if server state genuinely differed from local — safe
 * to call on every mount, the sessionStorage guard prevents reload loops
 * and prevents re-reloading if this somehow re-fires within the same tab
 * session (e.g. React StrictMode double-invoke in dev).
 */
export async function syncStateOnLoadAndReloadIfChanged(): Promise<void> {
    if (shouldSkipReload()) return;

    try {
        const { changed } = await syncStateOnLoad();
        if (changed) {
            markReloaded();
        }
    } catch (err) {
        console.error('[syncStateOnLoad] failed:', err);
        // fail silent — worst case this device's localStorage stays as-is
        // for this visit, same as before this system existed at all
    }
}