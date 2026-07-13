"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getReleases } from '@/src/features/release/release';
import { BleachRelease } from '@/src/entities/release/schema';
import { createSearchEngine } from '@/src/lib/search/fuzzy';

// Layout Shared Components
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';

// ============================================================================
// Constants
//
// 🩹 NOTE vs. song mock page: no TEST_DURATIONS / DurationControlPanel here.
// Song's cutoff duration is a *shared* variable you sweep across every track
// while tuning. Release's `clip_end_ms` is not shared — it's already a field
// on each BleachRelease record, tuned per-record. So the "duration" control
// lives inside each row's Live Tuning Workbench instead of a global panel
// above the table. Ask before re-adding a global panel; it doesn't map to
// the schema the way it does for song segments.
// ============================================================================

const DEFAULT_RELEASE_DURATION_MS = 60_000; // fallback 60s ก่อนเมทาดาต้าจริงโหลดเสร็จ
const STEP_MS = 50;

// 🩹 audio_url ใน releases.json เป็นแค่ชื่อไฟล์เปล่าๆ (เช่น "Bankai_Izuru_Kira.mp3")
// ไม่ใช่ path เต็ม เลยต้องเติม base path นี้ก่อนใช้เป็น audio.src เสมอ
// ปรับให้ตรงกับที่เก็บไฟล์จริงถ้าไม่ใช่ public/assets/releases
const AUDIO_BASE_PATH = '/api/asset/release/';
const resolveAudioSrc = (audioUrl: string) => `${AUDIO_BASE_PATH}${audioUrl}`;

