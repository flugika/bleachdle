// src/shared/ui/hero-phenomena/useDailyPhenomenon.ts
import { useMemo } from "react";
import { PHENOMENON_KEYS, type PhenomenonKey } from "./constants";

// ----------------------------------------------------------------------------
// Fixed epoch — the "day zero" every dayIndex is counted from. Changing this
// value reshuffles the entire history/future of the rotation, so treat it as
// a one-time constant, not a config knob.
// ----------------------------------------------------------------------------
const EPOCH_MS = Date.UTC(2024, 0, 1); // 2024-01-01T00:00:00Z
const MS_PER_DAY = 86_400_000;

/**
 * mulberry32 — tiny, fast, deterministic PRNG. Same seed -> same output
 * sequence on every device, every browser, every server render. This is the
 * property a hash-of-date-string trick doesn't reliably give you once you
 * need more than "pick one of N", e.g. shuffling a whole cycle.
 */
function mulberry32(seed: number) {
    let t = seed >>> 0;
    return function rand() {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

/** Deterministic Fisher–Yates using a seeded PRNG instead of Math.random(). */
function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
    const a = [...arr];
    const rand = mulberry32(seed);
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Builds one shuffled cycle (all PHENOMENON_KEYS exactly once, order seeded
 * by cycleIndex) and, if it would start with the same phenomenon the
 * previous cycle ended on, deterministically fixes the seam so two
 * consecutive days are never the same phenomenon.
 */
function buildCycle(cycleIndex: number): PhenomenonKey[] {
    const shuffled = seededShuffle(PHENOMENON_KEYS, cycleIndex);

    if (cycleIndex > 0) {
        const prevCycle = seededShuffle(PHENOMENON_KEYS, cycleIndex - 1);
        const prevLast = prevCycle[prevCycle.length - 1];

        if (shuffled[0] === prevLast) {
            // Swap the seam with the first position that differs. Guaranteed
            // to exist whenever PHENOMENON_KEYS.length > 1.
            const swapWith = shuffled.findIndex((k) => k !== prevLast);
            [shuffled[0], shuffled[swapWith]] = [shuffled[swapWith], shuffled[0]];
        }
    }

    return shuffled;
}

function daysSince(dateKey?: string): number {
    const ms = dateKey ? Date.parse(`${dateKey}T00:00:00Z`) : Date.now();
    return Math.floor((ms - EPOCH_MS) / MS_PER_DAY);
}

/**
 * Deterministic per-day phenomenon pick — no repeats, no overrides.
 *
 * Same event for every visitor on the same calendar day (a shared world
 * event, not a per-session random background), AND every phenomenon in
 * PHENOMENON_KEYS is guaranteed to appear once per full cycle before any
 * repeats, with the seam between cycles guaranteed to never repeat the
 * previous day's pick either.
 *
 * Pass the server's `getTodayStr()` value as `dateKey` for exact parity with
 * your daily-puzzle rollover time; otherwise it falls back to the client's
 * local date (UTC midnight boundary).
 *
 * NOTE: HeroPhenomenonStage only renders this after mount (see isMounted
 * gate there), so there's no SSR/CSR hydration risk even without dateKey.
 */
export function useDailyPhenomenon(dateKey?: string): PhenomenonKey {
    return useMemo(() => {
        const dayIndex = daysSince(dateKey);
        const cycleLength = PHENOMENON_KEYS.length;
        const cycleIndex = Math.floor(dayIndex / cycleLength);
        const positionInCycle = ((dayIndex % cycleLength) + cycleLength) % cycleLength;

        const cycle = buildCycle(cycleIndex);
        return cycle[positionInCycle];
    }, [dateKey]);
}