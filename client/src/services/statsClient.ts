// src/lib/services/statsClient.ts
import type { StatMode } from '@/src/entities/stats/types';

export async function recordDailyStat(
    mode: StatMode,
    isWin: boolean,
    guessCount: number,
    date?: string
) {
    try {
        const res = await fetch('/api/stats/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mode,
                isWin,
                guessCount,
                date, // 🆕 แนบส่งให้ API นำไป Validate และบันทึก
            }),
        });

        if (!res.ok) {
            console.error('[recordDailyStat] non-OK response:', await res.text());
        }
    } catch (err) {
        console.error('[recordDailyStat] network error:', err);
    }
}