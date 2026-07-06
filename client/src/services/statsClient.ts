// src/lib/services/statsClient.ts
import type { StatMode } from '@/src/entities/stats/types';

export async function recordDailyStat(mode: StatMode, isWin: boolean, guessCount: number, turnstileToken: string) {
    try {
        const res = await fetch('/api/stats/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, isWin, guessCount, turnstileToken }),
        });

        if (!res.ok) {
            console.error('[recordDailyStat] non-OK response:', await res.text());
        }
    } catch (err) {
        // ── ห้าม throw ต่อ: นี่คือ analytics side-effect ไม่ใช่ critical path ของเกม
        console.error('[recordDailyStat] network error:', err);
    }
}