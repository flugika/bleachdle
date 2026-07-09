// src/shared/ui/SongAudioPlayer.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import { BleachSong } from '@/src/entities/song/schema';
import { getRevealMsForAttempt, formatRevealMs } from '@/src/features/song/constants';
import { STORAGE_KEYS } from '@/src/const/localStorage';

const DEFAULT_VOLUME = 0.5;

function readStoredVolume(): number {
    if (typeof window === 'undefined') return DEFAULT_VOLUME;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (!raw) return DEFAULT_VOLUME;

        const configObj = JSON.parse(raw);
        // ดึงฟิลด์ song_volume ออกมา (ถ้าไม่มีให้เป็น NaN เพื่อใช้ค่า Default)
        const parsed = configObj.song_volume !== undefined ? Number(configObj.song_volume) : NaN;

        if (Number.isNaN(parsed)) return DEFAULT_VOLUME;
        return Math.min(1, Math.max(0, parsed));
    } catch {
        return DEFAULT_VOLUME;
    }
}

function updateStoredVolume(nextVolume: number) {
    if (typeof window === 'undefined') return;
    try {
        const savedConfig = window.localStorage.getItem(STORAGE_KEYS.CONFIG);
        const configObj = savedConfig ? JSON.parse(savedConfig) : {};
        
        configObj.song_volume = nextVolume; // เพิ่ม/อัปเดตฟิลด์ระดับเสียงเสียง
        
        window.localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(configObj));
    } catch (error) {
        console.error('Failed to save song volume to localStorage:', error);
    }
}

interface SongAudioPlayerProps {
    target: BleachSong | null;
    attemptIndex: number;
    disabled?: boolean;
}

export function SongAudioPlayer({ target, attemptIndex, disabled = false }: SongAudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);

    const [volume, setVolume] = useState<number>(() => readStoredVolume());
    const previousVolumeRef = useRef<number>(volume > 0 ? volume : DEFAULT_VOLUME);
    const isMuted = volume === 0;

    const revealMs = getRevealMsForAttempt(attemptIndex);
    const startSec = (target?.segments?.[0]?.start_time_ms ?? 0) / 1000;

    useEffect(() => {
        setIsPlaying(false);
        setHasError(false);
        audioRef.current?.pause();
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    }, [target?.id]);

    useEffect(() => () => {
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume, target?.audio_url]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = Number(e.target.value) / 100;
        setVolume(next);
        if (next > 0) previousVolumeRef.current = next;
        updateStoredVolume(next);
    };

    const handleToggleMute = () => {
        if (isMuted) {
            const restored = previousVolumeRef.current || DEFAULT_VOLUME;
            setVolume(restored);
            updateStoredVolume(restored);
        } else {
            previousVolumeRef.current = volume;
            setVolume(0);
            updateStoredVolume(0);
        }
    };

    const handlePlay = () => {
        if (!target || disabled) return;
        const audio = audioRef.current;
        if (!audio) return;

        if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current);
        }

        audio.currentTime = startSec;

        const playPromise = audio.play();
        if (playPromise) {
            playPromise
                .then(() => setIsPlaying(true))
                .catch(() => {
                    setHasError(true);
                    setIsPlaying(false);
                });
        }

        stopTimerRef.current = setTimeout(() => {
            audio.pause();
            setIsPlaying(false);
        }, revealMs);
    };

    return (
        <div id="song-audio-player" className="flex flex-col items-center gap-3.5 w-full max-w-sm mx-auto pt-4">
            {target?.audio_url && (
                <audio
                    ref={audioRef}
                    src={target.audio_url}
                    preload="none"
                    onError={() => setHasError(true)}
                />
            )}

            {/* 🎧 CONTROL ROW LAYER — รวมปุ่มเล่นและแถบเสียงไว้ในแถวเดียวกันแบบโมเดิร์น */}
            <div className="flex items-center gap-5 bg-[#0d0d12]/50 border border-[#c8a96e]/15 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.5)] backdrop-blur-sm">

                {/* ปุ่ม Play (คง Logic การสแปมรัวๆ และ EQ Animation ไว้ทั้งหมด) */}
                <button
                    onClick={handlePlay}
                    disabled={disabled || !target}
                    className={[
                        'relative w-16 h-16 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 select-none',
                        isPlaying
                            ? 'border-[#c8a96e] bg-[#c8a96e]/10 shadow-[0_0_27px_rgba(200,169,110,0.35)]'
                            : 'border-[#c8a96e]/40 bg-[#0a0a0f]/80 hover:border-[#c8a96e] hover:shadow-[0_0_20px_rgba(200,169,110,0.25)]',
                        (disabled || !target) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                    aria-label={isPlaying ? 'Playing melodic reiatsu clip' : 'Play melodic reiatsu clip'}
                >
                    {isPlaying ? (
                        <span className="flex gap-1 items-end h-5">
                            <span className="w-0.5 bg-[#c8a96e]" style={{ height: '60%', animation: 'song-eq 0.6s ease-in-out infinite' }} />
                            <span className="w-0.5 bg-[#c8a96e]" style={{ height: '100%', animation: 'song-eq 0.6s ease-in-out infinite 0.15s' }} />
                            <span className="w-0.5 bg-[#c8a96e]" style={{ height: '45%', animation: 'song-eq 0.6s ease-in-out infinite 0.3s' }} />
                        </span>
                    ) : (
                        <svg className="w-6 h-6 text-[#c8a96e] ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                <div className='flex flex-col'>
                    {/* แถบปรับเสียง (Volume Controller) ขยับมาประกบด้านขวาอย่างลงตัว */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                            onClick={handleToggleMute}
                            className="shrink-0 text-[#c8a96e]/60 hover:text-[#c8a96e] transition-colors duration-200 cursor-pointer"
                            aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="m23 9-6 6M17 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : volume < 0.5 ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M15.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>

                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round(volume * 100)}
                            onChange={handleVolumeChange}
                            className="w-full h-1 accent-[#c8a96e] bg-[#777796]/20 rounded-lg appearance-none cursor-pointer"
                            aria-label="Volume"
                        />

                        <span className="shrink-0 w-6 text-right text-[12px] font-mono text-[#777796] tabular-nums">
                            {Math.round(volume * 100)}%
                        </span>
                    </div>

                    {/* 📊 INFO LAYER — แสดงจำนวนครั้งในการเดา ความยาวคลิป และ Error ดึงลงมาตรงกลางด้านล่างเพื่อให้แถวบนดูคลีน */}
                    <div className="flex flex-col items-center gap-0.5 mt-1">
                        <span className="text-sm font-bold text-[#c8a96e] font-mono">
                            {formatRevealMs(revealMs)}
                        </span>
                        {hasError && (
                            <span className="text-[11px] uppercase tracking-[0.2em] text-[#e83030] font-mono mt-1.5 animate-pulse">
                                Reiatsu signal lost — tap again to retry
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}