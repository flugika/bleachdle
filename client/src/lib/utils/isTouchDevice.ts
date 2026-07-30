// src/lib/utils/isTouchDevice.ts

export function isTouchPrimaryDevice(): boolean {
    if (typeof window === 'undefined') return false;
    // coarse pointer = นิ้ว/touch เป็นหลัก ไม่ใช่ mouse
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}