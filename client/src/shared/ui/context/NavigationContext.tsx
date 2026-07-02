// src/shared/context/NavigationContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

export type SenkaimonState = "idle" | "closing" | "closed" | "opening";

interface NavigationContextProps {
    state: SenkaimonState;
    navigate: (href: string) => Promise<void>;
    /** เรียกจากหน้าปลายทางตอนข้อมูล/UI พร้อมแสดงผลจริงแล้ว (เช่น hydrate + init store เสร็จ) */
    reportReady: () => void;
}

const NavigationContext = createContext<NavigationContextProps | undefined>(undefined);

const MIN_CLOSED_MS = 300;        // 🛡️ ปิดสนิทอย่างน้อยเท่านี้เสมอ กันความรู้สึกกระตุกตอนเปิดไวเกิน
const READY_FALLBACK_MS = 1200;   // 🛡️ safety net รอบที่ 2: หลัง "ถึงหน้าปลายทางแล้ว" ถ้าไม่ reportReady() ภายในนี้ เปิดประตูให้เอง กันจอมืดค้าง
const NAV_HARD_TIMEOUT_MS = 8000; // 🛡️ safety net รอบที่ 1 (สุดท้ายจริงๆ): เผื่อ router.push()/server ล่มหรือช้าผิดปกติ ไม่งั้นจอมืดค้างถาวรไม่มีวันเปิด

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [state, setState] = useState<SenkaimonState>("idle");

    // 🛡️ เก็บ "ตัวปลดล็อกความพร้อม" ของรอบปัจจุบันไว้ใน ref เรียกจาก reportReady() ได้ตรงๆ
    // โดยไม่ต้องผ่าน state/dependency array ที่อาจทำให้ closure ค้าง
    const readyResolverRef = useRef<(() => void) | null>(null);

    // 🎯 เก็บ path ปลายทางของรอบ navigate ปัจจุบัน ใช้เช็คว่า "ถึงหน้าใหม่จริงหรือยัง"
    // ก่อนจะเริ่มนับเวลารอความพร้อม (แก้บั๊ก: เดิมนับ READY_FALLBACK_MS ทันทีที่ปิดประตู
    // โดยไม่รู้ว่า router.push() ยังรอ server อยู่ — สำหรับ /daily ที่ต้อง await ข้อมูลจาก
    // server ก่อน render ถ้าช้ากว่า fallback timer ประตูจะเปิดก่อนหน้าปลายทาง mount จริงด้วยซ้ำ)
    const targetPathRef = useRef<string | null>(null);

    // 🚀 PREFETCH: โหลด JS chunk + RSC payload ของทั้งสองมิติล่วงหน้าตั้งแต่แอปเริ่มทำงาน
    // แก้ปัญหาสำคัญ: ปุ่มใน ModeSelectorModal เป็น <button onClick={navigate(...)}> ธรรมดา
    // ไม่ใช่ <Link href="..."> ของ Next.js ทำให้ไม่มี auto-prefetch ตอน scroll เข้า viewport
    // เกิดขึ้นเลย — ทำให้ครั้งแรกที่ผู้เล่นสลับไปมิติที่ยังไม่เคยโหลด (โดยเฉพาะ /daily ที่ import
    // เยอะกว่า: GuessTable, character utils, zustand store ฯลฯ) เบราว์เซอร์ต้องดาวน์โหลด/parse
    // chunk แบบ cold ระหว่างกลาง ทำให้ component mount ช้ากว่าที่ server ตอบจริง (server เร็ว
    // อยู่แล้ว แต่ client bundle ยังโหลดไม่เสร็จ) — ส่วน /unlimited ทันเพราะมักเป็น route แรกที่
    // ผู้เล่นเปิดเว็บมาเจอ chunk เลยถูกโหลดไปตั้งแต่ต้นโดยธรรมชาติอยู่แล้ว ไม่สมมาตรกับ /daily
    useEffect(() => {
        router.prefetch("/daily");
        router.prefetch("/unlimited");
    }, [router]);

    const navigate = async (href: string) => {
        let targetPath = href;

        // 🎯 ระบบสลับมิติรักษาตำแหน่งย่อย (Dimension Hot-Swap)
        if (href === "daily" || href === "unlimited") {
            if (pathname.startsWith("/daily") || pathname.startsWith("/unlimited")) {
                targetPath = pathname.replace(/^\/(daily|unlimited)/, `/${href}`);
            } else {
                targetPath = `/${href}`;
            }
        } else if (!href.startsWith("/")) {
            targetPath = `/${href}`;
        }

        // 🛡️ ป้องกันการกดซ้ำหน้าเดิม หรือประตูกำลังทำงานอยู่
        if (state !== "idle" || pathname === targetPath) return;

        // 🎯 จดจำเป้าหมายไว้ก่อนเริ่มปิดประตู ให้ effect ด้านล่างรู้ว่าต้องรอ pathname ไหน
        targetPathRef.current = targetPath;

        // 🔥 PHASE 1: ปิดประตูเซนไกมงลงมาบังหน้าจอ (ใช้เวลาอนิเมชัน 300ms)
        setState("closing");
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 🔥 PHASE 2: ล็อกมิติมืดสนิท 100% แล้วสั่ง Next.js เปลี่ยนหน้าเบื้องหลังประตู
        // 🛡️ หมายเหตุ: router.push() ของ Next App Router เป็น navigation แบบ blocking —
        // pathname (usePathname) จะไม่ขยับจนกว่า Server Component ต้นทาง (รวมถึง data fetching
        // ฝั่ง server เช่นการสุ่ม/คำนวณ target ของ daily) จะ resolve ครบเสียก่อน
        setState("closed");
        router.push(targetPath);
    };

    // 🔄 PHASE 3: pathname เปลี่ยนจริง (หน้าใหม่ mount แล้ว) — "ยังไม่เปิดประตูทันที"
    // รอ 2 เงื่อนไขพร้อมกัน:
    //   (1) ปิดสนิทมาแล้วอย่างน้อย MIN_CLOSED_MS
    //   (2) หน้าปลายทาง reportReady() ว่าพร้อมแสดงผลจริง หรือหมดเวลา fallback
    // แก้ปัญหา: เดิมเปิดตาม pathname เฉยๆ โดยไม่รู้ว่าหน้าปลายทาง (เช่น DailyCharacterWrapper ที่ต้อง
    // รอ zustand rehydrate + initializeGame ก่อนถึงจะ isReady) พร้อมจริงหรือยัง ทำให้ประตูเปิดเร็วเกินไป
    useEffect(() => {
        if (state !== "closed") return;

        // 🚦 PHASE 3a — GATE: ยังไปไม่ถึงหน้าปลายทาง (pathname ยังไม่ตรงกับที่ navigate() สั่งไว้)
        // แปลว่า router.push() ยังรอ Next.js เคลียร์ฝั่ง server อยู่ (เช่น /daily ที่ต้องคำนวณ
        // target ของวันนี้ก่อน) — ห้ามเริ่มนับ MIN_CLOSED_MS/READY_FALLBACK_MS เด็ดขาดตอนนี้
        // เพราะมันจะเป็นการนับเวลาแข่งกับ server โดยไม่รู้ว่า server ช้าแค่ไหน ซึ่งคือสาเหตุ
        // ของบั๊กเดิม: ประตูเปิดก่อนหน้าปลายทางจะ mount ด้วยซ้ำ ก็แค่รอเฉยๆ จอมืดสนิทไปก่อน
        // มี hard timeout ยาวๆ ไว้เป็น safety net สุดท้ายจริงๆ เผื่อ navigation ล่ม/ค้างถาวร
        if (pathname !== targetPathRef.current) {
            const hardTimeout = setTimeout(() => {
                setState("opening"); // 🆘 นานผิดปกติ (>8s) ต้องมีอะไรพังแน่ๆ เปิดประตูให้เอง ดีกว่าจอมืดค้างตลอดไป
            }, NAV_HARD_TIMEOUT_MS);

            return () => clearTimeout(hardTimeout);
        }

        // 🚦 PHASE 3b — ถึงหน้าปลายทางแล้วจริง (component ใหม่กำลัง/ได้ mount แล้ว)
        // จากตรงนี้ค่อยเริ่มนับ 2 เงื่อนไขพร้อมกันตามเดิม: MIN_CLOSED_MS + reportReady()/fallback
        let minDelayDone = false;
        let readySignaled = false;
        let opened = false;

        const tryOpen = () => {
            if (opened || !minDelayDone || !readySignaled) return;
            opened = true;
            setState("opening");
        };

        const minTimer = setTimeout(() => {
            minDelayDone = true;
            tryOpen();
        }, MIN_CLOSED_MS);

        const fallbackTimer = setTimeout(() => {
            readySignaled = true; // ⏱️ ถึงหน้าแล้วแต่ component ไม่ยอม reportReady() ภายในนี้ — เปิดให้เองกันจอมืดค้าง
            tryOpen();
        }, READY_FALLBACK_MS);

        readyResolverRef.current = () => {
            readySignaled = true;
            tryOpen();
        };

        return () => {
            clearTimeout(minTimer);
            clearTimeout(fallbackTimer);
            readyResolverRef.current = null;
        };
    }, [state, pathname]); // 🔔 รีรันทุกครั้งที่ pathname ขยับ (รวมถึงตอนมาถึงปลายทางจริง) หรือเข้าสถานะ closed ใหม่

    const reportReady = useCallback(() => {
        readyResolverRef.current?.();
    }, []);

    // 🔄 PHASE 4: เมื่อสถานะเป็น opening ให้จับเวลารอแอนิเมชันกางเสร็จ แล้วรีเซ็ตกลับเป็น idle
    useEffect(() => {
        if (state === "opening") {
            const timer = setTimeout(() => {
                setState("idle"); // ประตูเปิดสุดแล้ว กลับสู่สถานะว่างพร้อมรับคำสั่งใหม่
            }, 800);

            return () => clearTimeout(timer);
        }
    }, [state]);

    return (
        <NavigationContext.Provider value={{ state, navigate, reportReady }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useSenkaimon() {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error("useSenkaimon must be used within a NavigationProvider");
    }
    return context;
}