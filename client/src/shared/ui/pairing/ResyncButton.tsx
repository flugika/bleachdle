// src/shared/ui/pairing/ResyncButton.tsx
'use client';

import { useState } from 'react';
import { useManualResync } from '@/src/shared/hooks/useManualResync';
import type { GameMode, GameType } from '@/src/lib/sync/syncEngine';

interface ResyncButtonProps {
    gameMode: GameMode;
    gameType: GameType;
    applyRemoteProgress: (remoteTargetId: string, remoteGuesses: unknown[]) => void;
}

const STATUS_COPY: Record<ReturnType<typeof useManualResync>['status'], { label: string; sub: string }> = {
    idle: { label: 'Sync From Other Device', sub: 'Pull reiatsu record from a linked terminal' },
    loading: { label: 'Tuning Frequency…', sub: 'Reaching linked terminal' },
    success: { label: 'Resonance Confirmed', sub: 'Record synchronized' },
    empty: { label: 'No Signal Found', sub: 'No record awaiting sync' },
    error: { label: 'Signal Lost', sub: 'Tap to retune' },
};

export function ResyncButton({ gameMode, gameType, applyRemoteProgress }: ResyncButtonProps) {
    const { resync, status } = useManualResync(gameMode, gameType, applyRemoteProgress);
    const [confirming, setConfirming] = useState(false);
    const copy = STATUS_COPY[status];

    const handleClick = () => {
        if (!confirming) {
            setConfirming(true);
            return;
        }
        setConfirming(false);
        resync();
    };

    return (
        <div className="relative mb-4 max-w-lg mx-auto cursor-pointer select-none">
            {/* corner brackets — ลายเดียวกับกรอบหัวข้อ BLEACHDLE */}
            <span className="absolute -top-px -left-px w-3 h-3 border-t border-l border-[#c8a96e]/40" />
            <span className="absolute -top-px -right-px w-3 h-3 border-t border-r border-[#c8a96e]/40" />
            <span className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-[#c8a96e]/40" />
            <span className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-[#c8a96e]/40" />

            <button
                onClick={handleClick}
                disabled={status === 'loading'}
                className={`group w-full flex items-center justify-between gap-4 px-5 py-3.5
                    bg-gradient-to-r from-[#c8a96e]/[0.03] via-[#c8a96e]/[0.06] to-[#c8a96e]/[0.03]
                    border border-[#c8a96e]/20 hover:border-[#c8a96e]/40
                    transition-all duration-300
                    ${status === 'loading' ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                >
                <div className="flex items-center gap-3">
                    {/* ไอคอนคลื่นสัญญาณ — หมุนตอน loading */}
                    <svg
                        viewBox="0 0 24 24"
                        className={`w-4 h-4 text-[#c8a96e] transition-transform duration-700 ${status === 'loading' ? 'animate-spin' : 'group-hover:rotate-180'
                            }`}
                        fill="none"
                    >
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                        <path d="M12 5.5a6.5 6.5 0 016.5 6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                        <path d="M12 2.5a9.5 9.5 0 019.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                        <path d="M12 18.5A6.5 6.5 0 015.5 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                        <path d="M12 21.5A9.5 9.5 0 012.5 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                    </svg>

                    <div className="text-left">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#c8a96e] font-bold">
                            {confirming ? 'Confirm Overwrite?' : copy.label}
                        </div>
                        <div className="text-[9px] uppercase tracking-[0.1em] text-[#8a8078] mt-0.5">
                            {confirming ? 'Current progress will be replaced' : copy.sub}
                        </div>
                    </div>
                </div>

                {confirming ? (
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8a8078] shrink-0">
                        Tap Again
                    </span>
                ) : (
                    <span className="text-[#c8a96e]/60 text-lg shrink-0 leading-none">◆</span>
                )}
            </button>

            {confirming && (
                <button
                    onClick={() => setConfirming(false)}
                    className="mt-1.5 w-full text-center text-[9px] font-medium uppercase tracking-[0.14em] text-[#8a8078] hover:text-[#8a8078] transition-colors"
                >
                    Cancel
                </button>
            )}
        </div>
    );
}