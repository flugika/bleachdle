// src/lib/services/statsClient.ts
import type { StatMode } from '@/src/entities/stats/types';

// Map สำหรับเก็บ Promise ของ Request ที่กำลังทำงานอยู่ (In-Flight)
const inFlightRequests = new Map<string, Promise<void>>();

export async function recordDailyStat(
    mode: StatMode,
    isWin: boolean,
    guessCount: number,
    turnstileToken: string | undefined,
    date?: string
): Promise<void> {
    // สร้าง Unique Lock Key จาก Mode และ Date
    const lockKey = `${mode}:${date ?? 'today'}`;

    // หากมี Request เดียวกันกำลังรันอยู่ ให้ยึด Promise เดิม (Deduplicate)
    if (inFlightRequests.has(lockKey)) {
        console.warn(`[recordDailyStat] Request for ${lockKey} already in flight. Deduplicating.`);
        return inFlightRequests.get(lockKey)!;
    }

    const requestPromise = (async () => {
        try {
            const res = await fetch('/api/stats/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    isWin,
                    guessCount,
                    turnstileToken,
                    date,
                }),
            });

            if (!res.ok) {
                console.error('[recordDailyStat] non-OK response:', await res.text());
            }
        } catch (err) {
            console.error('[recordDailyStat] network error:', err);
        } finally {
            // เคลียร์ Lock ออกเมื่อ Request ทำงานเสร็จ (ไม่ว่าจะ success หรือ error)
            inFlightRequests.delete(lockKey);
        }
    })();

    inFlightRequests.set(lockKey, requestPromise);
    return requestPromise;
}