// src/lib/api/clientFetch.ts

import { clearAllLocalGameState } from '@/src/lib/sync/clearAllLocalGameState';

export async function clientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const res = await fetch(input, {
        credentials: 'include',
        ...init,
    });

    // 🟢 ถ้า Server ตอบ 401 แสดงว่า device_id โดน Unlink / เตะออกจากระบบไปแล้ว
    if (res.status === 401 && typeof window !== 'undefined') {
        clearAllLocalGameState();
        window.location.reload();
        // Return Promise ค้างไว้เพื่อตัด Flow การทำงานใน Component ไม่ให้รันต่อ
        return new Promise(() => { });
    }

    return res;
}