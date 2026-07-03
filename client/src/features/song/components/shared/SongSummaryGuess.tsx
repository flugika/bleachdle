// src/features/song/components/unlimited/SongSummaryGuess.tsx
"use client";

import { useMemo, useState } from 'react';
import { Button } from "@/src/shared/ui/button";
import { CHARACTER_TIERS } from '@/src/const/summary';
import { DailyResetTimer } from '@/src/shared/ui/DailyResetTimer';
import { SongGuessEntry } from '@/src/features/song/types';
import { BleachSong } from '@/src/entities/song/schema';

interface SongSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: SongGuessEntry[];
    target: BleachSong | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats?: { currentStreak: number; maxStreak: number };
}

/**
 * 🎵 เวอร์ชัน song ของ SummaryGuess — ตั้งใจแยกไฟล์ต่างหากแทนการ reuse ตัว character ตรงๆ
 * เพราะ SummaryGuess เดิม hardcode field เฉพาะของ character ไว้ข้างใน (target.race,
 * target.gender, target.height_cm ฯลฯ) ซึ่งไม่มีใน BleachSong เลย เอามาใช้ตรงๆ จะ crash ทันที
 * ส่วนที่ reuse ได้จริง (CHARACTER_TIERS ranking, DailyResetTimer, Button, โครง layout) ยังคงไว้เหมือนเดิม
 */
