// src/lib/store/createNestedStorage.ts
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * สร้าง zustand persist storage adapter ที่ nest ข้อมูลของหลาย store
 * ไว้ใต้ localStorage key เดียวกัน (`storageKey`) แทนที่จะสร้าง
 * top-level key แยกทุก store (พฤติกรรมปกติของ zustand persist)
 *
 * ใช้ store `name` (เช่น 'daily', 'unlimited') เป็น sub-key ภายใน object นั้น
 */
export function createNestedStorage(storageKey: string): StateStorage {
    const readBucket = (): Record<string, unknown> => {
        try {
            return JSON.parse(localStorage.getItem(storageKey) || '{}');
        } catch {
            // กัน localStorage มีข้อมูลเสีย/parse ไม่ได้ ไม่ให้ทั้งแอพพัง
            return {};
        }
    };

    const writeBucket = (bucket: Record<string, unknown>) => {
        localStorage.setItem(storageKey, JSON.stringify(bucket));
    };

    return {
        getItem: (name) => {
            const bucket = readBucket();
            return name in bucket ? JSON.stringify(bucket[name]) : null;
        },
        setItem: (name, value) => {
            const bucket = readBucket();
            bucket[name] = JSON.parse(value);
            writeBucket(bucket);
        },
        removeItem: (name) => {
            const bucket = readBucket();
            delete bucket[name];
            writeBucket(bucket);
        },
    };
}

/**
 * Wrapper สะดวกใช้ พร้อม createJSONStorage ในตัว — ใช้แทน
 * `createJSONStorage(() => ({...adapter...}))` ที่เขียนซ้ำทุก store
 */
export function nestedJSONStorage(storageKey: string) {
    return createJSONStorage(() => createNestedStorage(storageKey));
}