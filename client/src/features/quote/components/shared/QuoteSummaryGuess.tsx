// src/features/quote/components/shared/QuoteSummaryGuess.tsx
"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from "@/src/shared/ui/button";
import { CHARACTER_TIERS } from '@/src/const/summary';
import { DailyResetTimer } from '@/src/shared/ui/DailyResetTimer';
import { QuoteGuessEntry, QuoteTarget } from '@/src/features/quote/types';
import { QuoteTestimonyDisplay } from './QuoteTestimonyDisplay';
import { useRaceEmblem } from '@/src/shared/hooks/useRaceEmblem';
import { useCharacterTier } from '@/src/shared/hooks/useBadgeTier';

interface QuoteSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: QuoteGuessEntry[];
    target: QuoteTarget | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats?: { currentStreak: number; maxStreak: number };
}

/**
 * 🗨️ Quote's endgame summary — same tier-badge / accordion-history frame as
 * CharacterSummaryGuess, but the "target reveal" block now:
 *   1. Reuses <QuoteTestimonyDisplay> (the Central 46 confidential-testimony
 *      card already used on the question screen) instead of a bespoke
 *      quote-text block, so unsolved and solved states are visibly the same
 *      document — just re-stamped.
 *   2. Gets the same race-emblem watermark glow behind the reveal that
 *      Character mode has, driven by the revealed speaker's race
 *      (target.character comes pre-joined from useQuoteGame).
 */
