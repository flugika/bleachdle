// src/lib/sync/syncEngine.ts
//
// v2 changes:
//   1. submitResult() now requires roundKey — the value that lets the
//      server's apply_game_result() reject replays. Callers MUST pass the
//      same value that identifies "this specific round" (see roundKey.ts
//      for the derivation helpers, one per mode shape).
//   2. Added a status event emitter. Previously every failure was a
//      swallowed .catch(() => {}) with zero visibility — a Supabase outage
//      would silently stop counting streaks with no signal to the player.
//      Now 3 consecutive failures within a session flips status to
//      'degraded' and notifies subscribers (see useSyncStatus.ts +
//      SyncStatusBanner.tsx). A single success resets the counter.
//   3. queueProgress() payload widened to accept opaque guess objects
//      instead of the narrow { guess, status: 'correct'|'wrong' } shape —
//      lets character mode (whose guesses are { guess, result:
//      ComparisonOutcome }) use progress sync too. Security posture is
//      unaffected: progress was never security-relevant, only submitResult
//      is, and that path is unchanged in strictness.

export type GameMode = 'character' | 'song' | 'silhouette' | 'release' | 'emoji' | 'quote';
export type GameType = 'daily' | 'unlimited';
export type SyncStatus = 'ok' | 'degraded' | 'offline';

interface ProgressPayload {
    gameMode: GameMode;
    gameType: GameType;
    // 🆕 opaque — any JSON-serializable guess shape is accepted now. The
    // server stores this as jsonb without validating its internal shape
    // (see /api/sync/progress's relaxed schema); it is display-only data,
    // never consulted by any streak/anti-cheat logic.
    guesses: unknown[];
    targetId: string | null;
}

interface FlushOutcome {
    ok: boolean;
    status?: number;
}

const DEBOUNCE_MS = 10_000;
const DEGRADED_THRESHOLD = 3; // consecutive failures before we call it "degraded"

// ── URL resolution ────────────────────────────────────────────────────
// Relative paths only resolve implicitly in a real browser (window.location
// as base). Under vitest/node (undici fetch, no window), the same relative
// string throws ERR_INVALID_URL. Centralize resolution so every call site
// stays testable without needing jsdom + a real origin.
function resolveApiUrl(path: string): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
        // real browser: build absolute explicitly, don't rely on fetch's
        // implicit relative-URL resolution (breaks under jsdom + undici fetch)
        return `${window.location.origin}${path}`;
    }
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    return new URL(path, base).toString();
}

export class SyncEngine {
    private static instance: SyncEngine;

    private pending = new Map<string, ProgressPayload>();
    private timers = new Map<string, ReturnType<typeof setTimeout>>();
    private enabled = true;
    // 🆕 per-key request chain — guarantees POSTs for the same
    // gameMode:gameType land on the server in call order. Without this,
    // two concurrent progress pushes (e.g. the tail end of a finishing
    // round + the very next round's initial push right after "next")
    // can resolve out of order over the network, and the SLOWER stale
    // request overwrites the DB row after the newer one already landed —
    // which looks like "it posted but the new target never saved".
    private inFlight = new Map<string, Promise<FlushOutcome>>();

    private consecutiveFailures = 0;
    private status: SyncStatus = 'ok';
    private listeners = new Set<(status: SyncStatus) => void>();

    static getInstance(): SyncEngine {
        return (this.instance ??= new SyncEngine());
    }

    private keyOf(mode: GameMode, type: GameType) {
        return `${mode}:${type}`;
    }

    // ── status/event plumbing ────────────────────────────────────────────
    onStatusChange(listener: (status: SyncStatus) => void): () => void {
        this.listeners.add(listener);
        listener(this.status); // fire immediately with current status
        return () => this.listeners.delete(listener);
    }

    getStatus(): SyncStatus {
        return this.status;
    }

    private setStatus(next: SyncStatus) {
        if (next === this.status) return;
        this.status = next;
        for (const listener of this.listeners) listener(next);
    }

    private reportSuccess() {
        this.consecutiveFailures = 0;
        this.setStatus('ok');
    }

    private reportFailure(networkLevel: boolean) {
        this.consecutiveFailures += 1;
        if (networkLevel) {
            // fetch itself threw (offline, DNS, CORS) — more severe signal
            this.setStatus('offline');
        } else if (this.consecutiveFailures >= DEGRADED_THRESHOLD) {
            this.setStatus('degraded');
        }
    }

    // ── enable/disable (401 handling, bootstrap gating) ─────────────────
    disable() {
        this.enabled = false;
        for (const t of this.timers.values()) clearTimeout(t);
        this.timers.clear();
        this.pending.clear();
    }

    enable() {
        this.enabled = true;
    }

    // ── progress (debounced, non-authoritative) ─────────────────────────
    queueProgress(payload: ProgressPayload) {
        if (!this.enabled) return;
        const key = this.keyOf(payload.gameMode, payload.gameType);

        this.pending.set(key, payload);

        const existing = this.timers.get(key);
        if (existing) clearTimeout(existing);

        this.timers.set(
            key,
            setTimeout(() => {
                this.flushProgress(key).catch((err) =>
                    console.error('[SyncEngine] progress flush error:', err)
                );
            }, DEBOUNCE_MS)
        );
    }

    async flushProgressNow(gameMode: GameMode, gameType: GameType): Promise<void> {
        const key = this.keyOf(gameMode, gameType);
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
        await this.flushProgress(key);
    }

