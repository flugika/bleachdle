// src/shared/ui/pairing/SyncStatusBanner.tsx
//
// Renders nothing while status is 'ok' (the common case). Once
// SyncEngine flips to 'degraded' (3 consecutive failed requests) or
// 'offline' (fetch itself threw), shows a small fixed banner so the
// player knows their streak isn't being recorded server-side right now —
// previously this failure mode was completely invisible (every sync call
// site was `.catch(() => {})`).
//
// Deliberately non-blocking and dismissible per-session (not persisted) —
// this is a "heads up" notice, not a modal the player has to deal with
// before continuing to play. Local play/streaks are entirely unaffected
// either way; this only concerns the server-side/cross-device copy.
'use client';

import { useState } from 'react';
import { useSyncStatus } from '@/src/shared/hooks/useSyncStatus';

export function SyncStatusBanner() {
    const status = useSyncStatus();
    const [dismissedFor, setDismissedFor] = useState<string | null>(null);

    if (status === 'ok') return null;
    if (dismissedFor === status) return null;

    const message =
        status === 'offline'
            ? "You're offline — streak sync will resume once you're back online. Local play is unaffected."
            : "Having trouble syncing your streak to the server. Local play is unaffected — we'll keep retrying.";

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-4 py-2.5 border border-[#c85050]/40 bg-[#0a0a0c] shadow-[0_8px_30px_rgba(0,0,0,0.6)] max-w-md">
            <span className="w-2 h-2 rounded-full bg-[#c85050] shrink-0 animate-pulse" />
            <p className="text-[11px] text-[#c8a96e] leading-snug">{message}</p>
            <button
                onClick={() => setDismissedFor(status)}
                className="text-[#5a5448] hover:text-[#c8a96e] text-[10px] font-bold uppercase shrink-0"
            >
                Dismiss
            </button>
        </div>
    );
}