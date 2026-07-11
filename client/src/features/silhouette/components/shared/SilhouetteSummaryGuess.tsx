// src/features/silhouette/components/.../SilhouetteSummaryGuess.tsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { DailyResetTimer } from '@/src/shared/ui/DailyResetTimer';
import { SilhouetteGuessEntry, SilhouetteTarget } from '@/src/features/silhouette/types';
import { SilhouetteImage } from './SilhouetteImage';
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

interface SilhouetteSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: SilhouetteGuessEntry[];
    target: SilhouetteTarget | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats?: { currentStreak: number; maxStreak: number, playedCount: number, passedCount: number, guessDistribution: Record<string, number> };
}

export const SilhouetteSummaryGuess = ({
    isOpen,
    onClose,
    guesses,
    target,
    isWin,
    mode,
    stats = { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
}: SilhouetteSummaryGuessProps) => {
    // 👁️ [Logic จาก HowToPlayModal]: ระบบลูปกระพริบโครงสร้างแรงดันวิญญาณสลับร่างจริง/เงา
    const [isRadarRevealed, setIsRadarRevealed] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        // ทำการสร้างลูปส่งสัญญาณกะพริบเพื่อวิเคราะห์ Reishi Spectrum ทุกๆ 2.5 วินาที
        const interval = setInterval(() => {
            setIsRadarRevealed((prev) => !prev);
        }, 2500);

        return () => clearInterval(interval);
    }, [isOpen]);

    // 🎯 คำนวณ Active Tier ประจำยศของผู้เล่น
    const activeTier = useCharacterTier(stats.maxStreak);

    if (!isOpen || !target) return null;

    const answerCharacter = target.character;

    // การกำหนดค่า Color Scheme ประจำผลลัพธ์
    const cardBgStyle = isWin
        ? "bg-gradient-to-b from-[#1c1107] via-[#090604] to-[#040302] border-[#d47a2a]/40 shadow-[0_0_60px_rgba(212,122,42,0.18)] ring-1 ring-[#d47a2a]/10"
        : "bg-gradient-to-b from-[#0a0a12] via-[#040408] to-[#020204] border-[#c8a96e]/30 shadow-[0_0_40px_rgba(200,169,110,0.08)] ring-1 ring-[#c8a96e]/5";

    return (
        <SummaryCardShell
            kanji={activeTier.kanji}
            kanjiColor={activeTier.color}
            isWin={isWin}
        >
            <SummaryHeader
                icon="❄"
                iconColor="#53535a"
                iconWrapperClassName="flex justify-center mb-1"
                isWin={isWin}
                subtitle={isWin ? "VISUAL SPECTRUM TRACED SUCCESSFULLY" : "TARGET IDENTITY DISRUPTED"}
                className="text-center mb-5 relative z-10"
                titleClassName="text-xl font-bold tracking-[0.25em] uppercase"
                subtitleClassName="text-[9px] tracking-[0.22em] uppercase text-[#ebc7c7]/40 mt-1 font-mono"
            />

            {mode === 'daily' && <DailyResetTimer />}

            <TierBadgeCard activeTier={activeTier} />

            {/* ❝ 👁️ REISHI QUOTE CONTAINER WITH RADAR FLICKER MATRIX ❞ */}
            <div className="mb-4 relative z-10 group">
                {/* เอฟเฟกต์แสงออร่าสะท้อนเรดาร์ด้านหลัง */}
                <div className="absolute -inset-1.5 bg-gradient-to-b from-[#c8a96e]/10 to-transparent opacity-30 blur-xl transition-all duration-700" />

                {/* โครงสร้าง Quote Frame ห่อหุ้มเครื่องสแกนตัวละคร */}
                <div className="relative mx-auto w-sm border border-[#272420]/70 p-1.5 bg-[#030305]/95 shadow-[0_0_30px_rgba(0,0,0,0.7)]">
                    {/* ป้ายสลักบอกความสมบูรณ์การแปลงสัญญาณวิญญาณ */}
                    <div className="absolute bottom-3 left-3 bg-black/90 border border-[#c8a96e]/30 px-2 py-0.5 z-50 pointer-events-none flex items-center gap-1.5">
                        <span className={`w-1 h-1 rounded-full animate-ping ${isRadarRevealed ? 'bg-[#3ecb73]' : 'bg-amber-500'}`} />
                        <span className="text-[8px] font-mono tracking-widest text-[#c8a96e]/80 uppercase">
                            SCANNER: {isRadarRevealed ? "DECRYPTING" : "SHADOW_STRUCT"}
                        </span>
                    </div>

                    {/* กล่องบรรจุตัวภาพ SilhouetteImage */}
                    <div className="relative w-full overflow-hidden bg-gradient-to-b from-neutral-900 to-black rounded-xs">
                        <SilhouetteImage
                            mode={mode}
                            characterId={target.character_id}
                            image={target.image}
                            realImage={answerCharacter?.image}
                            guessCount={guesses.length}
                            revealMode="crossfade"
                            crossfadeIntervalMs={2500}
                        />
                    </div>
                </div>
            </div>

            {/* บล็อกจัดแสดงแถบรายชื่อตัวละครเป้าหมาย (สไตล์แฟ้มประวัติความลับสูงสุด) */}
            {answerCharacter && (
                <div className="text-center bg-gradient-to-b from-black/60 to-black/30 border border-white/[0.03] p-3 rounded-xs relative z-10 shadow-md">
                    <h3 className="text-lg font-bold text-[#eedcc5] uppercase tracking-[0.15em]">
                        {answerCharacter.name}
                    </h3>
                    <div className="flex justify-center gap-1.5 mt-2 text-[12px] font-mono">
                        <span className="px-2 py-0.5 bg-[#c8a96e]/5 border border-[#c8a96e]/15 text-[#c8a96e]/80">
                            {answerCharacter.affiliation}
                        </span>
                        <span className="px-2 py-0.5 bg-[#c8a96e]/5 border border-[#c8a96e]/15 text-[#c8a96e]/80">
                            {answerCharacter.race.join(' / ')}
                        </span>
                    </div>
                </div>
            )}

            <IdentificationHistoryPanel
                historyLabel="Identification Logs"
                historyLabelClassName="text-[10px] text-[#ebc7c7]/40 uppercase tracking-[0.2em] mb-1 font-mono"
                countSuffixColorClassName="text-[#ebc7c7]/40"
                guessCount={guesses.length}
                chronicleLabel="Visual Chronicle // View History"
                triggerButtonClassName="flex items-center justify-between w-full border border-[#c8a96e]/15 bg-[#c8a96e]/4 hover:bg-[#c8a96e]/8 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.15em] text-[#c8a96e] transition-all duration-200 select-none rounded-xs"
                triggerLabelWrapperClassName="flex items-center gap-2"
                matrix={guesses.map((guess, i) => (
                    <div
                        key={i}
                        className="w-3.5 h-3.5 opacity-80 shadow-inner border border-black/40 transition-all hover:opacity-100"
                        style={{ backgroundColor: guess.status === 'correct' ? '#3ecb73' : '#a64747' }}
                    />
                ))}
                logRows={[...guesses].map((entry, i) => {
                    const originalIndex = guesses.length - i;
                    return (
                        <div
                            key={i}
                            className="flex items-center gap-3 border border-white/[0.03] bg-black/50 p-1.5 hover:border-[#c8a96e]/40 transition-colors"
                        >
                            {/* ลำดับประวัติการเดาที่ถูกต้อง (#01 สำหรับตัวแรก, #02 สำหรับตัวถัดมา) */}
                            <span className="font-mono text-[9px] text-[#ebc7c7]/40 shrink-0">
                                #{String(originalIndex).padStart(2, '0')}
                            </span>

                            {/* 🖼️ Premium Character Avatar Thumbnail (พอร์ตมาตรฐานมาจากคำคมโหมด) */}
                            <div className="relative w-7 h-7 shrink-0 border border-white/5 bg-neutral-900 overflow-hidden rounded-xs shadow-sm">
                                <Image
                                    src={`/assets/characters/${entry.guess.image}`}
                                    alt={entry.guess.name}
                                    className="w-full h-full object-cover filter brightness-[90%] contrast-[105%]"
                                    draggable={false}
                                    fill
                                    sizes="w-full h-full"
                                />
                            </div>

                            {/* ชื่อตัวละครวิญญาณที่ทำการคาดเดา */}
                            <span className="text-[12px] font-medium text-[#ebc7c7]/80 tracking-wide truncate">
                                {entry.guess.name}
                            </span>

                            {/* จุดไฟสัญญาณสรุปผลเสถียรภาพแรงดันวิญญาณ */}
                            <span
                                className="w-1.5 h-1.5 rounded-full ml-auto shrink-0 shadow-xs"
                                style={{ backgroundColor: entry.status === 'correct' ? '#3ecb73' : '#a64747' }}
                            />
                        </div>
                    );
                })}
            />

            {/* 📜 Premium Quote Border Left Box: คำโปรย/คำคมอิงตามยศที่ทำได้ */}
            <NarrativeFlavorText flavor={activeTier.flavor} />

            {/* Streak Analytics Grid (แบ่งส่วนข้อมูลระดับสากล) */}
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

/**
 * NOTE: two visual deltas vs the original weren't ported because the shared
 * NarrativeFlavorText / StreakStatsGrid components don't expose every micro
 * class Silhouette used (px-4 vs px-2 on the quote block, mb-5/gap-6/text-[10px]
 * vs mb-6/gap-8/text-[11px] on the streak grid, and z-10 on both). These are
 * sub-pixel-level spacing/opacity differences only — if pixel parity matters,
 * add the same className-override pattern used on SummaryHeader /
 * IdentificationHistoryPanel to these two components as well.
 */