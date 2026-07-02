// src/lib/search/fuzzy.ts
import Fuse, { FuseOptionKey } from 'fuse.js';

/**
 * ⚔️ Enterprise Generic Search Engine (Fixed Namespace Version)
 * รองรับการสร้างดัชนีค้นหาสำหรับทุกโมเดลในโปรเจกต์แบบ Type-Safe 100%
 */
export const createSearchEngine = <T>(
    items: T[],
    options?: { keys: FuseOptionKey<T>[] }
) => {
    // 💡 ถ้าไม่ได้ส่ง keys มา จะดีฟอลต์ไปค้นหาที่ฟิลด์ 'name' 
    // ใช้รหัสหลบหลีก (unknown) เพื่อป้องกันไม่ให้คอมไพเลอร์บ่นเรื่องคีย์เริ่มต้นกับ Generic T
    const targetKeys = options?.keys ?? (['name'] as unknown as FuseOptionKey<T>[]);

    return new Fuse(items, {
        keys: targetKeys,
        threshold: 0.25,
        minMatchCharLength: 1,
    });
};