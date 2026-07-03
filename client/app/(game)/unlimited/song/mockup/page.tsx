"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getSongs } from '@/src/lib/utils/song';
import { BleachSong, BleachSongSegment } from '@/src/entities/song/schema';
import { createSearchEngine } from '@/src/lib/search/fuzzy';

// Layout Shared Components
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import { ModeBadge } from '@/src/shared/ui/ModeBadge';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';

// ============================================================================
// Constants
// ============================================================================

const TEST_DURATIONS = [
    { label: '0.2s', value: 200 },
    { label: '0.5s', value: 500 },
    { label: '1s', value: 1000 },
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
    { label: '🔥 Full Cut', value: 999999 },
] as const;

const NO_CUTOFF_VALUE = 999999;
const DEFAULT_SONG_DURATION_MS = 240_000; // fallback 4 min ก่อนเมทาดาต้าจริงโหลดเสร็จ
const STEP_MS = 50;

const COLOR = {
    track: '#1c1c2b',       // ยังไม่ถูกเล่น / นอกช่วงทดสอบ
    window: 'rgba(200, 169, 110, 0.30)', // ช่วงที่ "จะ" ถูกตัดตาม duration ที่เลือก (ยังไม่เล่น)
    played: '#f59e0b',      // ช่วงที่ "เล่นไปแล้วจริง" ณ ขณะนี้ (ไล่สีอำพัน)
} as const;

// ============================================================================
// Helpers
// ============================================================================

const formatSeconds = (ms: number) => (ms / 1000).toFixed(2);

/** สร้าง UUID v4 (ใช้ Web Crypto API ที่มีในเบราว์เซอร์ยุคใหม่ทุกตัว) */
const generateUuid = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });

/**
 * สร้าง linear-gradient สำหรับพื้นหลัง <input type="range"> โดยแบ่งเป็น 4 โซน:
 * [0 → start] เทาเข้ม | [start → played] สีอำพันทึบ (เล่นไปแล้วจริง)
 * [played → cutoff] สีอำพันจาง (ช่วงที่ยังไม่ถูกเล่น แต่จะถูกตัดตาม duration)
 * [cutoff → end] เทาเข้ม
 */
function buildSliderGradient(params: {
    totalMs: number;
    startMs: number;
    cutoffDurationMs: number;
    currentMs: number;
    isPlaying: boolean;
}): string {
    const { totalMs, startMs, cutoffDurationMs, currentMs, isPlaying } = params;
    if (totalMs <= 0) return COLOR.track;

    const pct = (ms: number) => Math.min(100, Math.max(0, (ms / totalMs) * 100));

    const startPct = pct(startMs);
    const cutoffMs = cutoffDurationMs >= NO_CUTOFF_VALUE ? totalMs : startMs + cutoffDurationMs;
    const cutoffPct = pct(cutoffMs);
    const playedPct = isPlaying ? pct(Math.max(startMs, Math.min(currentMs, cutoffMs))) : startPct;

    return `linear-gradient(to right,
        ${COLOR.track} 0%, ${COLOR.track} ${startPct}%,
        ${COLOR.played} ${startPct}%, ${COLOR.played} ${playedPct}%,
        ${COLOR.window} ${playedPct}%, ${COLOR.window} ${cutoffPct}%,
        ${COLOR.track} ${cutoffPct}%, ${COLOR.track} 100%)`;
}

// ============================================================================
// Hook: เครื่องยนต์เล่นเสียงตัวเดียว รองรับตัด (cutoff) ตามค่า selectedDuration
// ============================================================================

