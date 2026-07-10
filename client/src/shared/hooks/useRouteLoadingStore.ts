// src/shared/hooks/useRouteLoadingStore.ts
import { create } from 'zustand';

interface RouteLoadingState {
    isRouteLoading: boolean;
    setRouteLoading: (loading: boolean) => void;
}

// 🎯 store เล็กๆ แค่ signal เดียว — loading.tsx เป็นคน "ประกาศตัวเอง" ว่ากำลังแสดงอยู่
// เพราะ pathname เพียวๆ ไม่มีทางบอกได้ว่า Suspense boundary กำลัง fallback ไปที่ loading.tsx
// อยู่หรือเปล่า (pathname เปลี่ยนเป็นปลายทางใหม่ไปแล้วตั้งแต่ก่อน component จริง mount ด้วยซ้ำ)
export const useRouteLoadingStore = create<RouteLoadingState>((set) => ({
    isRouteLoading: false,
    setRouteLoading: (loading) => set({ isRouteLoading: loading }),
}));