    private async flushProgress(key: string): Promise<FlushOutcome> {
        if (!this.enabled) {
            console.warn('[SyncEngine] flushProgress SKIPPED — engine is disabled', key);
            return { ok: false };
        }
        const payload = this.pending.get(key);
        if (!payload) return { ok: true };
        this.pending.delete(key);
        this.timers.delete(key);

        const prevInFlight = this.inFlight.get(key) ?? Promise.resolve({ ok: true } as FlushOutcome);
        const thisFlight = prevInFlight
            .catch(() => ({ ok: false }) as FlushOutcome) // don't let an earlier failure break the chain
            .then(() => this.postProgress(payload));
        this.inFlight.set(key, thisFlight);
        return thisFlight;
    }

    private async postProgress(payload: ProgressPayload): Promise<FlushOutcome> {
        try {
            const res = await fetch(resolveApiUrl('/api/sync/progress'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.status === 401) {
                this.disable();
                return { ok: false, status: 401 };
            }
            if (!res.ok) {
                console.error('[SyncEngine] progress push rejected:', res.status);
                this.reportFailure(false);
                return { ok: false, status: res.status };
            }
            this.reportSuccess();
            return { ok: true, status: res.status };
        } catch (err) {
            console.error('[SyncEngine] progress push network error:', err);
            this.reportFailure(true);
            return { ok: false };
        }
    }
    
    // ── result (immediate, authoritative, replay-safe) ──────────────────
    /**
     * @param roundKey MUST uniquely identify this round:
     *   - daily: the scheduled date, 'YYYY-MM-DD'
     *   - unlimited: the target's id
     * See src/lib/sync/roundKey.ts for the exact derivation per mode —
     * do not hand-roll this at call sites, use the helpers so every mode
     * derives it the same way the server validates it.
     */

    /**
     * 🛠️ FIX: ตรวจสอบเวลาที่ใช้เล่นก่อนยิง Sync Result
     * หากเวลาเริ่มรอบน้อยกว่า 3 วินาที (และไม่ใช่การชนะในการทายครั้งแรก) 
     * ให้ทำการ Delay เล็กน้อยก่อนยิง API เพื่อไม่ให้ชน Integrity Gate ของ DB
     */
    private async waitIntegrityGuard(startedAtMs?: number, guessCount?: number): Promise<void> {
        if (!startedAtMs || (guessCount && guessCount === 1)) return;
        const elapsed = Date.now() - startedAtMs;
        const MIN_REQUIRED_MS = 3100; // 3.1 วินาที
        if (elapsed < MIN_REQUIRED_MS) {
            await new Promise((r) => setTimeout(r, MIN_REQUIRED_MS - elapsed));
        }
    }

    async submitResult(
        gameMode: GameMode,
        gameType: GameType,
        roundKey: string,
        isWin: boolean,
        guessCount: number,
        roundStartedAtMs?: number
    ): Promise<FlushOutcome> {
        if (!this.enabled) return { ok: false };
        if (!roundKey) {
            console.error('[SyncEngine] submitResult called without a roundKey — refusing to send');
            return { ok: false };
        }

        // ป้องกัน DB integrity Exception
        await this.waitIntegrityGuard(roundStartedAtMs, guessCount);

        try {
            const res = await fetch(resolveApiUrl('/api/sync/result'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameMode, gameType, roundKey, isWin, guessCount }),
            });

            if (res.status === 401) {
                this.disable();
                return { ok: false, status: 401 };
            }
            if (!res.ok) {
                console.error('[SyncEngine] result push rejected:', res.status);
                this.reportFailure(false);
                return { ok: false, status: res.status };
            }
            this.reportSuccess();
            return { ok: true, status: res.status };
        } catch (err) {
            console.error('[SyncEngine] result push network error:', err);
            this.reportFailure(true);
            return { ok: false };
        }
    }

    // ── reincarnation / soul registry (immediate, low-frequency) ────────
    /** Called from hardReset()/resetStreakKeepMax() call sites — resets
     *  server-side current_streak (keeps max_streak) and clears the
     *  server-side completed pool for this mode's unlimited game_type. */
    async reincarnate(gameMode: GameMode): Promise<FlushOutcome> {
        if (!this.enabled) return { ok: false };
        try {
            const res = await fetch(resolveApiUrl('/api/sync/reincarnate'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameMode }),
            });
            if (res.status === 401) {
                this.disable();
                return { ok: false, status: 401 };
            }
            if (!res.ok) {
                this.reportFailure(false);
                return { ok: false, status: res.status };
            }
            this.reportSuccess();
            return { ok: true, status: res.status };
        } catch {
            this.reportFailure(true);
            return { ok: false };
        }
    }

    async getSoulName(): Promise<string | null> {
        // หาก SyncEngine ถูกปิดไว้ (ช่วงรอ Bootstrap) ไม่ต้องยิง Fetch ให้ติด 401
        if (!this.enabled) return null;

        try {
            const res = await fetch(resolveApiUrl('/api/sync/soul-name'), { credentials: 'include' });
            if (res.status === 401) {
                return null;
            }
            if (!res.ok) return null;
            const data = await res.json();
            return data?.soulName ?? null;
        } catch {
            return null;
        }
    }

    /** Global — no gameMode. players.soul_name is shared across every mode. */
    async registerSoulName(soulName: string): Promise<FlushOutcome> {
        if (!this.enabled) return { ok: false };
        try {
            const res = await fetch(resolveApiUrl('/api/sync/soul-name'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ soulName }),
            });
            if (res.status === 401) {
                this.disable();
                return { ok: false, status: 401 };
            }
            if (!res.ok) {
                this.reportFailure(false);
                return { ok: false, status: res.status };
            }
            this.reportSuccess();
            return { ok: true, status: res.status };
        } catch {
            this.reportFailure(true);
            return { ok: false };
        }
    }
}