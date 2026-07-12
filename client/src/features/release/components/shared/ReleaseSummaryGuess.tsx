// src/features/release/components/shared/ReleaseSummaryGuess.tsx
'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { DailyResetTimer } from '@/src/shared/ui/DailyResetTimer';
import { BleachRelease } from '@/src/entities/release/schema';
import { ReleaseGuessEntry } from '@/src/features/release/types';
import { Stats } from '@/src/lib/guessGame/types';
import { ReleaseTestimonyDisplay } from './ReleaseTestimonyDisplay';
import { attachReleaseCharacter } from '@/src/features/release/release';
import { useRaceEmblem } from '@/src/shared/hooks/useRaceEmblem';
import { useCharacterTier } from '@/src/shared/hooks/useBadgeTier';
import { FactoryReleaseTarget } from '@/src/features/release/types';
import {
    SummaryCardShell,
    SummaryHeader,
    TierBadgeCard,
    NarrativeFlavorText,
    StreakStatsGrid,
    SummaryActionButton,
    IdentificationHistoryPanel,
} from '@/src/shared/ui/summary';

interface ReleaseSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: ReleaseGuessEntry[];
    target: FactoryReleaseTarget | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats: Stats;
}

// Local gold accent used by the image-fallback initial tile below (kept inline to avoid
// pulling in ReleaseTestimonyDisplay's private T theme object)
const T_GOLD = '#c9a45e';

/**
 * 🩹 LAYOUT FIX: การ์ดนี้เดิม port มาจาก QuoteSummaryGuess.tsx ซึ่งถูกออกแบบให้อยู่ใน
 * <Modal> (max-w-md, centered dialog) แต่หน้าจริง (page.tsx) render แบบ inline section
 * แทนที่ ReleaseGuessTable ตอนจบเกม ไม่ใช่ dialog ลอยทับจอ — เลยดูเหมือนกล่องแคบๆ
 * ลอยกลางหน้าที่กว้างกว่ามาก (page ใช้ max-w-[80%], ReleaseTestimonyDisplay/
 * ReleaseGuessTable ใช้ max-w-2xl) จึงขยายจาก max-w-md → max-w-xl (ค่า default ของ
 * SummaryCardShell) ให้ตรงกับ component พี่น้องตัวอื่นบนหน้าเดียวกัน
 */