export const QuoteSummaryGuess = ({
    isOpen,
    onClose,
    guesses,
    target,
    isWin,
    mode,
    stats = { currentStreak: 0, maxStreak: 0 },
}: QuoteSummaryGuessProps) => {
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

    if (!isOpen || !target) return null;

    const answerCharacter = target.character;
    const divider = '━'.repeat(20);

    const activeTier = useCharacterTier(stats.maxStreak);

    // 🔮 Same watermark effect as CharacterSummaryGuess, driven by the
    // revealed speaker's race instead of the guessed target directly.
    const emblem = useMemo(() => useRaceEmblem(answerCharacter), [answerCharacter]);

    const cardBgStyle = isWin
        ? "bg-gradient-to-b from-[#281508] via-[#0f0a07] to-[#0a0705] border-[#d47a2a]/45 shadow-[0_0_50px_rgba(212,122,42,0.25)] ring-1 ring-[#d47a2a]/10"
        : "bg-gradient-to-b from-[#0f0e1a] via-[#090912] to-[#05050a] border-[#c8a96e]/50 shadow-[0_0_37px_rgba(200,169,110,0.1)] ring-1 ring-[#c8a96e]/10";

    const hasMeta = target.episode != null || target.chapter != null || target.arc || target.context;

    return (
        <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center mt-6">
            <div className={`w-full p-6 backdrop-blur-md relative overflow-hidden transition-all duration-500 border ${cardBgStyle}`}>

                {/* Background Kanji Watermark */}
                <div
                    className="absolute right-[-20px] top-[-14px] text-[12rem] font-bold opacity-[0.025] pointer-events-none select-none transition-all duration-500"
                    style={{ color: activeTier.color }}
                >
                    {activeTier.kanji}
                </div>

                {/* Header Title Section */}
                <div className="text-center mb-6 relative z-10">
                    <span className="text-3xl" style={{ color: activeTier.color }}>❝</span>
                    <h2 className="text-2xl font-bold mt-2 tracking-[0.2em] uppercase" style={{ color: isWin ? '#c8a96e' : '#e84d4d' }}>
                        {isWin ? "REISHI KAKUNIN" : "KONPAKU DANZETSU"}
                    </h2>
                    <p className="text-[11px] tracking-[0.3em] uppercase text-[#ebc7c7]/50 mt-1">
                        {isWin ? "Testimony Traced to Registered Speaker" : "Testimony Left Unattributed"}
                    </p>
                </div>

                {mode === 'daily' && (
                    <DailyResetTimer />
                )}

                {/* Tier Badge Card */}
                <div className="relative p-[1px] my-4 bg-gradient-to-b from-[#c8a96e]/50 to-transparent">
                    <div className="bg-[#0a0a0c] p-5 flex items-center gap-6 overflow-hidden relative shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c8a96e]/50 to-transparent" />
                        <div
                            className="relative flex items-center justify-center shrink-0 w-16 h-16 border border-[#c8a96e]/20 bg-[#0a0a0c] shadow-[0_0_17px_rgba(0,0,0,0.5)]"
                            style={{ borderColor: `${activeTier.color}40` }}
                        >
                            <span className="text-3xl font-light" style={{ color: activeTier.color }}>
                                {activeTier.kanji}
                            </span>
                            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: activeTier.color }} />
                        </div>

                        <div className="flex flex-col gap-1 w-full">
                            <div className="text-[11px] uppercase tracking-[0.3em] text-[#c8a96e]/60 font-medium">
                                Assigned Title
                            </div>
                            <div className="text-xl text-[#f5ebd5] tracking-wide leading-tight">
                                {activeTier.badge}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-4 h-[1px] bg-[#c8a96e]/40" />
                                <div className="text-[12px] font-mono text-[#c8a96e]/50 tracking-wider">
                                    {activeTier.sub}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🏛️ Testimony reveal — the SAME Central 46 document card from the
                    question screen, now solved. Race-emblem watermark glows behind it,
                    ported from CharacterSummaryGuess's reveal block. */}
                <div className="relative mb-2">
                    {emblem && (
                        <div className="absolute -right-14 -top-14 w-64 h-64 pointer-events-none select-none z-0 transform rotate-[16deg] scale-110 transition-all duration-700">
                            <div className="relative w-full h-full opacity-10 mix-blend-screen">
                                <Image
                                    src={`/assets/emblems/${emblem.file}`}
                                    alt="Soul Race Emblem"
                                    fill
                                    className="object-contain"
                                    priority={false}
                                />
                            </div>
                            <div
                                className="absolute inset-0 blur-[80px] rounded-full opacity-[0.12] mix-blend-screen pointer-events-none"
                                style={{ backgroundColor: emblem.color }}
                            />
                        </div>
                    )}
                    <div className="relative z-10">
                        {/* isSolved is always true here: by the time the summary shows,
                           the game is over — win or lose — so the speaker is revealed either way. */}
                        <QuoteTestimonyDisplay target={target} isSolved={isWin} speakerName={answerCharacter?.name} />
                    </div>
                </div>

                {/* Target Character Metadata Block — same wrapper as CharacterSummaryGuess:
                    bordered dossier card with its own emblem watermark layer + header bar.
                    Only the bottom grid differs: quote mode shows scene metadata
                    (episode/chapter/arc/context) instead of physical stats. */}
                {answerCharacter && (
                    <div className="relative mb-6 overflow-hidden border border-[#c8a96e]/20 bg-[#06060a] shadow-[0_0_30px_rgba(0,0,0,0.5)]">

                        {/* LAYER 0: race-emblem watermark, same treatment as Character mode */}
                        {emblem && (
                            <div className="absolute -right-14 -top-14 w-64 h-64 pointer-events-none select-none z-0 transform rotate-[16deg] scale-110 transition-all duration-700">
                                <div className="relative w-full h-full opacity-10 mix-blend-screen">
                                    <Image
                                        src={`/assets/emblems/${emblem.file}`}
                                        alt="Soul Race Emblem"
                                        fill
                                        className="object-contain"
                                        priority={false}
                                    />
                                </div>
                                <div
                                    className="absolute inset-0 blur-[80px] rounded-full opacity-[0.12] mix-blend-screen pointer-events-none"
                                    style={{ backgroundColor: emblem.color }}
                                />
                            </div>
                        )}

                        {/* LAYER 10: content, sits above the watermark */}
                        <div className="relative z-10 pointer-events-auto">

                            {/* Header: Soul Identity Report */}
                            <div className="relative bg-[#c8a96e]/5 px-4 py-2 border-b border-[#c8a96e]/10 flex items-center justify-between backdrop-blur-[1px]">
                                <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-[#c8a96e]/70">
                                    {isWin ? "Identity Verified" : "Data Analysis Report"}
                                </p>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse shadow-[0_0_10px_#c8a96e] pointer-events-none" />
                            </div>

                            {/* Character image + tags */}
                            <div className="relative flex items-start gap-4 p-4">
                                <div className="relative h-20 w-20 shrink-0 border border-[#c8a96e]/20 p-[1px] bg-black/40 z-10">
                                    <Image
                                        src={`/assets/characters/${answerCharacter.image}`}
                                        alt={answerCharacter.name}
                                        fill
                                        className="object-cover grayscale-[10%] brightness-[95%]"
                                    />
                                </div>
                                <div className="flex flex-col text-left overflow-hidden pt-1 z-10">
                                    <h2 className="text-xl text-[#f5ebd5] tracking-wide truncate">{answerCharacter.name}</h2>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {answerCharacter.gender && (
                                            <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">
                                                {answerCharacter.gender}
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">
                                            {answerCharacter.race.join(' / ')}
                                        </span>
                                        <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">
                                            {answerCharacter.affiliation}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Scene metadata grid — quote's equivalent of Character's stats grid */}
                            {hasMeta && (
                                <div className="grid grid-cols-2 gap-[1px] bg-[#c8a96e]/10 border-t border-[#c8a96e]/10">
                                    {target.episode != null && (
                                        <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 hover:bg-[#c8a96e]/5 transition-colors">
                                            <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Episode</span>
                                            <span className="text-[11px] text-[#eed9c4]/90 font-medium truncate">{target.episode}</span>
                                        </div>
                                    )}
                                    {target.chapter != null && (
                                        <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 hover:bg-[#c8a96e]/5 transition-colors">
                                            <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Chapter</span>
                                            <span className="text-[11px] text-[#eed9c4]/90 font-medium truncate">{target.chapter}</span>
                                        </div>
                                    )}
                                    {target.arc && (
                                        <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 col-span-2 hover:bg-[#c8a96e]/5 transition-colors">
                                            <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Arc</span>
                                            <span className="text-[11px] text-[#eed9c4]/90 font-medium truncate">{target.arc}</span>
                                        </div>
                                    )}
                                    {target.context && (
                                        <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 col-span-2 hover:bg-[#c8a96e]/5 transition-colors">
                                            <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Context</span>
                                            <span className="text-[11px] text-[#eed9c4]/90 leading-relaxed">{target.context}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Identification Logs Block */}
                <div className="my-4 border-t border-white/[0.05] pt-4 flex flex-col items-center w-full">
                    <p className="text-[12px] text-[#ebc7c7]/50 uppercase tracking-widest mb-1">Identification History</p>
                    <p className="text-2xl font-mono font-bold mb-4 text-[#f5ebd5]">{guesses.length} <span className="text-xs text-[#ebc7c7]/50 font-normal">attempts</span></p>

                    {/* Matrix Squares — quote has only correct/wrong, so one square per guess */}
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
                        className="flex items-center justify-between w-full border border-[#c8a96e]/15 bg-[#c8a96e]/5 hover:bg-[#c8a96e]/10 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#c8a96e] transition-all duration-200 select-none"
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse"></span>
                            Voice Chronicle // View Logs
                        </span>
                        <svg
                            className={`w-3 h-3 text-[#c8a96e] transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Chronicle Storage Logs */}
                    <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${isHistoryExpanded ? 'max-h-[140px] opacity-100 mt-2.5' : 'max-h-0 opacity-0'}`}>
                        <div className="grid grid-cols-2 gap-1.5 max-h-[137px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/10">
                            {[...guesses].map((entry, i) => {
                                const originalIndex = guesses.length - i;

                                return (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 border border-white/[0.03] bg-black/50 p-1.5 hover:border-[#c8a96e]/50 transition-colors"
                                    >
                                        <span className="font-mono text-[11px] text-[#ebc7c7]/50 shrink-0">
                                            #{String(originalIndex).padStart(2, '0')}
                                        </span>
                                        <div className='relative w-7 h-7 shrink-0'>
                                            <Image
                                                src={`/assets/characters/${entry.guess.image}`}
                                                alt={entry.guess.name}
                                                fill
                                                sizes="210px"
                                                className="border border-white/5 object-cover bg-neutral-900"
                                            />
                                        </div>
                                        <span className="text-[12px] font-medium text-[#ebc7c7]/80 tracking-wide truncate">
                                            {entry.guess.name}
                                        </span>
                                        <span
                                            className="w-1.5 h-1.5 rounded-full ml-auto shrink-0"
                                            style={{ backgroundColor: entry.status === 'correct' ? '#4de880' : '#a64747' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Narrative Flavor Text Block */}
                <div className="text-center italic text-[#ebc7c7]/70 text-xs leading-relaxed px-2 my-5 border-l-2 border-[#c8a96e]/50">
                    "{activeTier.flavor}"
                </div>

                {/* Streak Analytics Grid */}
                <div className="grid grid-cols-2 divide-x divide-white/[0.08] mb-6 border-t border-white/[0.05] pt-4">
                    <div className="flex flex-col items-center">
                        <p className="text-[11px] uppercase text-[#ebc7c7]/50 tracking-widest">Current Streaks</p>
                        <p className="text-xl font-mono font-bold mt-0.5 text-[#f5ebd5]">
                            {isWin ? stats.currentStreak : 0}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[11px] uppercase text-[#ebc7c7]/50 tracking-widest">Max Streaks</p>
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