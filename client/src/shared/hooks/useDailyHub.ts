// src/shared/hooks/useDailyHub.ts
"use client";

import { useCallback, useSyncExternalStore } from 'react';
import { DAILY_HUB_MODES, DailyHubModeConfig, getActiveDailyHubModes } from '@/src/config/daily-hub.config';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { getTodayStr } from '@/src/lib/utils/format';

interface DailyHubModeStatus {
    played: boolean;
    won: boolean;
}

interface DailyHubStorageShape {
    date: string; // YYYY-MM-DD ตามเวลาเครื่อง user — ถ้าไม่ตรงกับวันนี้ ถือว่าทั้งก้อนหมดอายุ
    modes: Record<string, DailyHubModeStatus>;
}

export interface DailyHubModeState extends DailyHubModeConfig {
    played: boolean;
    won: boolean;
}

export interface DailyHubSnapshot {
    modes: DailyHubModeState[];
    totalModes: number;
    completedModes: number;
    isAllDone: boolean;
    nextMode: DailyHubModeState | null;
}

const UPDATE_EVENT = 'bleachdle:daily-hub:update';

/**
 * 🛡️ สำคัญ: ตั้งใจใช้คีย์ STORAGE_KEYS.DAILY_HUB_STATUS แยกต่างหากคีย์เดียว ไม่ใช้
 * STORAGE_KEYS.*_PROGRESS ของแต่ละโหมด เพราะคีย์พวกนั้นถูก zustand `persist` middleware
 * ของ useCharacterGame/useSongGame ยึดไว้เก็บ { target, guesses, hasFinalized } ของเกมจริงอยู่แล้ว
 * (ดู custom storage adapter ใน useCharacterGame.ts) — ถ้า Daily Hub ไปเขียนทับคีย์เดียวกัน
 * จะ overwrite save เกมจริงพังทันทีตอนจบเกมแรก
 */
const readHubStorage = (): DailyHubStorageShape => {
    const fallback: DailyHubStorageShape = { date: getTodayStr(), modes: {} };
    if (typeof window === 'undefined') return fallback;

    try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.DAILY_HUB_STATUS);
        if (!raw) return fallback;

        const parsed = JSON.parse(raw) as Partial<DailyHubStorageShape>;

        // ข้ามวันแล้ว = ทั้งก้อนถือว่ายังไม่เล่นของ "วันนี้" — ไม่ต้องลบของเก่าทิ้งจริง แค่ไม่นับ
        if (parsed.date !== getTodayStr()) return fallback;

        return { date: parsed.date, modes: parsed.modes ?? {} };
    } catch {
        return fallback;
    }
};

const writeModeStatus = (modeId: string, won: boolean) => {
    if (typeof window === 'undefined') return;

    // อ่านของวันนี้ก่อนเสมอ (auto-reset ถ้าข้ามวันแล้ว) แล้วค่อย merge เฉพาะโหมดที่เพิ่งจบ
    // กันเคส merge ข้ามวันโดยไม่ตั้งใจ (เช่น เผลอเอาสถานะเมื่อวานมาปนกับวันนี้)
    const current = readHubStorage();
    current.modes[modeId] = { played: true, won };

    window.localStorage.setItem(STORAGE_KEYS.DAILY_HUB_STATUS, JSON.stringify(current));
};

const computeSnapshot = (): DailyHubSnapshot => {
    const activeModes = getActiveDailyHubModes();
    const stored = readHubStorage();

    const modes: DailyHubModeState[] = activeModes.map((cfg) => {
        const status = stored.modes[cfg.id] ?? { played: false, won: false };
        return { ...cfg, played: status.played, won: status.won };
    });

    const completedModes = modes.filter((m) => m.played).length;
    const nextMode = modes.find((m) => !m.played) ?? null;

    return {
        modes,
        totalModes: modes.length,
        completedModes,
        isAllDone: modes.length > 0 && completedModes === modes.length,
        nextMode,
    };
};