function useAudioEngine(cutoffMs: number) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const cutoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [playingId, setPlayingId] = useState<string | null>(null);
    const [livePositions, setLivePositions] = useState<Record<string, number>>({});
    const [songDurations, setSongDurations] = useState<Record<string, number>>({});

    const clearCutoffTimer = () => {
        if (cutoffTimerRef.current) {
            clearTimeout(cutoffTimerRef.current);
            cutoffTimerRef.current = null;
        }
    };

    const stop = useCallback((songId?: string) => {
        clearCutoffTimer();
        audioRef.current?.pause();
        setPlayingId(null);
        if (songId) {
            setLivePositions((prev) => {
                const copy = { ...prev };
                delete copy[songId];
                return copy;
            });
        }
    }, []);

    const play = useCallback(
        (songId: string, audioUrl: string, startMs: number, playId: string) => {
            const audio = audioRef.current;
            if (!audio) return;

            // กดซ้ำที่ปุ่มเดิม -> หยุด
            if (playingId === playId) {
                stop(songId);
                return;
            }

            clearCutoffTimer();

            audio.src = audioUrl;
            audio.currentTime = startMs / 1000;
            setPlayingId(playId);
            setLivePositions((prev) => ({ ...prev, [songId]: startMs }));

            audio.play().catch((err) => {
                console.error('Audio playback blocked:', err);
                setPlayingId(null);
            });

            audio.onended = () => stop(songId);
            audio.onloadedmetadata = () => {
                if (Number.isFinite(audio.duration) && audio.duration > 0) {
                    setSongDurations((prev) => ({ ...prev, [songId]: Math.floor(audio.duration * 1000) }));
                }
            };

            // ⏱️ บังคับตัดเสียงตามค่า "duration ตามตัวควบคุม" (TEST_DURATIONS)
            if (cutoffMs < NO_CUTOFF_VALUE) {
                cutoffTimerRef.current = setTimeout(() => stop(songId), cutoffMs);
            }
        },
        [playingId, cutoffMs, stop],
    );

    // อัปเดตตำแหน่งหัวอ่านแบบเรียลไทม์ เฉพาะตอนเล่นจาก Live Tuning Workbench
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (!playingId || !playingId.startsWith('live-')) return;
            const songId = playingId.replace('live-', '');
            setLivePositions((prev) => ({ ...prev, [songId]: Math.floor(audio.currentTime * 1000) }));
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }, [playingId]);

    // เคลียร์ timer + หยุดเสียงตอน unmount
    useEffect(() => {
        return () => {
            clearCutoffTimer();
            audioRef.current?.pause();
        };
    }, []);

    return { audioRef, playingId, livePositions, songDurations, play, stop };
}

// ============================================================================
// Sub-component: Song Filter Search Bar (ค้นหาเพื่อกรองรายการเพลงในตารางเท่านั้น)
// ============================================================================

