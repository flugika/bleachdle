// src/shared/ui/hero-phenomena/useDailyPhenomenon.ts
import { useMemo } from "react";
import { PHENOMENON_KEYS, type PhenomenonKey } from "./constants";

function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

/**
 * Deterministic per-day phenomenon pick. Same event for every visitor on the
 * same calendar day — this is a shared world event, not a per-session random
 * background. Pass the server's `getTodayStr()` value as `dateKey` for exact
 * parity with your daily-puzzle rollover time; otherwise it falls back to the
 * client's local date.
 *
 * NOTE: HeroPhenomenonStage only renders this after mount (see isMounted
 * gate there), so there's no SSR/CSR hydration risk even without dateKey.
 */
export function useDailyPhenomenon(dateKey?: string): PhenomenonKey {
    return useMemo(() => {
        const key = dateKey ?? new Date().toISOString().slice(0, 10);
        const idx = hashStr(key) % PHENOMENON_KEYS.length;
        return PHENOMENON_KEYS[idx];
    }, [dateKey]);
}