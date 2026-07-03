// src/shared/hooks/useCooldown.ts
"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bleach_support_cooldown_until";

// Client-side cooldown is UX only — it lets the user see a countdown instantly
// without waiting on a round trip to the server. Real enforcement lives in
// /api/support via signed cookies (see rateLimitCookie.ts). Clearing
// localStorage bypasses this local timer, but not the server-side one.
export function useCooldown() {
    const [remainingSec, setRemainingSec] = useState(0);

    useEffect(() => {
        const tick = () => {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                setRemainingSec(0);
                return;
            }
            const until = Number(raw);
            const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
            setRemainingSec(remaining);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    const startCooldown = useCallback((seconds: number) => {
        const until = Date.now() + seconds * 1000;
        localStorage.setItem(STORAGE_KEY, String(until));
        setRemainingSec(seconds);
    }, []);

    return { remainingSec, isActive: remainingSec > 0, startCooldown };
}

// A lightweight, random device reference stored in localStorage. Not tied to
// any real-world identity — used only so triage can spot repeat submissions
// from the same browser.
export function getOrCreateClientRef(): string {
    const KEY = "bleach_support_client_ref";
    let ref = localStorage.getItem(KEY);
    if (!ref) {
        ref = crypto.randomUUID();
        localStorage.setItem(KEY, ref);
    }
    return ref;
}