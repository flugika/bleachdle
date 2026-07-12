// src/features/song/components/shared/SongAudioPlayer.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { BleachSong } from '@/src/entities/song/schema';
import { getRevealMsForAttempt, formatRevealMs } from '@/src/features/song/constants';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { SongProgressBar } from './SongProgressBar';

const DEFAULT_VOLUME = 0.5;

function readStoredVolume(): number {
    if (typeof window === 'undefined') return DEFAULT_VOLUME;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (!raw) return DEFAULT_VOLUME;

        const configObj = JSON.parse(raw);
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

        configObj.song_volume = nextVolume;

        window.localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(configObj));
    } catch (error) {
        console.error('Failed to save song volume to localStorage:', error);
    }
}

function formatClockTime(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

const REIATSU_PARTICLES = [
    { left: '8%', delay: '0s', duration: '5.5s', size: 3 },
    { left: '22%', delay: '1.2s', duration: '6.2s', size: 2 },
    { left: '48%', delay: '2.1s', duration: '5s', size: 2.5 },
    { left: '67%', delay: '0.6s', duration: '6.8s', size: 2 },
    { left: '83%', delay: '1.8s', duration: '5.8s', size: 3 },
    { left: '92%', delay: '3s', duration: '6s', size: 2 },
];

type AudioStatus = 'idle' | 'loading' | 'ready' | 'error';
type PlaybackMode = 'preview' | 'full';

interface SongAudioPlayerProps {
    target: BleachSong | null;
    attemptIndex?: number;
    disabled?: boolean;
    /**
     * 🆕 'preview' (default) = original gameplay behaviour: short clip from the
     * segment start, auto-stopped after the attempt's reveal window.
     * 'full' = complete, uncut answer playback with a real seek bar — used on
     * the archive/answer page.
     */
    mode?: PlaybackMode;
    /** 🆕 shown as fallback / companion links in 'full' mode only */
    spotifyUrl?: string | null;
    youtubeUrl?: string | null;
    /**
     * 🆕 Track title / artist — only ever rendered when mode === 'full'.
     * Deliberately ignored in 'preview' mode so this component stays safe to
     * reuse as-is inside the actual guessing gameplay (title must stay hidden
     * there); this is an answer-page-only reveal.
     */
    title?: string | null;
    artist?: string | null;
}

export function SongAudioPlayer({
    target,
    attemptIndex = 0,
    disabled = false,
    mode = 'preview',
    spotifyUrl,
    youtubeUrl,
    title,
    artist,
}: SongAudioPlayerProps) {
    const isFull = mode === 'full';

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [status, setStatus] = useState<AudioStatus>('idle');
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const [volume, setVolume] = useState<number>(() => readStoredVolume());
    const previousVolumeRef = useRef<number>(volume > 0 ? volume : DEFAULT_VOLUME);
    const isMuted = volume === 0;

    // 🆕 ms ที่เล่นไปแล้วนับจาก startSec ของ preview clip (แยกจาก `currentTime` ซึ่งเป็นวินาทีดิบ
    // ของทั้งไฟล์ที่ใช้ในโหมด full เท่านั้น) — ใช้ rAF poll แทน onTimeUpdate เพราะ onTimeUpdate
    // ยิงถี่ไม่พอ (~4/sec) ทำให้หลอด progress สะดุด ไม่ไหลลื่น
    const [previewElapsedMs, setPreviewElapsedMs] = useState(0);
    const rafIdRef = useRef<number | null>(null);
    const pendingSeekHandlerRef = useRef<(() => void) | null>(null);

    const revealMs = getRevealMsForAttempt(attemptIndex);
    const startSec = (target?.segments?.[0]?.start_time_ms ?? 0) / 1000;

    const isReady = status === 'ready';
    const hasError = status === 'error';
    const isLoading = status === 'loading' || status === 'idle';
    const isButtonDisabled = disabled || !target || !isReady;

    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        audioRef.current?.pause();
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);

        if (target?.audio_url) {
            setStatus('loading');
            audioRef.current?.load();
        } else {
            setStatus('idle');
        }
    }, [target?.id, target?.audio_url]);

    useEffect(() => () => {
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        if (pendingSeekHandlerRef.current && audioRef.current) {
            audioRef.current.removeEventListener('seeked', pendingSeekHandlerRef.current);
        }
    }, []);

    // 🆕 Preview-mode progress ticker: ขณะเล่นคลิปพรีวิว อ่าน audio.currentTime ทุกเฟรมแล้ว
    // แปลงเป็น ms นับจาก startSec ของ segment, clamp ไว้ที่ revealMs (จุดตัด) — ให้หลอดค่อยๆ
    // ไหลไปจนเต็มพอดีกับตอนที่เสียงถูก auto-stop ไม่ใช่หยุดค้างกลางทาง
    useEffect(() => {
        if (isFull || !isPlaying) {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            return;
        }

        const tick = () => {
            const audio = audioRef.current;
            if (audio) {
                const elapsed = Math.max(0, (audio.currentTime - startSec) * 1000);
                setPreviewElapsedMs(Math.min(elapsed, revealMs));
            }
            rafIdRef.current = requestAnimationFrame(tick);
        };

        rafIdRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [isFull, isPlaying, startSec, revealMs]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume, target?.audio_url]);

    const handleCanPlay = useCallback(() => {
        setStatus((prev) => (prev === 'error' ? prev : 'ready'));
    }, []);

    const handleWaiting = useCallback(() => {
        setStatus((prev) => (prev === 'ready' ? 'loading' : prev));
    }, []);

    const handleLoadStart = useCallback(() => {
        setStatus((prev) => (prev === 'ready' ? prev : 'loading'));
    }, []);

    const handleAudioError = useCallback(() => {
        setStatus('error');
        setIsPlaying(false);
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        const d = audioRef.current?.duration;
        if (d && Number.isFinite(d)) setDuration(d);
    }, []);

    const handleTimeUpdate = useCallback(() => {
        if (!isFull) return;
        setCurrentTime(audioRef.current?.currentTime ?? 0);
    }, [isFull]);

    const handleEnded = useCallback(() => {
        setIsPlaying(false);
        setPreviewElapsedMs(0);
        // 🆕 เล่นจบแล้วรีเซ็ตกลับ 0 ทันที (โหมด full) กัน seek bar/เวลาค้างอยู่ที่ท้ายเพลง
        // ให้กด play ซ้ำแล้วเล่นใหม่จากต้นได้เลยโดยไม่ต้องลาก seek เอง
        if (isFull) {
            setCurrentTime(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
        }
    }, [isFull]);

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

    // 🆕 ถ้าอยากได้ seek กลับมาในอนาคต ค่อยผูก handler นี้เข้ากับ SongProgressBar
    // (เช่น onClick คำนวณตำแหน่งจาก event.clientX) — ตอนนี้ลบทิ้งเพราะไม่มี UI ไหนเรียกใช้แล้ว

    const handlePlay = () => {
        if (!target || disabled || !isReady) return;
        const audio = audioRef.current;
        if (!audio) return;

        if (isFull) {
            // 🆕 Full mode: a simple, real play/pause toggle over the whole track.
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
                return;
            }
            const playPromise = audio.play();
            if (playPromise) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                        setStatus('error');
                        setIsPlaying(false);
                    });
            }
            return;
        }

        // 🆕 dle-style: กด Play ซ้ำๆ ต้อง restart จาก 0 ทุกครั้งเสมอ ไม่มี toggle-to-stop
        // ยกเลิก timer/listener ที่ค้างจากคลิกก่อนหน้า (เผื่อผู้ใช้กดรัวๆ ก่อน seek รอบก่อนจะเสร็จ)
        if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current);
            stopTimerRef.current = null;
        }
        if (pendingSeekHandlerRef.current) {
            audio.removeEventListener('seeked', pendingSeekHandlerRef.current);
            pendingSeekHandlerRef.current = null;
        }

        audio.pause();
        setPreviewElapsedMs(0);

        // 🆕 แก้บั๊ก: เดิม set audio.currentTime แล้วเรียก .play() ทันที แต่ seek ของ
        // <audio> เป็น operation แบบ async ภายในเบราว์เซอร์ — ถ้า play() มาก่อน seek
        // เสร็จจริง จะมีเสี้ยววินาทีที่เล่นจากตำแหน่งเดิมก่อนกระโดดมาที่ startSec
        // แก้โดยรอ event 'seeked' ให้ seek เสร็จสมบูรณ์ก่อนค่อยสั่งเล่น
        const beginPlaybackFromStart = () => {
            pendingSeekHandlerRef.current = null;
            const playPromise = audio.play();
            if (playPromise) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                        setStatus('error');
                        setIsPlaying(false);
                    });
            }

            stopTimerRef.current = setTimeout(() => {
                audio.pause();
                setIsPlaying(false);
                setPreviewElapsedMs(0);
            }, revealMs);
        };

        if (Math.abs(audio.currentTime - startSec) < 0.03) {
            // อยู่ที่ตำแหน่งเริ่มต้นอยู่แล้ว ไม่ต้องรอ seek
            beginPlaybackFromStart();
        } else {
            const handleSeeked = () => {
                audio.removeEventListener('seeked', handleSeeked);
                beginPlaybackFromStart();
            };
            pendingSeekHandlerRef.current = handleSeeked;
            audio.addEventListener('seeked', handleSeeked);
            audio.currentTime = startSec;
        }
    };

    const statusLabel = hasError
        ? 'SIGNAL LOST'
        : isPlaying
            ? 'TRANSMITTING'
            : isLoading && target
                ? 'TUNING FREQUENCY'
                : target
                    ? isFull ? 'READY TO PLAY' : 'SONG READY'
                    : 'AWAITING TARGET';

    const hasLinks = Boolean(spotifyUrl || youtubeUrl);

    return (
        <div
            id="song-audio-player"
            className={[
                "relative flex flex-col items-center gap-3.5 w-full pt-4 mx-auto",
                isFull ? "max-w-full" : "max-w-sm" // 🆕 ใช้ max-w-full เพื่อให้ยืดเต็ม ScaleFit ในโหมดกุญแจคำตอบ
            ].join(' ')}
        >
            <style>{`
                @keyframes song-loop-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
            `}</style>

            {/* 霊子 REIATSU PARTICLE FIELD */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {REIATSU_PARTICLES.map((p, i) => (
                    <span
                        key={i}
                        className="reiatsu-particle absolute bottom-0 rounded-full bg-[#c8a96e]"
                        style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.duration }}
                    />
                ))}
            </div>

            {/* 🆕 TRACK IDENTITY */}
            {isFull && (title || artist) && (
                <div className="relative w-full text-center px-2">
                    {title && <p className="text-lg font-black tracking-wide truncate text-[#c8a96e]">{title}</p>}
                    {artist && <p className="text-[11px] uppercase tracking-[0.2em] truncate text-[#8a8078]">{artist}</p>}
                </div>
            )}

            {target?.audio_url && (
                <audio
                    ref={audioRef} src={target.audio_url} preload="auto"
                    onCanPlay={handleCanPlay} onCanPlayThrough={handleCanPlay} onWaiting={handleWaiting}
                    onLoadStart={handleLoadStart} onError={handleAudioError} onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate} onEnded={handleEnded}
                />
            )}

            {/* 🎧 CONTROL ROW LAYER: 🆕 เอา flex-col ออก แล้วใช้การจัดเรียงซ้าย-ขวาแทนเพื่อให้กล่องไม่สูงเกินไป */}
            <div className={`relative flex items-center gap-5 bg-[#0d0d12]/50 border ${isPlaying ? 'border-[#c8a96e]/30' : 'border-[#c8a96e]/15'} p-4 sm:p-5 shadow-[0_10px_34px_rgba(0,0,0,0.5)] backdrop-blur-sm w-full transition-colors duration-500`}>

                <span className="absolute -top-px -left-px w-3 h-3 border-t border-l border-[#c8a96e]/50" />
                <span className="absolute -top-px -right-px w-3 h-3 border-t border-r border-[#c8a96e]/50" />
                <span className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-[#c8a96e]/50" />
                <span className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-[#c8a96e]/50" />

                {/* ปุ่ม Play ด้านซ้าย */}
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                    {isLoading && target && !hasError && <span className="seal-ring-loading absolute inset-[-5px] rounded-full" />}
                    {isReady && !isPlaying && <span className="seal-ring-ready absolute inset-[-3px] rounded-full" />}
                    {isPlaying && (
                        <>
                            <span className="seal-ring-burst absolute inset-0 rounded-full" />
                            <span className="seal-ring-active absolute inset-[-6px] rounded-full" />
                        </>
                    )}

                    <button
                        onClick={handlePlay} disabled={isButtonDisabled}
                        className={[
                            'group relative z-10 w-16 h-16 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 select-none outline-none',
                            isPlaying ? 'border-[#ffffff] bg-[#c8a96e]/20 shadow-[0_0_30px_rgba(200,169,110,0.5)] scale-95'
                                : isButtonDisabled ? 'border-[#c8a96e]/25 bg-[#0a0a0f]/80'
                                    : 'border-[#c8a96e]/40 bg-[#0a0a0f]/80 hover:border-[#ffffff] hover:scale-105 hover:shadow-[0_0_20px_rgba(200,169,110,0.3)] active:scale-95',
                            isButtonDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                        aria-label={isFull ? (isPlaying ? 'Pause' : 'Play') : 'Replay'}
                        title={!isFull ? 'Tap to replay from the start' : undefined}
                    >
                        {isLoading && target && !hasError ? (
                            <svg className="w-5 h-5 animate-spin text-[#c8a96e]/60" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        ) : isFull && isPlaying ? (
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                        ) : isPlaying ? (
                            <svg
                                className="w-6 h-6 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ animation: 'song-loop-spin 2.2s linear infinite' }}
                            >
                                <path d="M20 11A8 8 0 0 0 6.05 6.05L3 9" />
                                <path d="M3 4v5h5" />
                                <path d="M4 13a8 8 0 0 0 13.95 4.95L21 15" />
                                <path d="M16 20v-5h5" />
                            </svg>
                        ) : (
                            <svg className={['w-6 h-6 ml-0.5 transition-colors duration-200', hasError ? 'text-[#c8a96e]/25' : 'text-[#c8a96e] group-hover:text-white'].join(' ')} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>
                </div>

                {/* 🆕 แผงควบคุมด้านขวา (เวลา, Seek bar, Volume) เรียงเป็นชั้นๆ เพื่อความกระชับ */}
                <div className="flex flex-col flex-1 min-w-0 justify-center gap-3">

                    {/* 1. Status & Time */}
                    <div className="flex flex-row justify-between items-center w-full px-1">
                        <span className={['text-[9px] uppercase tracking-[0.25em] font-mono font-bold transition-colors duration-300', hasError ? 'text-[#e83030] animate-pulse' : isPlaying ? 'text-[#c8a96e] animate-[flat-blink_1.5s_infinite]' : 'text-[#777796]/70'].join(' ')}>
                            {statusLabel}
                        </span>
                        <span className={`text-sm font-black font-mono tracking-widest transition-all duration-300 ${isPlaying ? 'text-white drop-shadow-[0_0_8px_rgba(200,169,110,0.6)]' : 'text-[#c8a96e]'}`}>
                            {isFull ? `${formatClockTime(currentTime)} / ${formatClockTime(duration)}` : formatRevealMs(revealMs)}
                        </span>
                    </div>

                    {/* 🆕 เอา seek bar เส้นเปล่าๆ ออก เพราะ SongProgressBar ด้านล่างโชว์
                        duration/progress ซ้ำกันอยู่แล้ว (สวยกว่าด้วย) เหลือแท่งเดียวพอ */}

                    {/* 3. Volume Controller */}
                    <div className="flex items-center gap-2.5 w-full">
                        <button onClick={handleToggleMute} className="shrink-0 text-[#c8a96e]/60 hover:text-[#c8a96e] transition-colors duration-200">
                            {isMuted ? (
                                <svg className="w-4 h-4 text-red-500/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinecap="round" strokeLinejoin="round" /><path d="m23 9-6 6M17 9l6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5 6 9H3v6h3l5 4V5Z" strokeLinecap="round" strokeLinejoin="round" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                        </button>
                        <input
                            type="range" min={0} max={100} value={Math.round(volume * 100)} onChange={handleVolumeChange}
                            className="reiatsu-slider flex-1 h-1 rounded-lg appearance-none cursor-pointer"
                            style={{ background: `linear-gradient(to right, #c8a96e ${Math.round(volume * 100)}%, rgba(119,119,150,0.15) ${Math.round(volume * 100)}%)` }}
                        />
                        <span className="shrink-0 w-8 text-right text-[11px] font-mono text-[#777796] tracking-tighter tabular-nums">{Math.round(volume * 100)}%</span>
                    </div>

                    <SongProgressBar
                        currentTimeMs={isFull ? currentTime * 1000 : previewElapsedMs}
                        revealMs={isFull ? duration * 1000 : revealMs}
                        durationMs={isFull ? duration * 1000 || 10000 : 10000}
                        isPlaying={isPlaying}
                        showStageMarks={!isFull}
                        showTimeLabels={!isFull}
                    />

                </div>
            </div>

            {/* EXTERNAL LINKS */}
            {isFull && hasLinks && (
                <div className="flex items-center gap-2.5 w-full">
                    {spotifyUrl && (
                        <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#c8a96e] border border-[#c8a96e]/30 bg-[#0d0d12]/50 hover:border-[#c8a96e] hover:bg-[#c8a96e]/10 transition-all duration-200">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 14.4c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.3.1-.7-.1-.8-.5-.1-.3.1-.7.5-.8 4-.9 7.5-.5 10.3 1.2.3.2.4.6.2.9zm1.2-2.7c-.2.4-.7.5-1.1.3-2.8-1.7-7.1-2.2-10.4-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.8-1.2 8.5-.6 11.7 1.3.4.2.5.7.3 1.1zm.1-2.8C14.3 8.9 8.9 8.7 5.7 9.7c-.5.2-1-.1-1.2-.6-.2-.5.1-1 .6-1.2 3.7-1.1 9.7-.9 13.5 1.4.5.3.6.9.3 1.4-.3.4-.9.5-1.3.2z" /></svg>
                            Spotify
                        </a>
                    )}
                    {youtubeUrl && (
                        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#c8a96e] border border-[#c8a96e]/30 bg-[#0d0d12]/50 hover:border-[#c8a96e] hover:bg-[#c8a96e]/10 transition-all duration-200">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.5v-7l6.3 3.5-6.3 3.5z" /></svg>
                            YouTube
                        </a>
                    )}
                </div>
            )}

            {hasError && (
                <div className="w-full bg-[#200d0d] border border-red-900/40 py-1.5 px-3 text-center rounded-sm animate-fade-in">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-red-400 font-mono font-bold animate-pulse">⚠️ REIATSU PARTICLES DISRUPTED — TAP AGAIN TO RESET SEAL</span>
                </div>
            )}

            {isFull && !target?.audio_url && hasLinks && !hasError && (
                <p className="text-[9px] font-mono tracking-[0.2em] text-[#777796]/70 uppercase text-center">No direct clip available — listen via the links above</p>
            )}
        </div>
    );
}