export const SongSummaryGuess = ({
    isOpen,
    onClose,
    guesses,
    target,
    isWin,
    mode,
    stats = { currentStreak: 0, maxStreak: 0 },
}: SongSummaryGuessProps) => {
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

    if (!isOpen) return null;

    const activeTier = useMemo(() => {
        return CHARACTER_TIERS.find(t => stats.maxStreak >= t.min) || CHARACTER_TIERS[CHARACTER_TIERS.length - 1];
    }, [stats.maxStreak]);

    const cardBgStyle = isWin
        ? "bg-gradient-to-b from-[#281508] via-[#0f0a07] to-[#0a0705] border-[#d47a2a]/45 shadow-[0_0_50px_rgba(212,122,42,0.25)] ring-1 ring-[#d47a2a]/10"
        : "bg-gradient-to-b from-[#0f0e1a] via-[#090912] to-[#05050a] border-[#c8a96e]/30 shadow-[0_0_35px_rgba(200,169,110,0.1)] ring-1 ring-[#c8a96e]/10";

    return (
        <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center mt-6">
            <div className={`w-full p-6 backdrop-blur-md relative overflow-hidden transition-all duration-500 border ${cardBgStyle}`}>

                {/* Background Kanji Watermark — ใช้ tier kanji เหมือนเดิม ไม่ต้องพึ่ง race emblem asset */}
                <div
                    className="absolute right-[-20px] top-[-10px] text-[12rem] font-bold opacity-[0.025] pointer-events-none select-none transition-all duration-500"
                    style={{ color: activeTier.color }}
                >
                    {activeTier.kanji}
                </div>

                {/* Header Title Section */}
                <div className="text-center mb-6 relative z-10">
                    <span className="text-3xl" style={{ color: activeTier.color }}>♪</span>
                    <h2 className="text-2xl font-bold mt-2 tracking-[0.2em] uppercase" style={{ color: isWin ? '#c8a96e' : '#e84d4d' }}>
                        {isWin ? "REISHI KAKUNIN" : "KONPAKU DANZETSU"}
                    </h2>
                    <p className="text-[9px] tracking-[0.3em] uppercase text-[#eed9c4]/30 mt-1">
                        {isWin ? "Melodic Reiatsu Resonance Confirmed" : "Melodic Link Severed"}
                    </p>
                </div>

                {mode === 'daily' && (
                    <DailyResetTimer />
                )}

                {/* Tier Badge Card */}
                <div className="relative p-[1px] my-4 bg-gradient-to-b from-[#c8a96e]/30 to-transparent">
                    <div className="bg-[#0a0a0c] p-5 flex items-center gap-6 overflow-hidden relative shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c8a96e]/30 to-transparent" />
                        <div
                            className="relative flex items-center justify-center shrink-0 w-16 h-16 border border-[#c8a96e]/20 bg-[#0a0a0c] shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                            style={{ borderColor: `${activeTier.color}40` }}
                        >
                            <span className="text-3xl font-light" style={{ color: activeTier.color }}>
                                {activeTier.kanji}
                            </span>
                            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: activeTier.color }} />
                        </div>

                        <div className="flex flex-col gap-1 w-full">
                            <div className="text-[9px] uppercase tracking-[0.3em] text-[#c8a96e]/60 font-medium">
                                Assigned Title
                            </div>
                            <div className="text-xl text-[#f5ebd5] tracking-wide leading-tight">
                                {activeTier.badge}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-4 h-[1px] bg-[#c8a96e]/40" />
                                <div className="text-[10px] font-mono text-[#c8a96e]/50 tracking-wider">
                                    {activeTier.sub}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Song Metadata Block — จุดที่ต่างจาก character (ไม่มี race/gender/height ฯลฯ) */}
                {target && (
                    <div className="relative mb-6 overflow-hidden border border-[#c8a96e]/20 bg-[#06060a] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <div className="relative bg-[#c8a96e]/5 px-4 py-2 border-b border-[#c8a96e]/10 flex items-center justify-between backdrop-blur-[1px]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#c8a96e]/70">
                                {isWin ? "Track Verified" : "Signal Analysis Report"}
                            </p>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse shadow-[0_0_8px_#c8a96e]" />
                        </div>

                        <div className="relative flex flex-col gap-3 p-4">
                            <div>
                                <h2 className="text-xl text-[#f5ebd5] tracking-wide truncate">{target.title}</h2>
                                <p className="text-xs text-[#eed9c4]/50 mt-1">
                                    {target.artist}
                                    {target.album && (
                                        <span className="text-[#c8a96e]/70"> {'//'} {target.album.toUpperCase()}</span>
                                    )}
                                </p>
                            </div>

                            {(target.youtube_url || target.spotify_url) && (
                                <div className="flex gap-2">
                                    {target.youtube_url && (
                                        <a
                                            href={target.youtube_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#fa5252]/30 hover:border-[#fa5252]/70 bg-[#fa5252]/5 hover:bg-[#fa5252]/10 text-[9px] uppercase tracking-[0.15em] text-[#e8807f] hover:text-[#ff9d9d] transition-all duration-200"
                                        >
                                            ▶ YouTube
                                        </a>
                                    )}
                                    {target.spotify_url && (
                                        <a
                                            href={target.spotify_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#4de880]/30 hover:border-[#4de880]/70 bg-[#4de880]/5 hover:bg-[#4de880]/10 text-[9px] uppercase tracking-[0.15em] text-[#8fe8ab] hover:text-[#b5f5cb] transition-all duration-200"
                                        >
                                            ♪ Spotify
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Identification Logs Block */}
                <div className="my-4 border-t border-white/[0.05] pt-4 flex flex-col items-center w-full">
                    <p className="text-[10px] text-[#eed9c4]/30 uppercase tracking-widest mb-1">Identification History</p>
                    <p className="text-2xl font-mono font-bold mb-4 text-[#f5ebd5]">{guesses.length} <span className="text-xs text-[#eed9c4]/30 font-normal">attempts</span></p>

                    {/* Matrix Squares — เพลงมีแค่ correct/wrong เลยเหลือ 1 สี่เหลี่ยมต่อการเดา 1 ครั้ง
                        (ต่างจาก character ที่มีหลาย field ต่อแถว เพราะไม่มี field ย่อยให้ไล่) */}
                    <div className="flex flex-wrap gap-1.5 items-center justify-center mb-4 max-w-[280px]">
                        {guesses.map((guess, i) => (
                            <div
                                key={i}
                                className="w-4 h-4 opacity-75 shadow-sm transition-all hover:opacity-100"
                                style={{ backgroundColor: guess.status === 'correct' ? '#4de880' : '#a64747' }}
                            />
                        ))}
                    </div>

                    {/* Accordion Trigger */}
                    <button
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="flex items-center justify-between w-full border border-[#c8a96e]/15 bg-[#c8a96e]/5 hover:bg-[#c8a96e]/10 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.18em] text-[#c8a96e] transition-all duration-200 select-none"
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse"></span>
                            Melodic Chronicle // View Logs
                        </span>
                        <svg
                            className={`w-3 h-3 text-[#c8a96e] transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Chronicle Storage Logs */}
                    <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${isHistoryExpanded ? 'max-h-[160px] opacity-100 mt-2.5' : 'max-h-0 opacity-0'}`}>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[155px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/10">
                            {[...guesses]
                                .map((entry, i) => ({ entry, originalIndex: i + 1 }))
                                .reverse()
                                .map(({ entry, originalIndex }, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 border border-white/[0.03] bg-black/50 p-1.5 hover:border-[#c8a96e]/30 transition-colors"
                                    >
                                        <span className="font-mono text-[9px] text-[#eed9c4]/30 shrink-0">
                                            #{String(originalIndex).padStart(2, '0')}
                                        </span>
                                        <span
                                            className="w-2 h-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: entry.status === 'correct' ? '#4de880' : '#a64747' }}
                                        />
                                        <span className="text-[10px] font-medium text-[#eed9c4]/80 tracking-wide truncate">
                                            {entry.guess.title}
                                        </span>
                                        <span className="text-[9px] text-[#eed9c4]/30 truncate ml-auto shrink-0">
                                            {entry.guess.artist}
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>

                {/* Narrative Flavor Text Block */}
                <div className="text-center italic text-[#eed9c4]/70 text-xs leading-relaxed px-2 my-5 border-l-2 border-[#c8a96e]/30">
                    "{activeTier.flavor}"
                </div>

                {/* Streak Analytics Grid */}
                <div className="grid grid-cols-2 divide-x divide-white/[0.08] mb-6 border-t border-white/[0.05] pt-4">
                    <div className="flex flex-col items-center">
                        <p className="text-[9px] uppercase text-[#eed9c4]/30 tracking-widest">Current Streaks</p>
                        <p className="text-xl font-mono font-bold mt-0.5 text-[#f5ebd5]">
                            {isWin ? stats.currentStreak : 0}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[9px] uppercase text-[#eed9c4]/30 tracking-widest">Max Streaks</p>
                        <p className="text-xl font-mono font-bold mt-0.5" style={{ color: activeTier.color }}>
                            {stats.maxStreak}
                        </p>
                    </div>
                </div>

                {/* Action Call-To-Action Button */}
                {mode === 'unlimited' && (
                    <Button
                        variant="primary"
                        className={`w-full ${isWin
                            ? "hover:!bg-[#4de880] hover:!border-[#4de880]"
                            : "hover:!bg-[#e84d4d] hover:!border-[#e84d4d]"
                            }`}
                        onClick={onClose}
                    >
                        OPEN SENKAIMON 卍
                    </Button>
                )}
            </div>
        </div>
    );
};