const COLOR = {
    track: '#1c1c2b',        // ยังไม่ถูกเล่น / เกิน clip_end_ms ที่ทดสอบอยู่
    window: 'rgba(200, 169, 110, 0.30)', // ช่วง 0 → clip_end_ms ที่กำลังทดสอบ (ยังไม่เล่น)
    played: '#f59e0b',       // ช่วงที่ "เล่นไปแล้วจริง" ณ ขณะนี้ (ไล่สีอำพัน)
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
 * สร้าง linear-gradient สำหรับพื้นหลัง <input type="range"> — release เล่นจาก 0 เสมอ
 * (ไม่มี start offset แบบ song segment) แบ่งเป็น 3 โซน:
 * [0 → played] สีอำพันทึบ | [played → clipEnd] สีอำพันจาง (จะถูกตัด) | [clipEnd → end] เทาเข้ม
 */
function buildSliderGradient(params: {
    totalMs: number;
    clipEndMs: number;
    currentMs: number;
    isPlaying: boolean;
}): string {
    const { totalMs, clipEndMs, currentMs, isPlaying } = params;
    if (totalMs <= 0) return COLOR.track;

    const pct = (ms: number) => Math.min(100, Math.max(0, (ms / totalMs) * 100));

    const clipPct = pct(clipEndMs);
    const playedPct = isPlaying ? pct(Math.min(currentMs, clipEndMs)) : 0;

    return `linear-gradient(to right,
        ${COLOR.played} 0%, ${COLOR.played} ${playedPct}%,
        ${COLOR.window} ${playedPct}%, ${COLOR.window} ${clipPct}%,
        ${COLOR.track} ${clipPct}%, ${COLOR.track} 100%)`;
}

// ============================================================================
// Hook: เครื่องยนต์เล่นเสียงตัวเดียว รองรับตัดที่ clip_end_ms ของ "แต่ละ release"
// (ต่างจาก song ที่ cutoff เป็นค่ากลาง release ใช้ค่าที่ tune แยกต่อแถว จึงส่ง
// cutoffMs เข้า play() ตรงๆ แทนที่จะ fix ไว้ที่ hook level)
// ============================================================================

function useAudioEngine() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const cutoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [playingId, setPlayingId] = useState<string | null>(null);
    const [livePositions, setLivePositions] = useState<Record<string, number>>({});
    const [releaseDurations, setReleaseDurations] = useState<Record<string, number>>({});
    // 🩹 เก็บ releaseId ที่เล่นไม่ได้ (404 / decode error) เพื่อโชว์ error ให้เห็นในตาราง
    // แทนที่จะเงียบแล้วดูเหมือนปุ่มไม่ทำงาน
    const [playbackErrors, setPlaybackErrors] = useState<Record<string, string>>({});

    const clearCutoffTimer = () => {
        if (cutoffTimerRef.current) {
            clearTimeout(cutoffTimerRef.current);
            cutoffTimerRef.current = null;
        }
    };

    const stop = useCallback((releaseId?: string) => {
        clearCutoffTimer();
        audioRef.current?.pause();
        setPlayingId(null);
        if (releaseId) {
            setLivePositions((prev) => {
                const copy = { ...prev };
                delete copy[releaseId];
                return copy;
            });
        }
    }, []);

    /**
     * @param cutoffMs  ms ที่จะให้ตัด นับจาก 0 — ปกติคือ clip_end_ms ที่กำลัง tune อยู่
     *                  ส่ง Infinity เพื่อเล่นแบบเต็มไฟล์ (ปุ่ม "Full Playback")
     */
    const play = useCallback(
        (releaseId: string, audioUrl: string, cutoffMs: number, playId: string) => {
            const audio = audioRef.current;
            if (!audio) return;

            // กดซ้ำที่ปุ่มเดิม -> หยุด
            if (playingId === playId) {
                stop(releaseId);
                return;
            }

            clearCutoffTimer();

            // 🩹 audioUrl ที่มาจาก releases.json เป็นแค่ชื่อไฟล์เปล่าๆ ต้องเติม base path ก่อนเสมอ
            audio.src = resolveAudioSrc(audioUrl);
            audio.currentTime = 0;
            setPlayingId(playId);
            setLivePositions((prev) => ({ ...prev, [releaseId]: 0 }));
            setPlaybackErrors((prev) => {
                if (!(releaseId in prev)) return prev;
                const copy = { ...prev };
                delete copy[releaseId];
                return copy;
            });

            audio.play().catch((err) => {
                console.error('Audio playback blocked:', err);
                setPlaybackErrors((prev) => ({ ...prev, [releaseId]: 'Playback blocked or file not found' }));
                setPlayingId(null);
            });

            audio.onended = () => stop(releaseId);
            audio.onloadedmetadata = () => {
                if (Number.isFinite(audio.duration) && audio.duration > 0) {
                    setReleaseDurations((prev) => ({ ...prev, [releaseId]: Math.floor(audio.duration * 1000) }));
                }
            };
            audio.onerror = () => {
                // 🩹 เคสหลัก: ไฟล์ไม่มีจริงใน /assets/releases (404) — audio element จะยิง error
                // event นี้แทนที่จะ throw ให้ catch ข้างบนจับ ต้องดักแยกไว้
                setPlaybackErrors((prev) => ({ ...prev, [releaseId]: `File not found: ${audio.src}` }));
                stop(releaseId);
            };

            if (Number.isFinite(cutoffMs)) {
                cutoffTimerRef.current = setTimeout(() => stop(releaseId), cutoffMs);
            }
        },
        [playingId, stop],
    );

    // อัปเดตตำแหน่งหัวอ่านแบบเรียลไทม์ เฉพาะตอนเล่นจาก Live Tuning Workbench
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (!playingId || !playingId.startsWith('live-')) return;
            const releaseId = playingId.replace('live-', '');
            setLivePositions((prev) => ({ ...prev, [releaseId]: Math.floor(audio.currentTime * 1000) }));
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

    return { audioRef, playingId, livePositions, releaseDurations, playbackErrors, play, stop };
}

// ============================================================================
// Sub-component: Release Filter Search Bar (ค้นหาเพื่อกรองรายการในตารางเท่านั้น)
// ============================================================================

