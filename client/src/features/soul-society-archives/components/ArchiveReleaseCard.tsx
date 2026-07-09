// src/features/soul-society-archives/components/ArchiveReleaseCard.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ArchiveReleaseCardProps {
    triggerPhrase: string;
    techniqueName: string;
    techniqueTranslation?: string | null;
    audioUrl?: string | null;
}

const T = {
    gold: '#c8a96e',
    value: '#e8ddd0',
    muted: '#8a8078',
    mutedMid: '#5a5448',
};

function formatClockTime(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function ArchiveReleaseCard({ triggerPhrase, techniqueName, techniqueTranslation, audioUrl }: ArchiveReleaseCardProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const handleLoadedMetadata = useCallback(() => {
        const d = audioRef.current?.duration;
        if (d && Number.isFinite(d)) setDuration(d);
        setIsReady(true);
    }, []);

    const handleTimeUpdate = useCallback(() => {
        setCurrentTime(audioRef.current?.currentTime ?? 0);
    }, []);

    const handleEnded = useCallback(() => setIsPlaying(false), []);

    useEffect(() => {
        setIsPlaying(false);
        setIsReady(false);
        setCurrentTime(0);
        setDuration(0);
        audioRef.current?.pause();
    }, [audioUrl]);

    const handleToggle = () => {
        const audio = audioRef.current;
        if (!audio || !isReady) return;
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = Number(e.target.value);
        if (audioRef.current) audioRef.current.currentTime = next;
        setCurrentTime(next);
    };

    const seekPct = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

    return (
        <div className="relative w-full max-w-sm mx-auto p-5 bg-[#0d0d12]/60 border border-[#c8a96e]/15 shadow-[0_10px_34px_rgba(0,0,0,0.5)]">
            <span className="absolute -top-px -left-px w-3 h-3 border-t border-l border-[#c8a96e]/50" />
            <span className="absolute -top-px -right-px w-3 h-3 border-t border-r border-[#c8a96e]/50" />
            <span className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-[#c8a96e]/50" />
            <span className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-[#c8a96e]/50" />

            <p className="text-[10px] uppercase tracking-[0.3em] mb-1" style={{ color: T.mutedMid }}>
                {triggerPhrase}
            </p>
            <p className="text-xl font-black mb-1" style={{ color: T.gold }}>
                {techniqueName}
            </p>
            {techniqueTranslation && (
                <p className="text-sm italic mb-4" style={{ color: T.muted }}>
                    &ldquo;{techniqueTranslation}&rdquo;
                </p>
            )}

            {audioUrl ? (
                <div className="flex items-center gap-3 mt-2">
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        preload="auto"
                        onLoadedMetadata={handleLoadedMetadata}
                        onCanPlay={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleEnded}
                    />
                    <button
                        onClick={handleToggle}
                        disabled={!isReady}
                        className={[
                            'relative shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                            isPlaying
                                ? 'border-white bg-[#c8a96e]/20 shadow-[0_0_20px_rgba(200,169,110,0.5)]'
                                : 'border-[#c8a96e]/40 bg-[#0a0a0f]/80 hover:border-white hover:scale-105',
                            !isReady ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? (
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="5" width="4" height="14" rx="1" />
                                <rect x="14" y="5" width="4" height="14" rx="1" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 ml-0.5 text-[#c8a96e]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        )}
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                        <input
                            type="range"
                            min={0}
                            max={duration || 0}
                            step={0.1}
                            value={currentTime}
                            onChange={handleSeek}
                            disabled={!isReady}
                            className="reiatsu-slider w-full h-1 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                            style={{ background: `linear-gradient(to right, #c8a96e ${seekPct}%, rgba(119,119,150,0.15) ${seekPct}%)` }}
                            aria-label="Seek"
                        />
                        <span className="text-[10px] font-mono tracking-tighter text-right" style={{ color: T.muted }}>
                            {formatClockTime(currentTime)} / {formatClockTime(duration)}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] mt-2" style={{ color: T.muted }}>
                    No audio on file
                </p>
            )}
        </div>
    );
}