// 🛡️ cache แบบ module-level: useSyncExternalStore ต้องได้ reference เดิมกลับไปถ้าไม่มีอะไรเปลี่ยน
// ไม่งั้นจะวน re-render infinite loop เพราะ computeSnapshot() สร้าง object ใหม่ทุกครั้งที่เรียก
let cachedSnapshot: DailyHubSnapshot | null = null;
let cachedDate: string | null = null;

const invalidate = () => {
    cachedSnapshot = computeSnapshot();
    cachedDate = getTodayStr();
};

const getSnapshot = (): DailyHubSnapshot => {
    const today = getTodayStr();
    // recompute เฉพาะตอนยังไม่เคย cache หรือข้ามวันแล้ว (เผื่อ tab เปิดค้างข้ามคืน)
    if (!cachedSnapshot || cachedDate !== today) {
        invalidate();
    }
    return cachedSnapshot as DailyHubSnapshot;
};

// 🛡️ FIX: ต้องเป็น module-level constant คงที่ ไม่ใช่ arrow function ที่ return object literal ใหม่
// ทุกครั้งที่เรียก — useSyncExternalStore เทียบ reference ของค่าที่ได้จาก getServerSnapshot ระหว่าง
// server render กับ client hydration ถ้าไม่ใช่ reference เดิม React จะเตือน/วน re-render ไม่จบ
// (เคสนี้เกิดเฉพาะตอน server-render ก่อน hydrate เท่านั้น แต่กันไว้ให้ชัวร์ครบทุก path)
const SERVER_SNAPSHOT: DailyHubSnapshot = {
    modes: [],
    totalModes: 0,
    completedModes: 0,
    isAllDone: false,
    nextMode: null,
};

const getServerSnapshot = (): DailyHubSnapshot => SERVER_SNAPSHOT;

const subscribe = (callback: () => void) => {
    const handleUpdate = () => {
        invalidate();
        callback();
    };

    window.addEventListener(UPDATE_EVENT, handleUpdate); // อัปเดตในแท็บเดียวกัน (markModePlayed เขียนแล้วยิงเอง)
    window.addEventListener('storage', handleUpdate);    // sync ข้ามแท็บ/หน้าต่าง (browser ยิงให้เอง)

    return () => {
        window.removeEventListener(UPDATE_EVENT, handleUpdate);
        window.removeEventListener('storage', handleUpdate);
    };
};

/**
 * 📅 useDailyHub — แหล่งความจริงเดียวของ "เล่น daily ไปกี่โหมดแล้ววันนี้"
 * เก็บ metadata คนละชั้นกับ game state จริง (guesses/target/hasFinalized ของแต่ละโหมด
 * ยังคงอยู่ใน STORAGE_KEYS.*_PROGRESS ของตัวเองเหมือนเดิมทุกอย่าง ไม่แตะต้อง)
 * เพิ่มโหมดใหม่ทีหลัง (quote/image/emoji/release) แค่เติมรายการใน daily-hub.config.ts
 * ไม่ต้องมาแก้ hook นี้เลย เพราะไม่ผูกกับ schema ภายในของแต่ละ store
 */
export function useDailyHub() {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const markModePlayed = useCallback((modeId: string, won: boolean) => {
        const cfg = DAILY_HUB_MODES.find((m) => m.id === modeId);
        if (!cfg) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`[useDailyHub] ไม่พบ mode "${modeId}" ใน DAILY_HUB_MODES — เช็ค id ให้ตรงกับ daily-hub.config.ts`);
            }
            return;
        }

        writeModeStatus(modeId, won);
        invalidate();
        // 'storage' event ของ browser ไม่ยิงในแท็บที่เขียนเอง ต้องยิง custom event ให้ subscriber ในแท็บเดียวกัน re-render
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
    }, []);

    return { ...snapshot, markModePlayed };
}