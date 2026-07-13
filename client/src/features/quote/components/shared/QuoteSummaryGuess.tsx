// src/features/quote/components/shared/QuoteSummaryGuess.tsx
"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import { QuoteGuessEntry, QuoteTargetHidden } from '@/src/features/quote/types';
import { getQuoteById } from '@/src/features/quote/quote';
import { QuoteTestimonyDisplay } from './QuoteTestimonyDisplay';
import { useRaceEmblem } from '@/src/shared/hooks/useRaceEmblem';
import { useCharacterTier } from '@/src/shared/hooks/useBadgeTier';
import { DailyResetTimer } from '@/src/shared/ui/DailyResetTimer';
import {
    SummaryCardShell,
    SummaryHeader,
    TierBadgeCard,
    NarrativeFlavorText,
    StreakStatsGrid,
    SummaryActionButton,
    IdentificationHistoryPanel,
} from '@/src/shared/ui/summary';
import { Stats } from '@/src/lib/guessGame/types';
import { Character } from '@/src/entities/character/schema';

interface QuoteSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: QuoteGuessEntry[];
    target: QuoteTargetHidden | null;
    revealedCharacter: Character | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats: Stats;
}

/**
 * 🗨️ Quote's endgame summary — same tier-badge / accordion-history frame
 * (now shared via src/shared/ui/summary) as the other guess modes. The
 * "target reveal" block is still Quote-specific:
 *   1. Reuses <QuoteTestimonyDisplay> (the Central 46 confidential-testimony
 *      card already used on the question screen) instead of a bespoke
 *      quote-text block, so unsolved and solved states are visibly the same
 *      document — just re-stamped.
 *   2. Gets the race-emblem watermark glow behind the reveal, driven by the
 *      revealed speaker's race (target.character comes pre-joined from
 *      useQuoteGame).
 *
 * 🔒 target (QuoteTargetHidden) ตอนนี้มีแค่ id/text/character_id — episode/
 * chapter/arc/context ไม่ได้แนบมาด้วยแล้ว (กันสปอยล์ก่อนเกมจบ) ถึงตรงนี้เกมจบแล้ว
 * เลย lookup เอกสารเต็มจาก quotes.json ตรงๆ ผ่าน getQuoteById(target.id) แทน
 */