function SongFilterBar({
    query,
    onQueryChange,
    resultCount,
    totalCount,
}: {
    query: string;
    onQueryChange: (v: string) => void;
    resultCount: number;
    totalCount: number;
}) {
    return (
        <div className="max-w-2xl mx-auto mb-6">
            <div className="relative group/input">
                <div className="absolute -inset-px bg-gradient-to-r from-red-900/0 via-red-600/0 to-red-900/0 group-focus-within/input:via-red-600/40 transition-all duration-500" />

                <input
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="FILTER: SEARCH TRACK TITLE OR ARTIST..."
                    autoComplete="off"
                    className="relative w-full py-3 pl-5 pr-24 bg-[#050507] text-[#e2e2e5] text-xs font-medium tracking-[0.15em] uppercase border border-[#1a1a24] focus:outline-none focus:border-red-600/80 focus:text-white transition-all duration-300 placeholder-[#444452]"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <span className="text-[9px] font-mono font-bold text-[#5a5a78]">
                        {resultCount}/{totalCount}
                    </span>
                    <span className="text-[10px] text-[#444452] group-focus-within/input:text-red-500 tracking-widest transition-colors duration-300 font-mono">
                        //
                    </span>
                </div>

                {query && (
                    <button
                        type="button"
                        onClick={() => onQueryChange('')}
                        className="absolute right-16 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-[#5a5a78] hover:text-red-500 transition-colors pointer-events-auto"
                        title="Clear filter"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Sub-component: Duration Control Panel
// ============================================================================

function DurationControlPanel({
    selected,
    onSelect,
    disabled,
}: {
    selected: number;
    onSelect: (value: number) => void;
    disabled: boolean;
}) {
    return (
        <div className="my-6 p-5 bg-[#0a0a0f] border border-[#1b1b26] rounded-sm max-w-2xl mx-auto shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8a96e] mb-3 text-center flex items-center justify-center gap-2">
                // HEARDLE MECHANICS TESTING CUTOFF DURATION
                {disabled && (
                    <span className="text-[8px] font-mono font-bold text-amber-500 normal-case tracking-normal bg-amber-950/30 border border-amber-900/50 px-1.5 py-0.5 rounded-sm animate-pulse">
                        locked · playing
                    </span>
                )}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {TEST_DURATIONS.map((dur) => (
                    <button
                        key={dur.value}
                        onClick={() => onSelect(dur.value)}
                        disabled={disabled}
                        title={disabled ? 'หยุดเสียงที่กำลังเล่นก่อนเปลี่ยนค่านี้' : undefined}
                        className={`py-2 px-1 text-[10px] font-mono font-bold tracking-wider uppercase border transition-all duration-200 ${disabled
                            ? 'opacity-40 cursor-not-allowed bg-[#050507] border-[#1a1a24] text-[#3a3a48]'
                            : selected === dur.value
                                ? 'bg-red-950/40 border-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                                : 'bg-[#050507] border-[#222230] text-[#555566] hover:border-[#44445c] hover:text-white'
                            }`}
                    >
                        {dur.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Sub-component: Static DB segment row
// ============================================================================

function StaticSegmentRow({
    seg,
    isPlaying,
    onToggle,
}: {
    seg: BleachSongSegment;
    isPlaying: boolean;
    onToggle: () => void;
}) {
    return (
        <div
            className={`flex items-center justify-between p-2 border transition-all ${isPlaying ? 'bg-red-950/20 border-red-800/80' : 'bg-[#050507] border-[#181822]'
                }`}
        >
            <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[10px] font-semibold text-[#b8b8c2] truncate">{seg.segment_name}</span>
                <span className="text-[9px] font-mono text-[#5e5e7a] mt-0.5">
                    ⚓ <span className="text-red-500 font-bold">{seg.start_time_ms} ms</span> (
                    {formatSeconds(seg.start_time_ms)}s) |{' '}
                    <span className="text-[#c8a96e] uppercase">{seg.difficulty_level}</span>
                </span>
            </div>
            <button
                onClick={onToggle}
                className={`px-2.5 py-1 text-[9px] font-mono font-bold border transition-all shrink-0 ${isPlaying
                    ? 'bg-red-600 text-white border-red-500 animate-pulse'
                    : 'bg-[#0d0d14] text-[#c8a96e] border-[#2c2c3d] hover:border-red-600/50 hover:text-white'
                    }`}
            >
                {isPlaying ? '■' : '▶'}
            </button>
        </div>
    );
}

// ============================================================================
// Sub-component: Live Tuning Workbench (per song)
// ============================================================================

function LiveTuningWorkbench({
    song,
    segmentId,
    startMs,
    name,
    difficulty,
    maxDurationMs,
    cutoffDurationMs,
    isPlaying,
    displayMs,
    onNameChange,
    onDifficultyChange,
    onStartChange,
    onTogglePlay,
    onRegenerateId,
}: {
    song: BleachSong;
    segmentId: string;
    startMs: number;
    name: string;
    difficulty: string;
    maxDurationMs: number;
    cutoffDurationMs: number;
    isPlaying: boolean;
    displayMs: number;
    onNameChange: (v: string) => void;
    onDifficultyChange: (v: string) => void;
    onStartChange: (v: number) => void;
    onTogglePlay: () => void;
    onRegenerateId: () => void;
}) {
    const generatedJsonExample = JSON.stringify(
        {
            id: segmentId,
            segment_name: name,
            start_time_ms: startMs,
            difficulty_level: difficulty,
        },
        null,
        4,
    ) + ',';

    const gradient = buildSliderGradient({
        totalMs: maxDurationMs,
        startMs,
        cutoffDurationMs,
        currentMs: displayMs,
        isPlaying,
    });

    const cutoffLabel =
        cutoffDurationMs >= NO_CUTOFF_VALUE ? 'FULL CUT' : `${(cutoffDurationMs / 1000).toFixed(1)}s window`;

    return (
        <div className="col-span-12 md:col-span-6 lg:col-span-5 p-3 bg-[#07070c] border border-[#151522] rounded-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1b1b30] pb-1.5">
                <span className="text-[10px] font-mono font-bold text-[#c8a96e] tracking-wider">⚓ LIVE ANCHOR TUNER</span>
                <span className="text-[9px] font-mono text-gray-500 uppercase">{cutoffLabel}</span>
            </div>

            {/* ป้อนชื่อ + เลือกระดับความยาก */}
            <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8">
                    <label className="text-[8px] font-mono font-bold block text-gray-400 mb-1">
                        SEGMENT IDENTIFIER NAME
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="w-full bg-[#030305] border border-[#1f1f33] px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-red-600 uppercase"
                    />
                </div>
                <div className="col-span-4">
                    <label className="text-[8px] font-mono font-bold block text-gray-400 mb-1">DIFFICULTY</label>
                    <select
                        value={difficulty}
                        onChange={(e) => onDifficultyChange(e.target.value)}
                        className="w-full bg-[#030305] border border-[#1f1f33] px-1 py-1 text-[10px] font-mono text-[#c8a96e] focus:outline-none focus:border-red-600"
                    >
                        <option value="easy">EASY</option>
                        <option value="normal">NORMAL</option>
                        <option value="hard">HARD</option>
                    </select>
                </div>
            </div>

            {/* Slider + ตัวเลข ms */}
            <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span className="text-[#555577]">
                        {isPlaying ? '🛰️ Real-time Track Position:' : '⚓ Selected Point:'}
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={isPlaying}
                            onClick={() => onStartChange(Math.max(0, startMs - STEP_MS))}
                            className={`w-5 h-5 flex items-center justify-center bg-[#0d0d14] border text-gray-400 transition-colors ${isPlaying
                                ? 'opacity-30 border-[#1f1f33] cursor-not-allowed'
                                : 'border-[#2c2c3d] hover:border-red-600 hover:text-white'
                                }`}
                            title={`-${STEP_MS}ms`}
                        >
                            -
                        </button>

                        <input
                            type="number"
                            min={0}
                            max={maxDurationMs}
                            readOnly={isPlaying}
                            value={displayMs === 0 ? '' : displayMs}
                            placeholder="0"
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                const finalVal = Number.isNaN(val) ? 0 : Math.min(Math.max(0, val), maxDurationMs);
                                onStartChange(finalVal);
                            }}
                            className={`w-20 bg-[#030305] border py-0.5 px-1 text-[10px] font-mono font-bold text-center focus:outline-none focus:border-red-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isPlaying ? 'text-amber-400 border-amber-900/40' : 'text-red-500 border-[#1f1f33]'
                                }`}
                        />

                        <button
                            type="button"
                            disabled={isPlaying}
                            onClick={() => onStartChange(Math.min(maxDurationMs, startMs + STEP_MS))}
                            className={`w-5 h-5 flex items-center justify-center bg-[#0d0d14] border text-gray-400 transition-colors ${isPlaying
                                ? 'opacity-30 border-[#1f1f33] cursor-not-allowed'
                                : 'border-[#2c2c3d] hover:border-red-600 hover:text-white'
                                }`}
                            title={`+${STEP_MS}ms`}
                        >
                            +
                        </button>

                        <span className={isPlaying ? 'text-amber-500 ml-0.5' : 'text-red-500 ml-0.5'}>ms</span>
                        <span className="text-gray-400 font-normal">({formatSeconds(displayMs)}s)</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-1">
                    <input
                        type="range"
                        min={0}
                        max={maxDurationMs}
                        step={STEP_MS}
                        disabled={isPlaying}
                        value={displayMs}
                        onChange={(e) => onStartChange(parseInt(e.target.value, 10))}
                        style={{ background: gradient }}
                        className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer transition-all outline-none ${isPlaying ? 'opacity-90' : ''
                            }`}
                    />

                    <button
                        type="button"
                        onClick={onTogglePlay}
                        className={`px-3 py-1 text-[9px] font-mono font-bold tracking-widest uppercase border transition-all ${isPlaying
                            ? 'bg-amber-600 text-white border-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                            : 'bg-red-950/20 text-red-400 border-red-900/60 hover:bg-red-600 hover:text-white'
                            }`}
                    >
                        {isPlaying ? '■ STOP' : '▶ TEST'}
                    </button>
                </div>

                {/* Legend เล็ก ๆ อธิบายสี */}
                <div className="flex items-center gap-3 text-[8px] font-mono text-gray-500 pt-0.5">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 inline-block" style={{ background: COLOR.played }} />
                        Played
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 inline-block" style={{ background: COLOR.window }} />
                        Cutoff window
                    </span>
                </div>
            </div>

            {/* JSON ตัวอย่างสำหรับก็อปวาง */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-mono font-bold text-[#5a5a78] uppercase">
                        // Live JSON Array Node Example
                    </span>
                    <button
                        type="button"
                        onClick={onRegenerateId}
                        title="Regenerate UUID"
                        className="text-[8px] font-mono font-bold text-[#c8a96e] bg-[#0d0d14] border border-[#2c2c3d] px-1.5 py-0.5 hover:border-red-600/60 hover:text-white transition-colors"
                    >
                        🔄 NEW UUID
                    </button>
                </div>
                <div className="relative group">
                    <pre
                        onClick={(e) => {
                            navigator.clipboard.writeText(generatedJsonExample);
                            // เปลี่ยนสีหรือแจ้งเตือนแบบง่ายๆ (ถ้าไม่ใช้ State)
                            const target = e.currentTarget;
                            target.style.borderColor = "#22c55e"; // เปลี่ยนเป็นสีเขียวชั่วคราว
                            setTimeout(() => target.style.borderColor = "#141424", 500);
                        }}
                        className="text-[9px] font-mono text-emerald-400 bg-[#030305] p-2 border border-[#141424] overflow-x-auto max-h-24 cursor-pointer hover:bg-[#0a0a0f] transition-all"
                    >
                        {generatedJsonExample}
                    </pre>
                    <div className="absolute top-1 right-1 text-[7px] font-mono bg-[#11111a] text-gray-400 px-1 border border-gray-800 pointer-events-none uppercase group-hover:text-white group-hover:border-emerald-700">
                        Click to Copy
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MockupSongGame() {
    if (!FEATURE_FLAGS.mockupSong) {
        return <Sealed />;
    }

    const songs = getSongs();

    const [selectedDuration, setSelectedDuration] = useState<number>(1000);
    const [isHowToOpen, setIsHowToOpen] = useState(false);

    // 🔍 Filter State (ค้นหาเพื่อกรองรายการในตาราง — ไม่เกี่ยวกับกลไกทายเพลง)
    const [filterQuery, setFilterQuery] = useState('');

    // ── 🎛️ Live Tuning States (คุมค่าตัวแปรสำหรับเจนเนอเรต JSON ตัวอย่างแยกตามไอดีเพลง)
    const [customStartTimes, setCustomStartTimes] = useState<Record<string, number>>({});
    const [customDifficulties, setCustomDifficulties] = useState<Record<string, string>>({});
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    // ⚓ UUID เสถียรต่อเพลง (สุ่มครั้งเดียวตอน mount, กด "NEW UUID" เพื่อสุ่มใหม่ได้)
    const [segmentIds, setSegmentIds] = useState<Record<string, string>>({});

    const { audioRef, playingId, livePositions, songDurations, play } = useAudioEngine(selectedDuration);

    const getCustomStartTime = (songId: string) => customStartTimes[songId] ?? 0;
    const getCustomDifficulty = (songId: string) => customDifficulties[songId] ?? 'normal';
    const getCustomName = (songId: string) => customNames[songId] ?? 'Custom Audio Hook Highlight';
    const getSegmentId = (songId: string) => segmentIds[songId] ?? "";
    const regenerateSegmentId = (songId: string) =>
        setSegmentIds((prev) => ({ ...prev, [songId]: generateUuid() }));

    useEffect(() => {
        const initialIds = Object.fromEntries(songs.map((s) => [s.id, generateUuid()]));
        setSegmentIds(initialIds);
    }, [songs]); // ใส่ dependencies เป็น songs เพื่อให้มั่นใจว่าโหลดเพลงมาก่อน

    // 🔍 Fuzzy search engine เดียวกับที่ใช้ใน SongSearchBar (title + artist) สำหรับกรองรายการ
    const searchEngine = useMemo(
        () => createSearchEngine(songs, { keys: ['title', 'artist'] }),
        [songs],
    );

    const filteredSongs = useMemo(() => {
        const trimmed = filterQuery.trim();
        if (!trimmed) return songs;
        return searchEngine.search(trimmed).map((r) => r.item);
    }, [filterQuery, searchEngine, songs]);

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <audio ref={audioRef} preload="auto" />
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[95%] mx-auto px-4 pb-16 mt-6">
                <ModeBadge mode="unlimited" />
                <SubHeader
                    title="REIRAKU CHORD RESONANCE"
                    description="SDRI // Gotei 13 Division 12 Audio Testing Laboratory & Live JSON Tuner Bench"
                />

                <DurationControlPanel
                    selected={selectedDuration}
                    onSelect={setSelectedDuration}
                    disabled={playingId !== null}
                />

                <SongFilterBar
                    query={filterQuery}
                    onQueryChange={setFilterQuery}
                    resultCount={filteredSongs.length}
                    totalCount={songs.length}
                />

                <Divider />

                {/* 📋 AUDIO ASSETS WORKBENCH GRID */}
                <div className="mt-8 overflow-hidden border border-[#14141a] bg-[#030305]/40">
                    <div className="hidden lg:grid grid-cols-12 gap-4 bg-[#0a0a0f] p-4 border-b border-[#1b1b26] text-[11px] font-bold tracking-[0.15em] text-[#5a5a78] uppercase font-mono">
                        <div className="col-span-3">Track Info // Metadata</div>
                        <div className="col-span-4">Static Database Segments (JSON Assets)</div>
                        <div className="col-span-5">⚓ Live Tuning Lab & Real-Time JSON Generation</div>
                    </div>

                    <div className="divide-y divide-[#14141a]/60">
                        {filteredSongs.length === 0 ? (
                            <div className="p-8 text-center text-[11px] font-mono text-[#444452] uppercase tracking-widest">
                                No tracks match "{filterQuery}"
                            </div>
                        ) : (
                            filteredSongs.map((song) => {
                                const maxSongDurationMs = songDurations[song.id] || DEFAULT_SONG_DURATION_MS;
                                const startMs = getCustomStartTime(song.id);
                                const difficulty = getCustomDifficulty(song.id);
                                const name = getCustomName(song.id);
                                const isLivePlaying = playingId === `live-${song.id}`;
                                const displayMs = isLivePlaying ? livePositions[song.id] ?? startMs : startMs;

                                return (
                                    <div
                                        key={song.id}
                                        className="grid grid-cols-12 gap-4 p-4 items-start hover:bg-[#07070a] transition-colors duration-150"
                                    >
                                        {/* คอลัมน์ที่ 1: ข้อมูลทั่วไปของเพลง */}
                                        <div className="col-span-12 lg:col-span-3 flex flex-col gap-1">
                                            <span className="text-xs font-bold text-white uppercase tracking-wide truncate">
                                                {song.title}
                                            </span>
                                            <span className="text-[10px] text-[#c8a96e] uppercase tracking-wider font-mono">
                                                BY {song.artist}
                                            </span>
                                            <span className="text-[9px] text-[#3e3e52] font-mono break-all bg-black/40 p-1.5 border border-[#14141a] rounded-sm mt-1">
                                                📁 URL: {song.audio_url}
                                            </span>
                                            <div className="flex gap-1.5 mt-2">
                                                {song.youtube_url && (
                                                    <a
                                                        href={song.youtube_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[9px] font-mono font-bold text-red-500 bg-red-950/20 px-2 py-0.5 border border-red-950/60 hover:border-red-600 transition-colors"
                                                    >
                                                        YouTube
                                                    </a>
                                                )}
                                                {song.spotify_url && (
                                                    <a
                                                        href={song.spotify_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-950/20 px-2 py-0.5 border border-emerald-950/60 hover:border-emerald-600 transition-colors"
                                                    >
                                                        SPOTIFY
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* คอลัมน์ที่ 2: เซกเมนต์ดั้งเดิมที่มีอยู่ในไฟล์ JSON */}
                                        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-2">
                                            <span className="text-[10px] font-mono font-bold text-[#5a5a78] tracking-widest uppercase mb-1">
                                                // Embedded DB Anchors
                                            </span>
                                            {song.segments && song.segments.length > 0 ? (
                                                song.segments.map((seg) => (
                                                    <StaticSegmentRow
                                                        key={seg.id}
                                                        seg={seg}
                                                        isPlaying={playingId === seg.id}
                                                        onToggle={() =>
                                                            play(song.id, song.audio_url, seg.start_time_ms, seg.id)
                                                        }
                                                    />
                                                ))
                                            ) : (
                                                <span className="text-[10px] italic text-[#444452]">No baseline segments.</span>
                                            )}
                                        </div>

                                        {/* คอลัมน์ที่ 3: ⚓ LIVE TUNING WORKBENCH */}
                                        <LiveTuningWorkbench
                                            song={song}
                                            segmentId={getSegmentId(song.id)}
                                            startMs={startMs}
                                            name={name}
                                            difficulty={difficulty}
                                            maxDurationMs={maxSongDurationMs}
                                            cutoffDurationMs={selectedDuration}
                                            isPlaying={isLivePlaying}
                                            displayMs={displayMs}
                                            onNameChange={(v) => setCustomNames((prev) => ({ ...prev, [song.id]: v }))}
                                            onDifficultyChange={(v) =>
                                                setCustomDifficulties((prev) => ({ ...prev, [song.id]: v }))
                                            }
                                            onStartChange={(v) => setCustomStartTimes((prev) => ({ ...prev, [song.id]: v }))}
                                            onTogglePlay={() =>
                                                play(song.id, song.audio_url, startMs, `live-${song.id}`)
                                            }
                                            onRegenerateId={() => regenerateSegmentId(song.id)}
                                        />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}