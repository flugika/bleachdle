// src/shared/ui/providers/DeviceSyncProvider.tsx
//
// 🆕 now also renders the Turnstile widget container required by
// useDeviceBootstrap's two-phase flow — invisible/inert until a genuinely
// new device actually needs to solve a challenge (existing devices never
// trigger it at all, see useDeviceBootstrap.ts).
'use client';

import { useDeviceBootstrap } from '@/src/shared/hooks/useDeviceBootstrap';
import { SyncStatusBanner } from '@/src/shared/ui/pairing/SyncStatusBanner';

export function DeviceSyncProvider({ children }: { children: React.ReactNode }) {
    const { turnstileContainerRef } = useDeviceBootstrap();

    return (
        <>
            <div ref={turnstileContainerRef} />
            {children}
            <SyncStatusBanner />
        </>
    );
}