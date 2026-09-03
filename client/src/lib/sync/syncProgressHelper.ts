// src/lib/sync/syncProgressHelper.ts
import { SyncEngine, type GameMode, type GameType } from './syncEngine';

export const syncProgressImmediately = async (
    gameMode: GameMode,
    gameType: GameType,
    targetId: string | null,
    guesses: unknown[]
): Promise<void> => {
    if (!targetId) return;

    // 🆕 เดิมเช็ค DEVICE_ID_COOKIE ผ่าน document.cookie ก่อนยิง — แต่คุกกี้ตัวนี้
    // อ่านไม่ได้จาก JS (httpOnly) หรือไม่เคยถูก set ในโฟลว์นี้เลย ทำให้เงื่อนไข
    // เป็น false ตลอดกาล ไม่ใช่แค่ race ตอน bootstrap — เห็นได้จากว่า
    // /api/sync/result ที่ไม่เช็คคุกกี้นี้เลย ยิงผ่าน 200 ปกติด้วย credentials
    // เดียวกัน เอาการเช็คแบบผิดๆ นี้ออก ให้ fetch ยิงตรงๆ แล้วให้ 401 handling
    // ที่มีอยู่แล้วใน SyncEngine (disable() on 401) จัดการ auth เอง
    const engine = SyncEngine.getInstance();
    engine.enable();
    engine.queueProgress({ gameMode, gameType, guesses, targetId });
    await engine.flushProgressNow(gameMode, gameType).catch(() => { });
};