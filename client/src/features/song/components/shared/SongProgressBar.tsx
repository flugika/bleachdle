// src/features/song/components/shared/SongProgressBar.tsx
'use client';

import { SONG_REVEAL_STAGES_MS } from '@/src/features/song/constants';
import { useCallback, useRef, useState } from 'react';

interface SongProgressBarProps {
    currentTimeMs: number;
    revealMs: number;
    durationMs?: number;
    isPlaying?: boolean;
    showStageMarks?: boolean;
    showTimeLabels?: boolean;
    /** 🆕 เปิดให้ลากแถบเพื่อ seek ได้ (ใช้เฉพาะโหมด full) */
    seekable?: boolean;
    /** 🆕 เรียกกลับพร้อมตำแหน่ง ms ที่ผู้ใช้ต้องการ seek ไป */
    onSeek?: (ms: number) => void;
}

export const SongProgressBar = ({
    currentTimeMs,
    revealMs,
    durationMs = 10000,
    isPlaying = false,
    showStageMarks = true,
    showTimeLabels = true,
    seekable = false,
    onSeek,
}: SongProgressBarProps) => {
    const safeCurrent = Math.min(currentTimeMs, durationMs);
    const safeReveal = Math.min(revealMs, durationMs);

    const currentPercent = (safeCurrent / durationMs) * 100;
    const revealPercent = (safeReveal / durationMs) * 100;

    const barRef = useRef<HTMLDivElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hoverPercent, setHoverPercent] = useState<number | null>(null);

    const percentFromClientX = useCallback((clientX: number) => {
        const el = barRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const pct = ((clientX - rect.left) / rect.width) * 100;
        return Math.min(100, Math.max(0, pct));
    }, []);

    const commitSeek = useCallback((clientX: number) => {
        if (!seekable || !onSeek) return;
        const pct = percentFromClientX(clientX);
        onSeek((pct / 100) * durationMs);
    }, [seekable, onSeek, percentFromClientX, durationMs]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!seekable) return;
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        commitSeek(e.clientX);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!seekable) return;
        if (isDragging) commitSeek(e.clientX);
        setHoverPercent(percentFromClientX(e.clientX));
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!seekable) return;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const handlePointerLeave = () => {
        if (!isDragging) setHoverPercent(null);
    };

    return (
        <div className="w-full flex flex-col gap-2 select-none font-[family-name:var(--font-body)]">
            <div
                ref={barRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                className={[
                    "relative w-full h-3 bg-gradient-to-b from-[#030304] to-[#08080c] border border-[#c8a96e]/20 rounded-sm overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),inset_0_-1px_2px_rgba(200,169,110,0.05)]",
                    seekable ? "cursor-pointer" : "",
                ].join(' ')}
            >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Layer 1 stays only meaningful in preview mode; in full mode revealPercent will be ~100% anyway */}
                <div
                    className="absolute top-0 left-0 h-full bg-[#c8a96e]/15 border-r-2 border-[#c8a96e]/50"
                    style={{ width: `${revealPercent}%` }}
                >
                    <div className="absolute inset-0 bg-[#c8a96e]/10 animate-[reveal-window-pulse_2.4s_ease-in-out_infinite]" />
                </div>

                <div
                    className={[
                        'absolute top-0 left-0 h-full bg-gradient-to-r from-[#8a6d3a] via-[#c8a96e] to-[#f5ebd5]',
                        isPlaying ? 'shadow-[0_0_16px_rgba(200,169,110,0.9)]' : 'shadow-[0_0_8px_rgba(200,169,110,0.4)]',
                    ].join(' ')}
                    style={{ width: `${currentPercent}%` }}
                />

                {isPlaying && (
                    <div
                        className="absolute inset-0 pointer-events-none overflow-hidden"
                        style={{
                            clipPath: `inset(0 ${100 - currentPercent}% 0 0)`,
                            '--reveal-percent': `${revealPercent}%`,
                        } as React.CSSProperties & Record<'--reveal-percent', string>}
                    >
                        <div className="absolute top-0 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent w-[100px] animate-[song-shimmer_1.3s_linear_infinite]" />
                    </div>
                )}

                {/* 🆕 draggable knob — only in seekable mode, always visible so users know it's a scrubber */}
                {seekable && (
                    <div
                        className="absolute w-3 h-3 rounded-full bg-white border border-[#c8a96e] shadow-[0_0_8px_2px_rgba(255,255,255,0.6)] transition-transform"
                        style={{
                            left: `calc(${currentPercent}% - 6px)`,
                            top: '50%',
                            transform: `translateY(-50%) scale(${isDragging ? 1.3 : 1})`,
                        }}
                    />
                )}
                {!seekable && isPlaying && currentPercent > 0 && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.8)]"
                        style={{ left: `calc(${currentPercent}% - 3px)` }}
                    />
                )}

                {/* 🆕 hover preview tick while scrubbing */}
                {seekable && hoverPercent !== null && (
                    <div
                        className="absolute top-0 bottom-0 w-px bg-white/50 pointer-events-none"
                        style={{ left: `${hoverPercent}%` }}
                    />
                )}

                {showStageMarks && SONG_REVEAL_STAGES_MS.map((stageMs) => {
                    if (stageMs >= durationMs) return null;
                    const leftPercent = (stageMs / durationMs) * 100;
                    const isPassed = stageMs <= safeReveal;
                    return (
                        <div
                            key={`divider-${stageMs}`}
                            className={[
                                'absolute top-0 bottom-0 z-10 transition-colors duration-300',
                                isPassed
                                    ? 'w-[2px] bg-[#f5ebd5]/70 shadow-[0_0_6px_rgba(245,235,213,0.6)]'
                                    : 'w-px bg-[#5a2626]/50',
                            ].join(' ')}
                            style={{ left: `${leftPercent}%` }}
                        />
                    );
                })}
            </div>

            {showTimeLabels && (
                <div className="flex justify-between items-center text-[11px] font-mono font-bold tracking-widest text-[#e2c992]">
                    <span>{formatMsToTime(safeCurrent)}</span>
                    <span>{formatMsToTime(durationMs)}</span>
                </div>
            )}
        </div>
    );
};

function formatMsToTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${millis}`;
}