// src/lib/auth/useDeviceBootstrap.ts
//
// v3 flow:
//   1. POST /api/device/init with no token.
//      - Returning visitor (valid cookie) → 200 'existing', done, no
//        Turnstile widget ever touched.
//      - New device → 400 'turnstile_required'.
//   2. Only on 'turnstile_required': get a Turnstile token (reusing the
//      project's existing useTurnstile hook — same one the daily wrappers
//      already use) and retry the POST with it.
//   3. Once identity is confirmed either way, run syncStateOnLoad — this
//      is what makes cross-device state (stats + completed pool) actually
//      catch up on page load/F5, not just after a pairing confirm.
'use client';

import { useEffect, useRef, useState } from 'react';
import { SyncEngine } from '@/src/lib/sync/syncEngine';
import { syncStateOnLoadAndReloadIfChanged } from '@/src/lib/sync/syncStateOnLoad';
import { useTurnstile } from '@/src/shared/hooks/useTurnstile';

type BootstrapStatus = 'idle' | 'checking' | 'verifying' | 'ready' | 'error';

async function callDeviceInit(turnstileToken?: string): Promise<Response> {
    return fetch('/api/device/init', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnstileToken ? { turnstileToken } : {}),
    });
}

export function useDeviceBootstrap(): { status: BootstrapStatus; turnstileContainerRef: React.RefObject<HTMLDivElement | null> } {
    const [status, setStatus] = useState<BootstrapStatus>('idle');
    const startedRef = useRef(false);
    const { getToken, containerRef } = useTurnstile();

    useEffect(() => {
        if (startedRef.current) return; // StrictMode double-invoke guard
        startedRef.current = true;

        let cancelled = false;

        (async () => {
            setStatus('checking');

            // 🛠️ FIX: เปิดใช้งาน SyncEngine ตั้งแต่ต้นทาง เพื่อเตรียมรับ Cookie และป้องกัน 401 จาก Request ย่อยที่ยิงพร้อมกัน
            SyncEngine.getInstance().enable();

            try {
                const firstRes = await callDeviceInit();
                if (cancelled) return;

                if (firstRes.ok) {
                    setStatus('ready');
                    syncStateOnLoadAndReloadIfChanged().catch(() => { });
                    return;
                }

                const firstData = await firstRes.json().catch(() => null);
                if (firstData?.error !== 'turnstile_required') {
                    console.error('[useDeviceBootstrap] init failed:', firstRes.status, firstData);
                    SyncEngine.getInstance().disable();
                    setStatus('error');
                    return;
                }

                // 🆕 genuinely new device — solve the challenge, then retry
                setStatus('verifying');
                let token: string | undefined;
                try {
                    token = await getToken();
                } catch (err) {
                    console.error('[useDeviceBootstrap] turnstile getToken failed:', err);
                }

                if (cancelled) return;

                if (!token) {
                    SyncEngine.getInstance().disable();
                    setStatus('error');
                    return;
                }

                const secondRes = await callDeviceInit(token);
                if (cancelled) return;

                if (!secondRes.ok) {
                    console.error('[useDeviceBootstrap] init retry failed:', secondRes.status);
                    SyncEngine.getInstance().disable();
                    setStatus('error');
                    return;
                }

                setStatus('ready');
                syncStateOnLoadAndReloadIfChanged().catch(() => { });
            } catch (err) {
                if (cancelled) return;
                console.error('[useDeviceBootstrap] network error:', err);
                SyncEngine.getInstance().disable();
                setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [getToken]);

    return { status, turnstileContainerRef: containerRef };
}