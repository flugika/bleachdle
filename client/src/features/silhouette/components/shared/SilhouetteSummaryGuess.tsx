"use client";

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/src/shared/ui/button";
import { CHARACTER_TIERS } from '@/src/const/summary';
import { DailyResetTimer } from '@/src/shared/ui/DailyResetTimer';
import { SilhouetteGuessEntry, SilhouetteTarget } from '@/src/features/silhouette/types';
import { SilhouetteImage } from './SilhouetteImage';

interface SilhouetteSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: SilhouetteGuessEntry[];
    target: SilhouetteTarget | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats?: { currentStreak: number; maxStreak: number };
}

export const SilhouetteSummaryGuess = ({
    isOpen,
    onClose,
    guesses,
    target,
    isWin,
    mode,
    stats = { currentStreak: 0, maxStreak: 0 }
}: SilhouetteSummaryGuessProps) => {
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

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
    const activeTier = useMemo(() => {
        return CHARACTER_TIERS.find(t => stats.maxStreak >= t.min) || CHARACTER_TIERS[CHARACTER_TIERS.length - 1];
    }, [stats.maxStreak]);

    if (!isOpen || !target) return null;

    const answerCharacter = target.character;

    // การกำหนดค่า Color Scheme ประจำผลลัพธ์
    const cardBgStyle = isWin
        ? "bg-gradient-to-b from-[#1c1107] via-[#090604] to-[#040302] border-[#d47a2a]/40 shadow-[0_0_60px_rgba(212,122,42,0.18)] ring-1 ring-[#d47a2a]/10"
        : "bg-gradient-to-b from-[#0a0a12] via-[#040408] to-[#020204] border-[#c8a96e]/30 shadow-[0_0_40px_rgba(200,169,110,0.08)] ring-1 ring-[#c8a96e]/5";

    return (
        <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center mt-6">
            {/* 🎴 MAIN DOSSIER CONTAINER PANEL */}
            <div className={`w-full p-6 backdrop-blur-md relative overflow-hidden border ${cardBgStyle} transition-all duration-500`}>

                {/* 🏯 Background Heavy Kanji Watermark (ซ่อนหลังเลเยอร์ข้อความอย่างแนบเนียน) */}
                <div
                    className="absolute right-[-25px] top-[-10px] text-[13rem] font-black opacity-[0.018] pointer-events-none select-none transition-all duration-500"
                    style={{ color: activeTier.color }}
                >
                    {activeTier.kanji}
                </div>

                {/* Header Title Section: สัญลักษณ์ประจุวิญญาณกระพริบ */}
                <div className="text-center mb-5 relative z-10">
                    <div className="flex justify-center mb-1">
                        <span className="text-3xl text-[#53535a]">❄</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-[0.25em] uppercase" style={{ color: isWin ? '#c8a96e' : '#e84d4d' }}>
                        {isWin ? "REISHI KAKUNIN" : "KONPAKU DANZETSU"}
                    </h2>
                    <p className="text-[9px] tracking-[0.22em] uppercase text-[#ebc7c7]/40 mt-1 font-mono">
                        {isWin ? "VISUAL SPECTRUM TRACED SUCCESSFULLY" : "TARGET IDENTITY DISRUPTED"}
                    </p>
                </div>

                {mode === 'daily' && <DailyResetTimer />}

                {/* 🎖️ Assigned Title Badge Card (ตามโครงสร้างดีไซน์จากภาพต้นแบบ) */}
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

                {/* ❝ 👁️ REISHI QUOTE CONTAINER WITH RADAR FLICKER MATRIX ❞ */}
                <div className="mb-4 relative z-10 group">
                    {/* เอฟเฟกต์แสงออร่าสะท้อนเรดาร์ด้านหลัง */}
                    <div className="absolute -inset-1.5 bg-gradient-to-b from-[#c8a96e]/10 to-transparent opacity-30 blur-xl transition-all duration-700" />

                    {/* โครงสร้าง Quote Frame ห่อหุ้มเครื่องสแกนตัวละคร */}
                    <div className="relative border border-[#272420]/70 p-1.5 bg-[#030305]/95 shadow-[0_0_30px_rgba(0,0,0,0.7)]">
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
                                characterId={target.character_id}
                                image={target.image}
                                realImage={answerCharacter?.image}
                                guessCount={guesses.length}
                                forceReveal={isRadarRevealed}
                            />
                        </div>
                    </div>
                </div>

                {/* บล็อกจัดแสดงแถบรายชื่อตัวละครเป้าหมาย (สไตล์แฟ้มประวัติความลับสูงสุด) */}
                {answerCharacter && (
                    <div className="text-center mb-5 bg-gradient-to-b from-black/60 to-black/30 border border-white/[0.03] p-3 rounded-xs relative z-10 shadow-md">
                        <h3 className="text-lg font-bold text-[#eedcc5] uppercase tracking-[0.15em]">
                            {answerCharacter.name}
                        </h3>
                        <div className="flex justify-center gap-1.5 mt-2 text-[9px] font-mono">
                            <span className="px-2 py-0.5 bg-[#c8a96e]/5 border border-[#c8a96e]/15 text-[#c8a96e]/80">
                                {answerCharacter.affiliation}
                            </span>
                            <span className="px-2 py-0.5 bg-[#c8a96e]/5 border border-[#c8a96e]/15 text-[#c8a96e]/80">
                                {answerCharacter.race.join(' / ')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Identification History Logs & Blocks Section */}
                <div className="my-4 border-t border-white/[0.04] pt-4 flex flex-col items-center w-full relative z-10">
                    <p className="text-[10px] text-[#ebc7c7]/40 uppercase tracking-[0.2em] mb-1 font-mono">
                        Identification Logs
                    </p>
                    <p className="text-2xl font-mono font-bold mb-4 text-[#f5ebd5]">
                        {guesses.length} <span className="text-xs text-[#ebc7c7]/40 font-normal">attempts</span>
                    </p>

                    {/* ตารางแสดงบล็อกแถบสีบันทึกผลลัพธ์การคาดเดา */}
                    <div className="flex flex-wrap gap-1.5 items-center justify-center mb-4 max-w-[280px]">
                        {guesses.map((guess, i) => (
                            <div
                                key={i}
                                className="w-3.5 h-3.5 opacity-80 shadow-inner border border-black/40 transition-all hover:opacity-100"
                                style={{ backgroundColor: guess.status === 'correct' ? '#3ecb73' : '#a64747' }}
                            />
                        ))}
                    </div>

                    {/* ปุ่มกดเปิดประวัติแบบพับเก็บสไตล์แฟ้มรายงานหน่วยวิจัยศิลา */}
                    <button
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="flex items-center justify-between w-full border border-[#c8a96e]/15 bg-[#c8a96e]/4 hover:bg-[#c8a96e]/8 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.15em] text-[#c8a96e] transition-all duration-200 select-none rounded-xs"
                    >
                        <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse" />
                            Visual Chronicle // View History
                        </span>
                        <svg
                            className={`w-3 h-3 text-[#c8a96e] transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* รายละเอียดการขยายประวัติการสแกนวิญญาน */}
                    <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${isHistoryExpanded ? 'max-h-[140px] opacity-100 mt-2.5' : 'max-h-0 opacity-0'}`}>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[137px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/10">
                            {[...guesses].map((entry, i) => {
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
                                            <img
                                                src={`/assets/characters/${entry.guess.image}`}
                                                alt={entry.guess.name}
                                                className="w-full h-full object-cover filter brightness-[90%] contrast-[105%]"
                                                draggable={false}
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
                        </div>
                    </div>
                </div>

                {/* 📜 Premium Quote Border Left Box: คำโปรย/คำคมอิงตามยศที่ทำได้ */}
                <div className="text-center italic text-[#ebc7c7]/70 text-xs leading-relaxed px-4 my-5 border-l-2 border-[#c8a96e]/40 relative z-10">
                    "{activeTier.flavor}"
                </div>

                {/* Streak Analytics Grid (แบ่งส่วนข้อมูลระดับสากล) */}
                <div className="grid grid-cols-2 divide-x divide-white/[0.06] mb-5 border-t border-white/[0.04] pt-4 relative z-10">
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] uppercase text-[#ebc7c7]/40 tracking-[0.18em] font-mono">Current Streak</p>
                        <p className="text-xl font-mono font-bold mt-0.5 text-[#f5ebd5]">
                            {isWin ? stats.currentStreak : 0}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[10px] uppercase text-[#ebc7c7]/40 tracking-[0.18em] font-mono">Max Streak</p>
                        <p className="text-xl font-mono font-bold mt-0.5" style={{ color: activeTier.color }}>
                            {stats.maxStreak}
                        </p>
                    </div>
                </div>

                {/* Action CTA Button */}
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