export const ReleaseSummaryGuess = ({
    isOpen,
    onClose,
    guesses,
    target,
    isWin,
    mode,
    stats = { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
}: ReleaseSummaryGuessProps) => {
    if (!isOpen || !target) return null;

    const answerCharacter = target?.character;

    const activeTier = useCharacterTier(stats.maxStreak);

    const emblem = useMemo(() => useRaceEmblem(answerCharacter), [answerCharacter]);

    const hasMeta = target.source_episode != null;

    return (
        <SummaryCardShell
            kanji={activeTier.kanji}
            kanjiColor={activeTier.color}
            isWin={isWin}
        >
            <SummaryHeader
                icon="۞"
                iconColor={activeTier.color}
                isWin={isWin}
                subtitle={isWin ? "Release Traced to Registered Technique" : "Release Remains Unclassified"}
            />

            {mode === 'daily' && <DailyResetTimer />}

            <TierBadgeCard activeTier={activeTier} />

            {/* 🏛️ Testimony reveal — การ์ดใบรับรองใบเดียวกับหน้าคำถาม (Central 46) แค่ประทับตราซ้ำ */}
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
                    {/* isSolved เป็น true เสมอตรงนี้: ถึงตอนที่ summary โผล่มา เกมจบแล้วไม่ว่าแพ้ชนะ
                       เจ้าของท่าถูกเฉลยทั้งคู่ */}
                    <ReleaseTestimonyDisplay
                        target={target}
                        isSolved={isWin}
                        speakerName={answerCharacter?.name}
                        characterImage={answerCharacter?.image ? `/assets/characters/${answerCharacter.image}` : null}
                    />
                </div>
            </div>

            {/* Target Character Metadata Block */}
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
                                {isWin ? "Wielder Verified" : "Data Analysis Report"}
                            </p>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse shadow-[0_0_10px_#c8a96e] pointer-events-none" />
                        </div>

                        <div className="relative flex items-start gap-4 p-4">
                            {/* 🩹 IMAGE FIX: fallback to an initial-letter tile instead of an empty black
                                box when answerCharacter.image is missing/empty for a given character record */}
                            <div className="relative h-20 w-20 shrink-0 border border-[#c8a96e]/20 p-[1px] bg-black/40 z-10">
                                {answerCharacter.image ? (
                                    <Image
                                        src={`/assets/characters/${answerCharacter.image}`}
                                        alt={answerCharacter.name}
                                        fill
                                        className="object-cover grayscale-[10%] brightness-[95%]"
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center text-2xl font-bold"
                                        style={{ color: T_GOLD }}
                                    >
                                        {answerCharacter.name?.[0] ?? '?'}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col text-left overflow-hidden pt-1 z-10">
                                <h2 className="text-xl text-[#f5ebd5] tracking-wide truncate">{answerCharacter.name}</h2>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono uppercase">
                                        {target.release_type}
                                    </span>
                                    {answerCharacter && (
                                        <>
                                            <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">
                                                {answerCharacter.race.length > 1 ? "Hybrid" : answerCharacter.race}
                                            </span>
                                            <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">
                                                {answerCharacter.affiliation}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {hasMeta && (
                            <div className="grid grid-cols-2 gap-[1px] bg-[#c8a96e]/10 border-t border-[#c8a96e]/10">
                                <div className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 col-span-2 hover:bg-[#c8a96e]/5 transition-colors">
                                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">Source Episode</span>
                                    <span className="text-[11px] text-[#eed9c4]/90 font-medium truncate">{target.source_episode}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <IdentificationHistoryPanel
                guessCount={guesses.length}
                chronicleLabel="Ward Chronicle // View Logs"
                expandedMaxHeightClassName="max-h-[160px]"
                innerMaxHeightClassName="max-h-[157px]"
                matrix={guesses.map((guess, i) => (
                    <div
                        key={i}
                        className="w-4 h-4 opacity-75 shadow-sm transition-all hover:opacity-100"
                        style={{ backgroundColor: guess.status === 'correct' ? '#4de880' : '#a64747' }}
                    />
                ))}
                logRows={[...guesses].map((entry, i) => {
                    const originalIndex = guesses.length - i;
                    // 🩹 FIX: entry.guess เป็น BleachRelease ดิบ ไม่มี field `character` —
                    // ต้อง resolve ผ่าน attachReleaseCharacter() เหมือนใน ReleaseGuessTable
                    const guessCharacter = attachReleaseCharacter(entry.guess)?.character;
                    return (
                        <div
                            key={i}
                            className="flex items-center gap-2 border border-white/[0.03] bg-black/50 p-1.5 hover:border-[#c8a96e]/50 transition-colors"
                        >
                            <span className="font-mono text-[11px] text-[#ebc7c7]/50 shrink-0">
                                #{String(originalIndex).padStart(2, '0')}
                            </span>
                            {guessCharacter?.image && (
                                <div className='relative w-7 h-7 shrink-0'>
                                    <Image
                                        src={`/assets/characters/${guessCharacter.image}`}
                                        alt={guessCharacter.name}
                                        fill
                                        sizes="210px"
                                        className="border border-white/5 object-cover bg-neutral-900"
                                    />
                                </div>
                            )}
                            <div className="min-w-0 truncate">
                                <span className="text-[12px] font-medium text-[#ebc7c7]/80 tracking-wide truncate block flex items-center">
                                    {entry.guess.technique_name}<span className="text-[10px] text-[#c8a96e]/50 tracking-wide truncate block pl-1"> // {entry.guess.release_type}</span>
                                </span>
                                {guessCharacter?.name && (
                                    <span className="text-[10px] text-[#c8a96e]/50 tracking-wide truncate block">
                                        {guessCharacter.name}
                                    </span>
                                )}
                            </div>
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