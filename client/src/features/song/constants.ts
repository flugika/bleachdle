// src/features/song/constants.ts

/**
 * 🎵 REVEAL LADDER — ความยาวคลิปที่เปิดให้ฟังในแต่ละครั้งที่เดา (สไตล์ Heardle)
 * index 0 = การเดาครั้งที่ 1 (ยากสุด, ได้ยินแค่ 0.2s) ไล่ไปจนถึง index 5 = ครั้งที่ 6 (10s)
 * ถ้าเดาเกินครั้งที่ 6 (จนครบ MAX_SONG_GUESSES = 10 ตาม unlimited mode) จะค้างที่ 10s ยาวสุดต่อไปเรื่อยๆ
 * ไม่มีการลงโทษเพิ่มเพราะ 10s ถือว่าเพดานสูงสุดที่ตั้งใจให้ฟังแล้ว
 */
export const SONG_REVEAL_STAGES_MS = [200, 500, 1000, 3000, 5000, 10000] as const;

/**
 * แปลง "จำนวนครั้งที่เดาไปแล้ว" (0-based, ก่อนเดาครั้งแรก = 0) เป็นความยาวคลิป (ms) ที่ควรเปิดให้ฟังรอบถัดไป
 * เกินความยาวของ ladder แล้วให้ค้างที่ค่าสุดท้าย (10s) แทนการ throw/undefined
 */
export function getRevealMsForAttempt(attemptIndex: number): number {
    const clampedIndex = Math.min(Math.max(attemptIndex, 0), SONG_REVEAL_STAGES_MS.length - 1);
    return SONG_REVEAL_STAGES_MS[clampedIndex];
}

/** แปลง ms → label อ่านง่ายสำหรับโชว์ UI เช่น "0.2s", "1s", "10s" */
export function formatRevealMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}