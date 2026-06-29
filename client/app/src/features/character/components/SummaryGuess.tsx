import { useState, useMemo } from 'react';
import { Button } from "@/src/shared/ui/button";
import { MatchResult } from "../types";
import Image from 'next/image';
import { TIERS, STATUS_COLORS, RESULT_KEYS } from '@/src/const/summary';

export const SummaryGuess = ({ isOpen, onClose, guesses, target, isWin, stats = { currentStreak: 0, maxStreak: 0 } }: any) => {
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

    if (!isOpen) return null;

    const activeTier = useMemo(() => {
        // ใช้ maxStreak ยิงตรงเพื่อหายศตำแหน่งได้เลย ไม่ต้องสนว่าสถานะเกมตอนนี้เป็นอย่างไร
        return TIERS.find(t => stats.maxStreak >= t.min) || TIERS[TIERS.length - 1];
    }, [stats.maxStreak]); // เหลือ Dependency แค่ตัวเดียว คลีน ๆ

    // 🎨 แก้ไขดีไซน์พื้นหลัง: เปลี่ยนจากสีส้มโคลนทึบ เป็นการไล่เฉดดาร์กไซเบอร์ลึกลับ ออร่าแอมเบอร์ฟุ้งกระจายจากด้านบนลงล่าง
    const cardBgStyle = isWin
        ? "bg-gradient-to-b from-[#281508] via-[#0f0a07] to-[#0a0705] border-[#d47a2a]/45 shadow-[0_0_50px_rgba(212,122,42,0.25)] ring-1 ring-[#d47a2a]/10"
        : "bg-gradient-to-b from-[#0f0e1a] via-[#090912] to-[#05050a] border-[#c8a96e]/30 shadow-[0_0_35px_rgba(200,169,110,0.1)] ring-1 ring-[#c8a96e]/10";

    return (
        <div className="w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center mt-6">
            <div className={`w-full p-6 backdrop-blur-md relative overflow-hidden rounded-sm transition-all duration-500 border ${cardBgStyle}`}>

                {/* Background Kanji Watermark */}
                <div
                    className="absolute right-[-20px] top-[-10px] text-[12rem] font-bold opacity-[0.025] pointer-events-none select-none font-serif transition-all duration-500"
                    style={{ color: activeTier.color }}
                >
                    {activeTier.kanji}
                </div>

                {/* Header Title Section */}
                <div className="text-center mb-6 relative z-10">
                    <span className="text-3xl" style={{ color: activeTier.color }}>卍</span>
                    <h2 className="text-2xl font-bold mt-2 tracking-[0.2em] uppercase font-serif" style={{ color: isWin ? '#c8a96e' : '#e84d4d' }}>
                        {isWin ? "MISSION ACCOMPLISHED" : "MISSION FAILED"}
                    </h2>
                    <p className="text-[9px] tracking-[0.3em] uppercase text-[#eed9c4]/30 mt-1">
                        {isWin ? "Reiatsu Identity Decrypted" : "Target Evaded Detection Signature"}
                    </p>
                </div>

                {/* Assigned Title Badge */}
                <div className={`mb-6 p-4 rounded flex items-center gap-4 relative overflow-hidden border transition-all duration-500 ${activeTier.badgeStyles}`}>

                    {/* Box สัญลักษณ์คันจิยศหน่วยพิทักษ์ */}
                    <div
                        className={`w-12 h-12 flex items-center justify-center text-2xl font-bold border rounded-[2px] bg-black/40 shrink-0 select-none shadow-inner transition-all duration-500 ${activeTier.kanjiStyles}`}
                        style={{ color: activeTier.color }}
                    >
                        {activeTier.kanji}
                    </div>

                    {/* ข้อความกำกับตำแหน่งและยศวิญญาณ */}
                    <div className="flex flex-col text-left overflow-hidden">
                        <div className="text-[10px] uppercase tracking-widest text-[#eed9c4]/30">Assigned Title</div>
                        <div className="text-sm font-bold tracking-wide truncate transition-colors duration-500" style={{ color: activeTier.color }}>
                            {activeTier.badge}
                        </div>
                        <div className="text-[9px] text-[#eed9c4]/50 font-mono mt-0.5 truncate">
                            {activeTier.sub}
                        </div>
                    </div>
                </div>

                {/* Target Character Metadata Block */}
                {target && (
                    <div className="mb-6 overflow-hidden rounded-[2px] border border-[#c8a96e]/15 bg-[#06060a] shadow-xl">
                        <div className="bg-[#c8a96e]/5 px-3 py-1.5 text-center border-b border-[#c8a96e]/15">
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#c8a96e]/80">
                                {isWin ? "THE SOUL IDENTIFIED" : "DEFEAT - SOUL ANALYSIS REPORT"}
                            </p>
                        </div>

                        <div className="relative flex items-center gap-3 p-3">
                            <div className='relative h-16 w-16 shrink-0'>
                                <Image
                                    src={`/assets/characters/${target.image}`}
                                    alt={target.name}
                                    fill
                                    sizes="64px"
                                    className="rounded-[1px] border border-[#c8a96e]/20 object-cover grayscale-[20%] brightness-[90%]"
                                />
                            </div>

                            <div className="flex flex-col text-left overflow-hidden">
                                <h2 className="text-md font-bold text-[#c8a96e] truncate">{target.name}</h2>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="bg-[#c8a96e]/5 px-1.5 py-0.5 text-[9px] text-[#eed9c4]/70 border border-white/[0.03] rounded-[1px]">{target.race.join(', ')}</span>
                                    <span className="bg-[#c8a96e]/5 px-1.5 py-0.5 text-[9px] text-[#eed9c4]/70 border border-white/[0.03] rounded-[1px]">{target.affiliation}</span>
                                </div>
                            </div>
                        </div>

                        {!isWin && (
                            <div className="grid grid-cols-2 gap-[1px] bg-[#c8a96e]/10 border-t border-[#c8a96e]/10">
                                <div className="bg-[#0a0a0f] p-2 text-[9px] text-[#eed9c4]/40 uppercase">ARC: <span className="text-[#eed9c4]/80 normal-case ml-1">{target.firstAppearanceChapter}</span></div>
                                <div className="bg-[#0a0a0f] p-2 text-[9px] text-[#eed9c4]/40 uppercase">WEAPON: <span className="text-[#eed9c4]/80 normal-case ml-1">{target.weapon.join(', ')}</span></div>
                                <div className="bg-[#0a0a0f] p-2 text-[9px] text-[#eed9c4]/40 uppercase">ABILITY: <span className="text-[#eed9c4]/80 normal-case ml-1">{target.primaryAbility.join(', ')}</span></div>
                                <div className="bg-[#0a0a0f] p-2 text-[9px] text-[#eed9c4]/40 uppercase">RELEASE: <span className="text-[#eed9c4]/80 normal-case ml-1">{target.release.join(', ')}</span></div>
                            </div>
                        )}
                    </div>
                )}

                {/* Identification Logs Block */}
                <div className="my-6 border-t border-white/[0.05] pt-4 flex flex-col items-center w-full">
                    <p className="text-[10px] text-[#eed9c4]/30 uppercase tracking-widest mb-1">Identification History</p>
                    {/* 🥚 แก้ไขจุดที่ 1: เปลี่ยนสีขาวจ้าของ Attempts เป็นสีนวลตาละมุนรับกับพื้นหลัง */}
                    <p className="text-2xl font-mono font-bold mb-4 text-[#f5ebd5]">{guesses.length} <span className="text-xs text-[#eed9c4]/30 font-sans font-normal">attempts</span></p>

                    {/* Matrix Squares */}
                    <div className="flex flex-col gap-1.5 items-center mb-4">
                        {guesses.map((guess: any, i: number) => (
                            <div key={i} className="flex gap-1">
                                {RESULT_KEYS.map((key) => {
                                    const status = guess.result[key] as MatchResult;
                                    const bgColor = STATUS_COLORS[status] || '#3a2828';
                                    return (
                                        <div
                                            key={key}
                                            className="w-4 h-4 rounded-[1px] opacity-75 shadow-sm transition-all hover:opacity-100"
                                            style={{ backgroundColor: bgColor }}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Accordion Trigger */}
                    <button
                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        className="flex items-center justify-between w-full border border-[#c8a96e]/15 bg-[#c8a96e]/5 hover:bg-[#c8a96e]/10 px-3 py-2 rounded-[2px] text-[9px] font-mono uppercase tracking-[0.18em] text-[#c8a96e] transition-all duration-200 select-none"
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse"></span>
                            Reiatsu Chronicle // View Logs
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
                        <div className="grid grid-cols-2 gap-1.5 max-h-[135px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/10">
                            {[...guesses]
                                .map((entry, i) => ({ entry, originalIndex: i + 1 }))
                                .reverse()
                                .map(({ entry, originalIndex }, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 border border-white/[0.03] bg-black/50 p-1.5 rounded-[2px] hover:border-[#c8a96e]/30 transition-colors"
                                    >
                                        <span className="font-mono text-[9px] text-[#eed9c4]/30 shrink-0">
                                            #{String(originalIndex).padStart(2, '0')}
                                        </span>
                                        <div className='relative w-7 h-7 shrink-0'>
                                            <Image
                                                src={`/assets/characters/${entry.guess.image}`}
                                                alt={entry.guess.name}
                                                fill
                                                sizes="28px"
                                                className="rounded-[1px] border border-white/5 object-cover bg-neutral-900"
                                            />
                                        </div>
                                        <span className="text-[10px] font-medium text-[#eed9c4]/80 tracking-wide truncate">
                                            {entry.guess.name}
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
                        {/* 🥚 แก้ไขจุดที่ 2: ดรอปสีขาวจ้าของตัวเลขสตรีคลงเป็นสีกระดาษนวล ให้จังหวะสายตาเบาลงอย่างพรีเมียม */}
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
                {/* ⚔️ แก้ไขจุดที่ 3: ปุ่มควบคุมความสว่างตอน Hover ไม่ให้สว่างวาบขาวจ้าจนตาพร่า โดยการใช้ขอบส้มแอมเบอร์เรืองแสงและเพิ่มเงาหลืบแทน */}
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
            </div>
        </div>
    );
};