// src/features/song/components/unlimited/SongSummaryGuess.tsx
"use client";

import { DailyResetTimer } from '@/src/shared/ui/summary/DailyResetTimer';
import { SongGuessEntry } from '@/src/features/song/types';
import { BleachSong } from '@/src/entities/song/schema';
import { useSongTier } from '@/src/shared/hooks/useBadgeTier';
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

interface SongSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: SongGuessEntry[];
    target: BleachSong | null;
    scheduledDate?: string | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats: Stats;
}

/**
 * 🎵 เวอร์ชัน song ของ SummaryGuess — ใช้โครง tier-badge / accordion-history
 * ร่วมกับโหมดอื่นผ่าน src/shared/ui/summary แล้ว ส่วนที่ยังคง "ไม่" reuse
 * ตรงๆ กับ character คือบล็อก target reveal (title/artist/album + youtube/
 * spotify link) เพราะ BleachSong ไม่มี field แบบ race/gender/height_cm ที่
 * character ใช้ เอามาต่อกันตรงๆ จะ crash ทันที เลยปล่อยให้เป็น block
 * เฉพาะของ song ต่อไป
 */
export const SongSummaryGuess = ({
    isOpen,
    onClose,
    guesses,
    target,
    scheduledDate,
    isWin,
    mode,
    stats = { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
}: SongSummaryGuessProps) => {
    const activeTier = useSongTier(stats.maxStreak);
    if (!isOpen || !target) return null;

    return (
        <SummaryCardShell isWin={isWin} kanji={activeTier.kanji} kanjiColor={activeTier.color}>
            <SummaryHeader
                icon="♪"
                iconColor={activeTier.color}
                isWin={isWin}
                subtitle={isWin ? "Melodic Reiatsu Resonance Confirmed" : "Melodic Link Severed"}
                subtitleColorClassName="text-[#eed9c4]/50"
            />

            {mode === 'daily' && scheduledDate && (
                <DailyResetTimer targetDate={scheduledDate ?? undefined} />
            )}

            <TierBadgeCard activeTier={activeTier} />

            {/* Target Song Metadata Block — จุดที่ต่างจาก character (ไม่มี race/gender/height ฯลฯ) */}
            {target && (
                <div className="relative mb-6 overflow-hidden border border-[#c8a96e]/20 bg-[#06060a] shadow-[0_0_30px_rgba(0,0,0,0.5)] font-[family-name:var(--font-display)]">
                    {/* Header Bar */}
                    <div className="relative bg-[#c8a96e]/5 px-5 py-2.5 border-b border-[#c8a96e]/10 flex items-center justify-between backdrop-blur-[1px]">
                        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#c8a96e]/70">
                            {isWin ? "Track Verified" : "Signal Analysis Report"}
                        </p>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse shadow-[0_0_10px_#c8a96e]" />
                    </div>

                    {/* Content Area - ปรับเป็น Flex ซ้าย-ขวา บนจอใหญ่ และ บน-ล่าง บนมือถือ */}
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 p-5">

                        {/* Left Section: Track Info */}
                        <div className="flex-1 min-w-0 w-full">
                            <h2 className="text-xl md:text-2xl font-black text-[#f5ebd5] tracking-wide truncate">
                                {target.title}
                            </h2>
                            <div className="flex items-center gap-2 mt-1.5 text-xs md:text-sm text-[#eed9c4]/50 truncate">
                                <span>{target.artist}</span>
                                {target.album && (
                                    <>
                                        <span className="text-[#c8a96e]/60 text-[10px]">///</span>
                                        <span className="text-[#c8a96e]/80 tracking-wider truncate">
                                            {target.album.toUpperCase()}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Right Section: Action Buttons */}
                        {(target.youtube_url || target.spotify_url) && (
                            <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
                                {target.youtube_url && (
                                    <a
                                        href={target.youtube_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-4 py-2 border border-[#fa5252]/30 hover:border-[#fa5252]/70 bg-[#fa5252]/5 hover:bg-[#fa5252]/10 text-[11px] uppercase tracking-[0.15em] text-[#e8807f] hover:text-[#ff9d9d] transition-all duration-300"
                                    >
                                        <span className="text-xs">▶</span> Youtube
                                    </a>
                                )}
                                {target.spotify_url && (
                                    <a
                                        href={target.spotify_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 px-4 py-2 border border-[#4de880]/30 hover:border-[#4de880]/70 bg-[#4de880]/5 hover:bg-[#4de880]/10 text-[11px] uppercase tracking-[0.15em] text-[#8fe8ab] hover:text-[#b5f5cb] transition-all duration-300"
                                    >
                                        <span className="text-xs">♪</span> Spotify
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <IdentificationHistoryPanel
                guessCount={guesses.length}
                chronicleLabel="Melodic Chronicle // View Logs"
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
                            className="flex items-center gap-3 border border-white/[0.02] bg-black/40 p-1.5 hover:border-[#c8a96e]/40 transition-colors group/row"
                        >
                            {/* ลำดับเลข Track บันทึกเสียงที่ถูกต้อง (#01 ถัดไปเป็น #02) */}
                            <span className="font-mono text-[9px] text-[#eed9c4]/40 shrink-0">
                                #{String(originalIndex).padStart(2, '0')}
                            </span>

                            {/* 🎼 Stacked Typography Matrix: จัดระเบียบเนื้อหาให้ Scannability สูงขึ้นตามระเบียบ UX */}
                            <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                <span className="text-[12px] font-bold text-[#eed9c4]/90 tracking-wide truncate">
                                    {entry.guess.title}
                                </span>
                                <span className="text-[10px] text-[#eed9c4]/40 tracking-wider font-mono mt-0.5 truncate">
                                    {entry.guess.artist} <span className='text-[#c8a96e]'>// {entry.guess.album}</span>
                                </span>
                            </div>
                            <span
                                className="w-1.5 h-1.5 rounded-full ml-auto shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                style={{ backgroundColor: entry.status === 'correct' ? '#4de880' : '#a64747' }}
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
                labelColorClassName="text-[#eed9c4]/50"
            />

            <SummaryActionButton mode={mode} isWin={isWin} onClose={onClose} />
        </SummaryCardShell>
    );
};