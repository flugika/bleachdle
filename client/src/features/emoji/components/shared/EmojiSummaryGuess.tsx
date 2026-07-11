// src/features/emoji/components/shared/EmojiSummaryGuess.tsx
"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import { DailyResetTimer } from '@/src/shared/ui/DailyResetTimer';
import { EmojiGuessEntry, EmojiTarget } from '@/src/features/emoji/types';
import { EmojiTestimonyDisplay } from './EmojiTestimonyDisplay';
import { useRaceEmblem } from '@/src/shared/hooks/useRaceEmblem';
import { useCharacterTier } from '@/src/shared/hooks/useBadgeTier';
import {
    SummaryCardShell,
    SummaryHeader,
    TierBadgeCard,
    NarrativeFlavorText,
    StreakStatsGrid,
    SummaryActionButton,
    IdentificationHistoryPanel,
} from '@/src/shared/ui/summary';

interface EmojiSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: EmojiGuessEntry[];
    target: EmojiTarget | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats?: { currentStreak: number; maxStreak: number };
}

/**
 * 🧩 Emoji's endgame summary — same shared tier-badge / accordion-history
 * frame as QuoteSummaryGuess. The "target reveal" block reuses
 * <EmojiTestimonyDisplay> (the Central 46 confidential-symbol dossier
 * already used on the question screen) so unsolved and solved states are
 * visibly the same document — just re-stamped with every emoji unsealed.
 */
export const EmojiSummaryGuess = ({
    isOpen,
    onClose,
    guesses,
    target,
    isWin,
    mode,
    stats = { currentStreak: 0, maxStreak: 0 },
}: EmojiSummaryGuessProps) => {
    if (!isOpen || !target) return null;

    const answerCharacter = target.character;

    const activeTier = useCharacterTier(stats.maxStreak);

    // 🔮 Same watermark effect as QuoteSummaryGuess, driven by the revealed
    // speaker's race instead of the guessed target directly.
    const emblem = useMemo(() => useRaceEmblem(answerCharacter), [answerCharacter]);

    return (
        <SummaryCardShell isWin={isWin} kanji={activeTier.kanji} kanjiColor={activeTier.color}>
            <SummaryHeader
                icon="❖"
                iconColor={activeTier.color}
                isWin={isWin}
                subtitle={isWin ? "Symbol Set Traced to Registered Soul" : "Symbol Set Left Unattributed"}
            />

            {mode === 'daily' && <DailyResetTimer />}

            <TierBadgeCard activeTier={activeTier} />

            {/* 🏛️ Symbol dossier reveal — the SAME Central 46 document card from
                the question screen, now fully unsealed. Race-emblem watermark
                glows behind it, ported from QuoteSummaryGuess's reveal block. */}
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
                       the game is over — win or lose — so every emoji is unsealed. */}
                    <EmojiTestimonyDisplay
                        target={target}
                        revealedCount={target.emoji_list.length}
                        isSolved={isWin}
                        speakerName={answerCharacter?.name}
                    />
                </div>
            </div>

            {/* Target Character Identity Block — same wrapper as QuoteSummaryGuess,
                minus the scene-metadata grid (emoji sets carry no episode/chapter/arc). */}
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
                    </div>
                </div>
            )}

            <IdentificationHistoryPanel
                guessCount={guesses.length}
                chronicleLabel="Symbol Chronicle // View Logs"
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