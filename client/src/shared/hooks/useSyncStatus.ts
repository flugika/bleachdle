// src/shared/hooks/useSyncStatus.ts
'use client';

import { useEffect, useState } from 'react';
import { SyncEngine, SyncStatus } from '@/src/lib/sync/syncEngine';

export function useSyncStatus(): SyncStatus {
    const [status, setStatus] = useState<SyncStatus>('ok');

    useEffect(() => {
        return SyncEngine.getInstance().onStatusChange(setStatus);
    }, []);

    return status;
}