function ReleaseFilterBar({
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
                    placeholder="FILTER: SEARCH TECHNIQUE NAME OR CHARACTER ID..."
                    autoComplete="off"
                    className="relative w-full py-3 pl-5 pr-24 bg-[#050507] text-[#e2e2e5] text-xs font-medium tracking-[0.15em] uppercase border border-[#777796] focus:outline-none focus:border-red-600/80 focus:text-white transition-all duration-300 placeholder-[#777796]"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <span className="text-[11px] font-mono font-bold text-[#777796]">
                        {resultCount}/{totalCount}
                    </span>
                    <span className="text-[12px] text-[#444452] group-focus-within/input:text-red-500 tracking-widest transition-colors duration-300 font-mono">
                        //
                    </span>
                </div>

                {query && (
                    <button
                        type="button"
                        onClick={() => onQueryChange('')}
                        className="absolute right-16 top-1/2 -translate-y-1/2 text-[12px] font-mono font-bold text-[#777796] hover:text-red-500 transition-colors pointer-events-auto"
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
// Sub-component: Static DB Values (ค่าที่มีอยู่ใน releases.json ตอนนี้ — read only,
// เทียบเท่าคอลัมน์ "Embedded DB Anchors" ของ song แต่ release มีค่าเดียวไม่ใช่ array)
// ============================================================================

function StaticReleaseValues({ release }: { release: BleachRelease }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-[12px] font-mono font-bold text-[#777796] tracking-widest uppercase mb-1">
                // Embedded DB Values
            </span>
            <div className="bg-[#050507] border border-[#181822] p-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#5e5e7a]">clip_end_ms</span>
                    <span className="text-red-500 font-bold">
                        {release.clip_end_ms} <span className="text-[#ccb281]">({formatSeconds(release.clip_end_ms)}s)</span>
                    </span>
                </div>
                {release.source_episode && (
                    <div className="text-[11px] font-mono text-[#5e5e7a]">
                        source_episode: <span className="text-[#c8a96e]">{release.source_episode}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Sub-component: Editable Release Fields — trigger_phrase / technique_name /
// technique_translation are mockup-only editable inputs (not persisted to
// releases.json automatically — copy them out via the "Live JSON Record"
// preview, same pattern as clip_end_ms already works). Values live in the
// parent's `customFields` state, keyed by release.id.
// ============================================================================

function EditableReleaseFields({
    triggerPhrase,
    techniqueName,
    techniqueTranslation,
    onChange,
}: {
    triggerPhrase: string;
    techniqueName: string;
    techniqueTranslation: string;
    onChange: (field: 'trigger_phrase' | 'technique_name' | 'technique_translation', value: string) => void;
}) {
    const inputClass =
        'w-full bg-[#050507] border border-[#181822] px-2 py-1 text-[12px] font-mono text-[#e2e2e5] focus:outline-none focus:border-red-600/70 placeholder-[#3a3a48]';

    return (
        <div className="flex flex-col gap-1.5 mt-1">
            <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono font-bold text-[#777796] uppercase tracking-wider">
                    technique_name
                </span>
                <input
                    type="text"
                    value={techniqueName}
                    placeholder="e.g. Kacho Fuugetsu"
                    onChange={(e) => onChange('technique_name', e.target.value)}
                    className={inputClass}
                />
            </label>

            <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono font-bold text-[#777796] uppercase tracking-wider">
                    technique_translation
                </span>
                <input
                    type="text"
                    value={techniqueTranslation}
                    placeholder="e.g. Flower, Wind, Moon"
                    onChange={(e) => onChange('technique_translation', e.target.value)}
                    className={inputClass}
                />
            </label>

            <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono font-bold text-[#777796] uppercase tracking-wider">
                    trigger_phrase
                </span>
                <input
                    type="text"
                    value={triggerPhrase}
                    placeholder="played during the guessing clip"
                    onChange={(e) => onChange('trigger_phrase', e.target.value)}
                    className={inputClass}
                />
            </label>
        </div>
    );
}

// ============================================================================
// Sub-component: Live Tuning Workbench (per release) — tunes clip_end_ms
// (ไม่มี start_time_ms เพราะ release เล่นจาก 0 เสมอ ไม่มี difficulty เพราะ release
// ไม่มีระบบ difficulty เหมือน song segment)
// ============================================================================

function LiveTuningWorkbench({
    release,
    clipEndMs,
    maxDurationMs,
    isPlaying,
    isFullPlaying,
    displayMs,
    onClipEndChange,
    onTogglePlay,
    onToggleFullPlay,
    errorMessage,
}: {
    release: BleachRelease;
    clipEndMs: number;
    maxDurationMs: number;
    isPlaying: boolean;
    isFullPlaying: boolean;
    displayMs: number;
    onClipEndChange: (v: number) => void;
    onTogglePlay: () => void;
    onToggleFullPlay: () => void;
    errorMessage?: string;
}) {
    const generatedJsonExample = JSON.stringify(
        {
            ...release,
            clip_end_ms: clipEndMs,
        },
        null,
        4,
    ) + ',';

    const gradient = buildSliderGradient({
        totalMs: maxDurationMs,
        clipEndMs,
        currentMs: displayMs,
        isPlaying,
    });

    const anyPlaying = isPlaying || isFullPlaying;

    return (
        <div className="col-span-12 lg:col-span-5 p-3 bg-[#07070c] border border-[#151522] rounded-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1b1b30] pb-1.5">
                <span className="text-[12px] font-mono font-bold text-[#c8a96e] tracking-wider">⚓ LIVE CLIP-END TUNER</span>
                <span className="text-[11px] font-mono text-gray-500 uppercase">
                    {(clipEndMs / 1000).toFixed(2)}s cut
                </span>
            </div>

            {/* Slider + ตัวเลข ms — เล่นจาก 0 เสมอ ปรับได้แค่จุดตัด */}
            <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-[12px] font-mono font-bold">
                    <span className="text-[#555577]">
                        {isPlaying ? '🛰️ Real-time Clip Position:' : '⚓ Selected clip_end_ms:'}
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={anyPlaying}
                            onClick={() => onClipEndChange(Math.max(0, clipEndMs - STEP_MS))}
                            className={`w-5 h-5 flex items-center justify-center bg-[#0d0d14] border text-gray-400 transition-colors ${anyPlaying
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
                            readOnly={anyPlaying}
                            value={clipEndMs === 0 ? '' : clipEndMs}
                            placeholder="0"
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                const finalVal = Number.isNaN(val) ? 0 : Math.min(Math.max(0, val), maxDurationMs);
                                onClipEndChange(finalVal);
                            }}
                            className={`w-20 bg-[#030305] border py-0.5 px-1 text-[12px] font-mono font-bold text-center focus:outline-none focus:border-red-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isPlaying ? 'text-amber-400 border-amber-900/40' : 'text-red-500 border-[#1f1f33]'
                                }`}
                        />

                        <button
                            type="button"
                            disabled={anyPlaying}
                            onClick={() => onClipEndChange(Math.min(maxDurationMs, clipEndMs + STEP_MS))}
                            className={`w-5 h-5 flex items-center justify-center bg-[#0d0d14] border text-gray-400 transition-colors ${anyPlaying
                                ? 'opacity-30 border-[#1f1f33] cursor-not-allowed'
                                : 'border-[#2c2c3d] hover:border-red-600 hover:text-white'
                                }`}
                            title={`+${STEP_MS}ms`}
                        >
                            +
                        </button>

                        <span className={isPlaying ? 'text-amber-500 ml-0.5' : 'text-red-500 ml-0.5'}>ms</span>
                        <span className="text-gray-400 font-normal">({formatSeconds(isPlaying ? displayMs : clipEndMs)}s)</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-1">
                    <input
                        type="range"
                        min={0}
                        max={maxDurationMs}
                        step={STEP_MS}
                        disabled={anyPlaying}
                        value={clipEndMs}
                        onChange={(e) => onClipEndChange(parseInt(e.target.value, 10))}
                        style={{ background: gradient }}
                        className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer transition-all outline-none ${isPlaying ? 'opacity-90' : ''
                            }`}
                    />

                    <button
                        type="button"
                        onClick={onTogglePlay}
                        disabled={isFullPlaying}
                        className={`px-3 py-1 text-[11px] font-mono font-bold tracking-widest uppercase border transition-all ${isPlaying
                            ? 'bg-amber-600 text-white border-amber-500 animate-pulse shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                            : isFullPlaying
                                ? 'opacity-30 border-[#1f1f33] cursor-not-allowed text-gray-500'
                                : 'bg-red-950/20 text-red-400 border-red-900/60 hover:bg-red-600 hover:text-white'
                            }`}
                    >
                        {isPlaying ? '■ STOP' : '▶ TEST CLIP'}
                    </button>

                    <button
                        type="button"
                        onClick={onToggleFullPlay}
                        disabled={isPlaying}
                        className={`px-3 py-1 text-[11px] font-mono font-bold tracking-widest uppercase border transition-all ${isFullPlaying
                            ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                            : isPlaying
                                ? 'opacity-30 border-[#1f1f33] cursor-not-allowed text-gray-500'
                                : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/60 hover:bg-emerald-600 hover:text-white'
                            }`}
                    >
                        {isFullPlaying ? '■ STOP' : '▶ FULL'}
                    </button>
                </div>

                {errorMessage && (
                    <div className="text-[11px] font-mono text-red-400 bg-red-950/20 border border-red-900/50 px-2 py-1 mt-1">
                        ⚠️ {errorMessage}
                    </div>
                )}

                {/* Legend เล็ก ๆ อธิบายสี */}
                <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 pt-0.5">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 inline-block" style={{ background: COLOR.played }} />
                        Played
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 inline-block" style={{ background: COLOR.window }} />
                        Clip window (0 → clip_end_ms)
                    </span>
                </div>
            </div>

            {/* JSON ตัวอย่างสำหรับก็อปวาง */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-[#777796] uppercase">
                        // Live JSON Record (clip_end_ms tuned)
                    </span>
                </div>
                <div className="relative group">
                    <pre
                        onClick={(e) => {
                            navigator.clipboard.writeText(generatedJsonExample);
                            const target = e.currentTarget;
                            target.style.borderColor = "#22c55e";
                            setTimeout(() => target.style.borderColor = "#141424", 500);
                        }}
                        className="text-[11px] font-mono text-emerald-400 bg-[#030305] p-2 border border-[#141424] overflow-x-auto max-h-32 cursor-pointer hover:bg-[#0a0a0f] transition-all"
                    >
                        {generatedJsonExample}
                    </pre>
                    <div className="absolute top-1 right-1 text-[10px] font-mono bg-[#11111a] text-gray-400 px-1 border border-gray-800 pointer-events-none uppercase group-hover:text-white group-hover:border-emerald-700">
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

export default function MockupReleaseGame() {
    if (!FEATURE_FLAGS.mockup.release) {
        return <Sealed />;
    }

    const releases = getReleases();

    const [isHowToOpen, setIsHowToOpen] = useState(false);

    // 🔍 Filter State (ค้นหาเพื่อกรองรายการในตาราง — ไม่เกี่ยวกับกลไกทาย release)
    const [filterQuery, setFilterQuery] = useState('');

    // ── 🎛️ Live Tuning States: ค่า clip_end_ms ที่กำลัง tune แยกตาม release id
    // (ต่างจาก song ที่มี customStartTimes/Difficulties/Names หลายตัว เพราะ release
    // มีแค่ตัวแปรเดียวที่ต้องหา — จุดตัด)
    const [customClipEnds, setCustomClipEnds] = useState<Record<string, number>>({});

    // ── ✏️ Live Editing States: trigger_phrase / technique_name / technique_translation
    // ที่กำลังแก้ในหน้านี้ แยกตาม release id — เหมือน customClipEnds เป๊ะ ๆ ค่าที่แก้
    // ยังไม่ persist ลง releases.json อัตโนมัติ ต้อง copy JSON ออกไปเอง (ปุ่ม Click to Copy)
    type EditableField = 'trigger_phrase' | 'technique_name' | 'technique_translation';
    const [customFields, setCustomFields] = useState<Record<string, Partial<Record<EditableField, string>>>>({});

    const { audioRef, playingId, livePositions, releaseDurations, playbackErrors, play } = useAudioEngine();

    const getCustomClipEnd = (release: BleachRelease) => customClipEnds[release.id] ?? release.clip_end_ms;

    const getFieldValue = (release: BleachRelease, field: EditableField): string => {
        const customValue = customFields[release.id]?.[field];
        if (customValue !== undefined) return customValue;

        const dataValue = release[field] as string | null | undefined;
        if (dataValue) return dataValue;

        // 🆕 trigger_phrase ส่วนใหญ่ก็คือชื่อ release_type ที่ตะโกน (เช่น "Bankai!")
        // ยกเว้น Shikai ที่ปกติไม่มีคำร้องแบบนั้น เลย default เป็นค่าว่างไว้เหมือนเดิม
        if (field === 'trigger_phrase' && release.release_type !== 'Shikai') {
            return release.release_type;
        }

        return '';
    };

    const handleFieldChange = (releaseId: string, field: EditableField, value: string) => {
        setCustomFields((prev) => ({
            ...prev,
            [releaseId]: { ...prev[releaseId], [field]: value },
        }));
    };

    // 🔍 Fuzzy search engine เดียวกับที่ใช้ใน ReleaseSearchBar (technique_name + technique_translation)
    // บวก character_id เพิ่มเข้ามาเพื่อให้กรองตามตัวละครในหน้า testing lab ได้ด้วย
    const searchEngine = useMemo(
        () => createSearchEngine(releases, { keys: ['technique_name', 'technique_translation', 'character_id'] }),
        [releases],
    );

    const filteredReleases = useMemo(() => {
        const trimmed = filterQuery.trim();
        if (!trimmed) return releases;
        return searchEngine.search(trimmed).map((r) => r.item);
    }, [filterQuery, searchEngine, releases]);

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <audio ref={audioRef} preload="auto" />
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[95%] mx-auto px-4 pb-16">
                <SubHeader title="ZANPAKUTO RESONANCE CALIBRATION" subtitle="SDRI // Gotei 13 Division 12 Audio Testing Laboratory & Live JSON Tuner Bench" />

                <ReleaseFilterBar
                    query={filterQuery}
                    onQueryChange={setFilterQuery}
                    resultCount={filteredReleases.length}
                    totalCount={releases.length}
                />

                <Divider />

                {/* 📋 AUDIO ASSETS WORKBENCH GRID — 2 คอลัมน์ (ไม่มี segments column แบบ song
                    เพราะ release มี technique เดียวต่อ record ไม่ใช่ array ของ segments) */}
                <div className="mt-8 overflow-hidden border border-[#14141a] bg-[#030305]/40">
                    <div className="hidden lg:grid grid-cols-12 gap-4 bg-[#0a0a0f] p-4 border-b border-[#1b1b26] text-[11px] font-bold tracking-[0.15em] text-[#777796] uppercase font-mono">
                        <div className="col-span-4">Release Info // Metadata</div>
                        <div className="col-span-3">Static Database Values</div>
                        <div className="col-span-5">⚓ Live Clip-End Tuning Lab</div>
                    </div>

                    <div className="divide-y divide-[#14141a]/60">
                        {filteredReleases.length === 0 ? (
                            <div className="p-8 text-center text-[11px] font-mono text-[#444452] uppercase tracking-widest">
                                No releases match "{filterQuery}"
                            </div>
                        ) : (
                            filteredReleases.map((release) => {
                                const maxDurationMs = releaseDurations[release.id] || DEFAULT_RELEASE_DURATION_MS;
                                const clipEndMs = getCustomClipEnd(release);
                                const isLivePlaying = playingId === `live-${release.id}`;
                                const isFullPlaying = playingId === `full-${release.id}`;
                                const displayMs = isLivePlaying ? livePositions[release.id] ?? 0 : 0;

                                // ✏️ ค่าปัจจุบันของ 3 ฟิลด์ที่แก้ไขได้ (custom override ถ้ามี, ไม่งั้น fallback ไปค่าใน releases.json)
                                const triggerPhrase = getFieldValue(release, 'trigger_phrase');
                                const techniqueName = getFieldValue(release, 'technique_name');
                                const techniqueTranslation = getFieldValue(release, 'technique_translation');

                                // รวมค่าที่แก้ไขเข้ากับ release เดิม ใช้ทำ JSON preview ใน workbench
                                const mergedRelease: BleachRelease = {
                                    ...release,
                                    trigger_phrase: triggerPhrase,
                                    technique_name: techniqueName,
                                    technique_translation: techniqueTranslation || null,
                                };

                                return (
                                    <div
                                        key={release.id}
                                        className="grid grid-cols-12 gap-4 p-4 items-start hover:bg-[#07070a] transition-colors duration-150"
                                    >
                                        {/* คอลัมน์ที่ 1: ข้อมูลทั่วไปของ release + ฟิลด์ที่แก้ไขได้ */}
                                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-1">
                                            <span className="text-[11px] font-mono font-bold text-[#c8a96e] uppercase tracking-wider">
                                                {release.audio_url}
                                            </span>
                                            <span className="text-[11px] text-[#9090ad] font-mono">
                                                character_id: <span className="text-[#c8a96e]">{release.character_id}</span>
                                            </span>
                                            <span className="text-[11px] text-[#9090ad] font-mono break-all bg-black/40 p-1.5 border border-[#14141a] rounded-sm mt-1">
                                                📁 URL: {release.audio_url}
                                            </span>

                                            <EditableReleaseFields
                                                triggerPhrase={triggerPhrase}
                                                techniqueName={techniqueName}
                                                techniqueTranslation={techniqueTranslation}
                                                onChange={(field, value) => handleFieldChange(release.id, field, value)}
                                            />
                                        </div>

                                        {/* คอลัมน์ที่ 2: ค่าที่มีอยู่ใน DB ตอนนี้ — read only */}
                                        <div className="col-span-12 md:col-span-6 lg:col-span-3">
                                            <StaticReleaseValues release={release} />
                                        </div>

                                        {/* คอลัมน์ที่ 3: ⚓ LIVE CLIP-END TUNING WORKBENCH */}
                                        <LiveTuningWorkbench
                                            release={mergedRelease}
                                            clipEndMs={clipEndMs}
                                            maxDurationMs={maxDurationMs}
                                            isPlaying={isLivePlaying}
                                            isFullPlaying={isFullPlaying}
                                            displayMs={displayMs}
                                            onClipEndChange={(v) =>
                                                setCustomClipEnds((prev) => ({ ...prev, [release.id]: v }))
                                            }
                                            onTogglePlay={() =>
                                                play(release.id, release.audio_url, clipEndMs, `live-${release.id}`)
                                            }
                                            onToggleFullPlay={() =>
                                                play(release.id, release.audio_url, Infinity, `full-${release.id}`)
                                            }
                                            errorMessage={playbackErrors[release.id]}
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