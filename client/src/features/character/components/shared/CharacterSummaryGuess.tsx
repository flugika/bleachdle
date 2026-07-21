// src/features/character/components/.../CharacterSummaryGuess.tsx
"use client";

import Image from 'next/image';
import { DailyCharacterResponse, GuessEntry, MatchResult } from "../../types";
import { STATUS_COLORS, RESULT_KEYS } from '@/src/const/summary';
import { useCharacterTier } from '@/src/shared/hooks/useBadgeTier';
import { DailyResetTimer } from '@/src/shared/ui/summary/DailyResetTimer';
import {
    SummaryCardShell,
    SummaryHeader,
    TierBadgeCard,
    NarrativeFlavorText,
    StreakStatsGrid,
    SummaryActionButton,
    IdentificationHistoryPanel,
} from '@/src/shared/ui/summary';
import { formatAge, formatHeight } from '@/src/lib/utils/format';
import { Stats } from '@/src/lib/guessGame/types';
import { getCharacterById } from '../../character';
import { useRaceEmblem } from '@/src/shared/hooks/useRaceEmblem';

interface CharacterSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: GuessEntry[];
    target: DailyCharacterResponse;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats: Stats;
}

export const CharacterSummaryGuess = ({ isOpen, onClose, guesses, target, isWin, mode, stats = { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} }, }: CharacterSummaryGuessProps) => {
    const answerCharacter = getCharacterById(target.id);

    const activeTier = useCharacterTier(stats.maxStreak);

    const emblem = useRaceEmblem(answerCharacter);

    if (!isOpen || !answerCharacter) return null;

    return (
        <SummaryCardShell isWin={isWin} kanji={activeTier.kanji} kanjiColor={activeTier.color}>
            <SummaryHeader
                icon="卍"
                iconColor={activeTier.color}
                isWin={isWin}
                subtitle={isWin ? "Reishi Signature Resonance Confirmed" : "Konpaku Link Severed"}
                subtitleColorClassName="text-[#eed9c4]/50"
            />

            {mode === 'daily' && target.scheduledDate && (
                <DailyResetTimer targetDate={target.scheduledDate} />
            )}

            <TierBadgeCard activeTier={activeTier} />

            {/* Target reveal + emblem watermark + stats grid unchanged from the
                original — omitted here for brevity, this section is unique to
                Character mode (race/height/age/eyes/hair/debut/weapon/ability/
                release stat grid) and isn't shared with any other mode. */}
            {answerCharacter && (
                <div className="relative mb-6 overflow-hidden border border-[#c8a96e]/20 bg-[#06060a] shadow-[0_0_30px_rgba(0,0,0,0.5)]">

                    {/* ⛩️ LAYER 0: ตราสัญลักษณ์ (ย้ายมาไว้บนสุดของ Root, จัดตำแหน่งไว้บนขวา และอยู่ใต้ข้อความด้วย z-0) */}
                    {emblem && (
                        <div className="absolute -right-14 -top-14 w-64 h-64 pointer-events-none select-none z-0 transform rotate-[16deg] scale-110 transition-all duration-700">
                            {/* ปรับค่า opacity ลงมาเล็กน้อย (เช่น 0.25 - 0.4) เพื่อให้ทำหน้าที่เป็นลายน้ำ Watermark ที่สวยงาม ไม่แย่งสายตาข้อความ */}
                            <div className="relative w-full h-full opacity-10 mix-blend-screen">
                                <Image
                                    src={`/assets/emblems/${emblem.file}`}
                                    alt="Soul Race Emblem"
                                    fill
                                    className="object-contain"
                                    priority={false}
                                />
                            </div>
                            {/* TYBW Reiatsu Glow: ออร่าแรงดันวิญญาณฟุ้งๆ ด้านหลัง */}
                            <div
                                className="absolute inset-0 blur-[80px] rounded-full opacity-[0.12] mix-blend-screen pointer-events-none"
                                style={{ backgroundColor: emblem.color }}
                            />
                        </div>
                    )}

                    {/* 👑 LAYER 10: กล่องคอนเทนต์ข้อความทั้งหมด (ทับอยู่เหนือตราสัญลักษณ์อย่างสมบูรณ์) */}
                    <div className="relative z-10 pointer-events-auto">

                        {/* Header: Soul Identity Report (จะทับตราสัญลักษณ์ด้านหลังแน่นอน) */}
                        <div className="relative bg-[#c8a96e]/5 px-4 py-2 border-b border-[#c8a96e]/10 flex items-center justify-between backdrop-blur-[1px]">
                            <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-[#c8a96e]/70 font-[family-name:var(--font-display)]">
                                {isWin ? "Identity Verified" : "Data Analysis Report"}
                            </p>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse shadow-[0_0_10px_#c8a96e] pointer-events-none" />
                        </div>

                        {/* กล่องข้อมูลตัวละครตรงกลาง */}
                        <div className="relative flex items-start gap-4 p-4">
                            {/* Character Image */}
                            <div className='relative h-20 w-20 shrink-0 border border-[#c8a96e]/20 p-[1px] bg-black/40 z-10'>
                                <Image
                                    src={`/api/asset/character/${answerCharacter.id}`}
                                    alt={answerCharacter.name}
                                    fill
                                    className="object-cover grayscale-[10%] brightness-[95%]"
                                />
                            </div>

                            {/* Info Section */}
                            <div className="flex flex-col text-left overflow-hidden pt-1 z-10">
                                <h2 className="text-xl text-[#f5ebd5] tracking-wide font-black truncate font-[family-name:var(--font-display)]">{answerCharacter.name}</h2>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">{answerCharacter.gender}</span>
                                    <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">{answerCharacter.race.length > 1 ? "Hybrid" : answerCharacter.race}</span>
                                    <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">{answerCharacter.affiliation}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid (Central 46 Style) */}
                        <div className="grid grid-cols-2 gap-[1px] bg-[#c8a96e]/10 border-t border-[#c8a96e]/10">
                            {[
                                { label: 'Height', value: formatHeight(answerCharacter.height_cm) },
                                { label: 'Age', value: formatAge(answerCharacter.age) },
                                { label: 'Eyes', value: answerCharacter.eye_color },
                                { label: 'Hair', value: answerCharacter.hair_color },
                                { label: 'Debut', value: answerCharacter.first_appearance_chapter },
                                { label: 'Weapon', value: answerCharacter.weapon.join(', ') },
                                { label: 'Ability', value: answerCharacter.primary_ability.join(', ') },
                                { label: 'Release', value: answerCharacter.release.join(', ') },
                            ].map((stat, i) => (
                                <div key={i} className="bg-[#0a0a0f]/90 p-3 flex flex-col gap-0.5 hover:bg-[#c8a96e]/5 transition-colors">
                                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#c8a96e]/70 font-bold">{stat.label}</span>
                                    <span className="text-[11px] text-[#eed9c4]/90 font-medium truncate">{stat.value}</span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            )}

            <IdentificationHistoryPanel
                guessCount={guesses.length}
                chronicleLabel="Reiatsu Chronicle // View Logs"
                matrix={guesses.map((guess: GuessEntry, i: number) => (
                    <div key={i} className="flex gap-1">
                        {RESULT_KEYS.map((key) => {
                            const status = guess.result[key] as MatchResult;
                            const bgColor = STATUS_COLORS[status] || '#3a2828';
                            return (
                                <div
                                    key={key}
                                    className="w-4 h-4 opacity-75 shadow-sm transition-all hover:opacity-100"
                                    style={{ backgroundColor: bgColor }}
                                />
                            );
                        })}
                    </div>
                ))}
                logRows={[...guesses].map((entry, i) => {
                    const originalIndex = guesses.length - i;
                    const isCorrect = entry.result && Object.entries(entry.result).every(([key, value]) => {
                        if (key === 'image') return true;
                        return value === 'correct';
                    });

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
                                style={{ backgroundColor: isCorrect ? '#4de880' : '#a64747' }}
                            />
                        </div>
                    );
                })}
            />

            <NarrativeFlavorText flavor={activeTier.flavor} textColorClassName="text-[#eed9c4]/70" />

            <StreakStatsGrid
                isWin={isWin}
                currentStreak={stats.currentStreak}
                maxStreak={stats.maxStreak}
                tierColor={activeTier.color}
                labelColorClassName="text-[#eed9c4]/70"
            />

            <SummaryActionButton mode={mode} isWin={isWin} onClose={onClose} />
        </SummaryCardShell>
    );
};

/**
 * NOTE: the target-reveal dossier block (image, name/gender/race/affiliation
 * tags, and the 9-cell stat grid: Height/Age/Eyes/Hair/Debut/Weapon/Ability/
 * Release) was intentionally left untouched and un-abstracted — it's the one
 * block that's genuinely unique to Character mode (no other game has this
 * exact stat shape), so forcing it into a shared component would just add
 * indirection without removing duplication. Paste it back in from the
 * original file right after <TierBadgeCard />.
 */