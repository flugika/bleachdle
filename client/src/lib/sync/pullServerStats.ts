// src/lib/sync/pullServerStats.ts
//
// The "Phase 3" piece that was missing: after a successful pairing confirm,
// device B (or A) is now attached to a player row whose player_stats may
// have different numbers than what's sitting in this device's localStorage.
// Without this, the pairing UI would say "linked!" and the game screens
// would keep showing the pre-pairing local numbers indefinitely — pairing
// would *feel* broken even though the backend did the right thing.
//
// Approach: fetch every player_stats row, overwrite the `unlimited`/`daily`
// bucket for each mode's STATS localStorage key, then force a reload. A
// reload (rather than trying to reach into 6+ independent Zustand store
// instances and call their individual loadStats()) is the simple, correct
// choice here — this only runs once, right after the user explicitly
// confirmed a pairing action, so a brief reload is expected and acceptable
// UX, not a random interruption mid-game.
import type { Stats } from '@/src/lib/guessGame/types';
import type { GameMode, GameType } from './syncEngine';
import { STATS_KEY_BY_MODE } from './storageKeyMaps';

interface ServerStatRow {
    game_mode: GameMode;
    game_type: GameType;
    current_streak: number;
    max_streak: number;
    played_count: number;
    passed_count: number;
    guess_distribution: Record<string, number>;
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

export async function pullServerStats(): Promise<{ ok: boolean; applied: number }> {
    try {
        const res = await fetch('/api/sync/stats', { credentials: 'include' });
        if (!res.ok) return { ok: false, applied: 0 };

        const { stats } = (await res.json()) as { stats: ServerStatRow[] };
        if (!Array.isArray(stats) || stats.length === 0) return { ok: true, applied: 0 };

        // group by mode so we read/write each localStorage bucket once,
        // not once per (mode, type) pair
        const byMode = new Map<GameMode, ServerStatRow[]>();
        for (const row of stats) {
            const list = byMode.get(row.game_mode) ?? [];
            list.push(row);
            byMode.set(row.game_mode, list);
        }

        let applied = 0;
        for (const [mode, rows] of byMode) {
            const key = STATS_KEY_BY_MODE[mode];
            if (!key) continue; // unknown mode from server — skip defensively

            let bucket: Record<string, Stats>;
            try {
                bucket = JSON.parse(localStorage.getItem(key) || '{}');
            } catch {
                bucket = {};
            }

            for (const row of rows) {
                bucket[row.game_type] = toStats(row);
                applied += 1;
            }

            localStorage.setItem(key, JSON.stringify(bucket));
        }

        return { ok: true, applied };
    } catch (err) {
        console.error('[pullServerStats] failed:', err);
        return { ok: false, applied: 0 };
    }
}

/** Convenience wrapper for the pairing-confirm flow: pull, then reload. */
export async function pullServerStatsAndReload(): Promise<void> {
    await pullServerStats();
}