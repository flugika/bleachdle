// src/shared/ui/pairing/LastActiveIndicator.tsx
'use client';

import { useEffect, useState } from 'react';

export function LastActiveIndicator({ lastSeenAt }: { lastSeenAt: string }) {
    // 🟢 เก็บ nowไว้ใน state โดยตั้งค่าเริ่มต้นจาก Effect เพื่อให้ Pure ในช่วง initial render
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 30_000); // update ทุก 30 วิ
        return () => clearInterval(timer);
    }, []);

    // SSR / Initial Client Frame Fallback (ป้องกัน Hydration Mismatch)
    if (now === null) {
        return (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[#8a8078]">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#5a5448]" />
                ---
            </span>
        );
    }

    const diffMs = Math.max(0, now - new Date(lastSeenAt).getTime());
    const minutes = Math.floor(diffMs / 60_000);

    const level: 'live' | 'recent' | 'stale' =
        minutes < 5 ? 'live' : minutes < 60 * 24 ? 'recent' : 'stale';

    const dotClass = {
        live: 'bg-[#4de880] animate-pulse',
        recent: 'bg-[#c8a96e]',
        stale: 'bg-[#5a5448]',
    }[level];

    return (
        <span className="inline-flex items-center gap-1.5 text-[10px] text-[#8a8078]">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
            {level === 'live' ? 'Active now' : `Last active ${formatRelativeTime(diffMs)}`}
        </span>
    );
}

function formatRelativeTime(diffMs: number): string {
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}