export const QuoteSummaryGuess = ({
    isOpen,
    onClose,
    guesses,
    target,
    revealedCharacter,
    isWin,
    mode,
    stats = { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
}: QuoteSummaryGuessProps) => {
    if (!isOpen || !target) return null;

    const answerCharacter = revealedCharacter;

    // 🔓 เกมจบแล้ว โหลดเอกสาร quote เต็ม (episode/chapter/arc/context) มาโชว์ได้เต็มที่
    const fullQuote = useMemo(() => getQuoteById(target.id), [target.id]);

    const activeTier = useCharacterTier(stats.maxStreak);

    // 🔮 Watermark effect driven by the revealed speaker's race.
    const emblem = useMemo(() => useRaceEmblem(answerCharacter), [answerCharacter]);

    const cardBgStyle = isWin
        ? "bg-gradient-to-b from-[#281508] via-[#0f0a07] to-[#0a0705] border-[#d47a2a]/45 shadow-[0_0_50px_rgba(212,122,42,0.25)] ring-1 ring-[#d47a2a]/10"
        : "bg-gradient-to-b from-[#0f0e1a] via-[#090912] to-[#05050a] border-[#c8a96e]/50 shadow-[0_0_37px_rgba(200,169,110,0.1)] ring-1 ring-[#c8a96e]/10";

    const hasMeta = fullQuote?.episode != null || fullQuote?.chapter != null || fullQuote?.arc || fullQuote?.context;

    return (
        <SummaryCardShell isWin={isWin} kanji={activeTier.kanji} kanjiColor={activeTier.color}>
            <SummaryHeader
                icon="❝"
                iconColor={activeTier.color}
                isWin={isWin}
                subtitle={isWin ? "Testimony Traced to Registered Speaker" : "Testimony Left Unattributed"}
            />

            {mode === 'daily' && <DailyResetTimer />}

            <TierBadgeCard activeTier={activeTier} />

            {/* 🏛️ Testimony reveal — the SAME Central 46 document card from the
                question screen, now solved. Race-emblem watermark glows behind it. */}
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

            {/* Target Character Metadata Block — bordered dossier card with its
                own emblem watermark layer + header bar. Only the bottom grid
                differs from Character mode: quote shows scene metadata
                (episode/chapter/arc/context) instead of physical stats. */}
            {answerCharacter && (
                <div className="relative mb-6 overflow-hidden border border-[#c8a96e]/20 bg-[#06060a] shadow-[0_0_30px_rgba(0,0,0,0.5)]">

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

                    <div className="relative z-10 pointer-events-auto">
                        <div className="relative bg-[#c8a96e]/5 px-4 py-2 border-b border-[#c8a96e]/10 flex items-center justify-between backdrop-blur-[1px]">
                            <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-[#c8a96e]/70">
                                {isWin ? "Identity Verified" : "Data Analysis Report"}
                            </p>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse shadow-[0_0_10px_#c8a96e] pointer-events-none" />
                        </div>

                        <div className="relative flex items-start gap-4 p-4">
                            <div className="relative h-20 w-20 shrink-0 border border-[#c8a96e]/20 p-[1px] bg-black/40 z-10">
                                <Image
                                    src={`/api/asset/character/${answerCharacter.id}`}
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
                                        {answerCharacter.race.length > 1 ? "Hybrid" : answerCharacter.race}
                                    </span>
                                    <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">
                                        {answerCharacter.affiliation}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {hasMeta && (
                            <div className="grid grid-cols-2 gap-[1px] bg-[#c8a96e]/10 border-t border-[#c8a96e]/10">
                                {fullQuote?.episode != null && (
                                    <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 hover:bg-[#c8a96e]/5 transition-colors">
                                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Episode</span>
                                        <span className="text-[11px] text-[#eed9c4]/90 font-medium truncate">{fullQuote.episode}</span>
                                    </div>
                                )}
                                {fullQuote?.chapter != null && (
                                    <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 hover:bg-[#c8a96e]/5 transition-colors">
                                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Chapter</span>
                                        <span className="text-[11px] text-[#eed9c4]/90 font-medium truncate">{fullQuote.chapter}</span>
                                    </div>
                                )}
                                {fullQuote?.arc && (
                                    <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 col-span-2 hover:bg-[#c8a96e]/5 transition-colors">
                                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Arc</span>
                                        <span className="text-[11px] text-[#eed9c4]/90 font-medium truncate">{fullQuote.arc}</span>
                                    </div>
                                )}
                                {fullQuote?.context && (
                                    <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 col-span-2 hover:bg-[#c8a96e]/5 transition-colors">
                                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Context</span>
                                        <span className="text-[11px] text-[#eed9c4]/90 leading-relaxed">{fullQuote.context}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <IdentificationHistoryPanel
                guessCount={guesses.length}
                chronicleLabel="Voice Chronicle // View Logs"
                matrix={guesses.map((guess, i) => (
                    <div
                        key={i}
                        className="w-4 h-4 opacity-75 shadow-sm transition-all hover:opacity-100"
                        style={{ backgroundColor: guess.status === 'correct' ? '#4de880' : '#a64747' }}
                    />
                ))}
                logRows={[...guesses].map((entry, i) => {
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
                                    src={`/api/asset/character/${entry.guess.id}`}
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
            />

            <NarrativeFlavorText flavor={activeTier.flavor} />

            <StreakStatsGrid
                isWin={isWin}
                currentStreak={stats.currentStreak}
                maxStreak={stats.maxStreak}
                tierColor={activeTier.color}
            />

            <SummaryActionButton mode={mode} isWin={isWin} onClose={onClose} />
        </SummaryCardShell>
    );
};