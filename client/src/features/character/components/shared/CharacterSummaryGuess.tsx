import { useState, useMemo } from 'react';
import { Button } from "@/src/shared/ui/button";
import { MatchResult } from "../../types";
import Image from 'next/image';
import { CHARACTER_TIERS, STATUS_COLORS, RESULT_KEYS } from '@/src/const/summary';
import { formatAge, formatHeight } from '@/src/lib/utils/format';
import { useCountdown } from '@/src/shared/hooks/useCountdown';
import { DailyResetTimer } from '@/src/shared/ui/DailyResetTimer';
import { useCharacterTier } from '@/src/shared/hooks/useBadgeTier';

// 🗺️ 1. TYBW LORE LOOKUP DICTIONARY (ทำหน้าที่เป็น Whitelist & อัปเดตชื่อไฟล์จริง)
const EMBLEM_DATA: Record<string, { file: string; color: string }> = {
    // ⚔️ Shinigami — พลังวิญญาณสีขาวเงินบริสุทธิ์ของเทพมรณะ Gotei 13
    "shinigami": { file: "shinigami.webp", color: "#f8fafc" },

    // ❄️ Quincy — พลังไรสึสีฟ้าเย็นยะเยือกแบบไฮเทค ของเผ่านักธนูปราบวิญญาณ
    "quincy": { file: "quincy.webp", color: "#00d2ff" },

    // 🩸 Arrancar — ฮอลโลว์ที่ก้าวข้ามขีดจำกัดจนได้พลังชินิงามิ สีแดงเซโร่/เลือด
    "arrancar": { file: "arrancar.webp", color: "#ff2a2a" },

    // 👹 Hollow ทั่วไป (ยังไม่กลายเป็น Arrancar) — ยืมภาพ Arrancar มาใช้ก่อน (ยังไม่มีภาพเฉพาะ)
    // แต่แยกด้วยโทนม่วงเข้ม สื่อถึงความมืด/สัญชาตญาณดิบ ต่างจากแดงเซโร่ของ Arrancar
    "hollow": { file: "arrancar.webp", color: "#9333ea" },

    // 🍃 Fullbringer — พลังฟูลบริงสีเขียวจากวิญญาณที่ผูกพันตั้งแต่กำเนิด (กลุ่ม Xcution)
    "fullbringer": { file: "Xcution.webp", color: "#10b981" },

    // 🦁 Mod Soul — วิญญาณเทียมดัดแปลง สีส้มทองสดใสแบบคอน
    "mod soul": { file: "mod_soul.webp", color: "#f59e0b" },

    // 🔥 Substitute Shinigami — สถานะเฉพาะของอิจิโกะ/กินโจ ไฟแรงดันวิญญาณสีส้มเพลิง
    "substitute shinigami": { file: "daiko_shinigami.webp", color: "#ff8a00" },

    // 🎭 Visored — ชินิงามิที่ครองพลังฮอลโลว์ สีชมพูเข้ม/กุหลาบ ผสมขาว-แดง
    "visored": { file: "visored.webp", color: "#e11d48" },

    // 👤 Human — มนุษย์ธรรมดา ไร้พลังวิญญาณพิเศษ สีเทาอ่อนกลางๆ
    "human": { file: "soul.webp", color: "#94a3b8" },

    // 👻 Soul (Plus) — วิญญาณเร่ร่อนที่ยังไม่ถูกส่งไปโซลโซไซตี้ สีฟ้าหลอนอ่อนแบบผี
    "soul": { file: "soul.webp", color: "#7dd3fc" },

    // ❔ Unknown — ตัวตนไม่ปรากฏชัด สีเทาหม่นอมม่วง สื่อถึงความคลุมเครือ/ปริศนา
    "unknown": { file: "soul.webp", color: "#52525b" },
};


export const CharacterSummaryGuess = ({ isOpen, onClose, guesses, target, isWin, mode, stats = { currentStreak: 0, maxStreak: 0 } }: any) => {
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const timeLeft = useCountdown();

    if (!isOpen) return null;

    const activeTier = useCharacterTier(stats.maxStreak);

    // 🗺️ เพิ่ม whitelist ตัวละครที่เป็น Substitute Shinigami โดยตำแหน่งจริงตาม Lore
    // (ไม่ใช้ race มาตัดสิน เพราะ race data ของทั้งคู่จะโอเวอร์แลปกับ Human/Shinigami/Hollow ปกติ)
    const SUBSTITUTE_SHINIGAMI_NAMES = ["Ichigo Kurosaki", "Kugo Ginjo"];

    const emblem = useMemo(() => {
        if (!target) return null;

        // 🥇 PRIORITY 0: เช็คชื่อก่อนเป็นอันดับแรก เพราะ Substitute Shinigami
        // เป็นสถานะเฉพาะตัวที่ race field เพียงอย่างเดียวแยกแยะไม่ได้
        if (SUBSTITUTE_SHINIGAMI_NAMES.includes(target.name)) {
            return EMBLEM_DATA["substitute shinigami"];
        }

        if (!target.race || !Array.isArray(target.race) || target.race.length === 0) {
            return EMBLEM_DATA["unknown"];
        }

        const normalizedRaces = target.race.map((r: string) => r.toLowerCase().trim());

        // 🥈 PRIORITY 1: Visored = Shinigami ที่มี Hollow powers ผสมอยู่ในตัว
        if (normalizedRaces.includes("shinigami") && normalizedRaces.includes("hollow")) {
            return EMBLEM_DATA["visored"];
        }

        // 🥉 PRIORITY 2: เผ่าหลักตาม CharacterRace type — เรียงจากเผ่าที่เฉพาะเจาะจง
        // ไปหาเผ่าที่กว้าง/พื้นฐานที่สุด เพื่อกันการจัดหมวดผิดในเคส multi-race
        const priorityOrder = [
            "arrancar",
            "quincy",
            "fullbringer",
            "shinigami",
            "hollow",
            "mod soul",
            "human",
            "soul",
            "unknown",
        ];
        const matchedRace = priorityOrder.find(race => normalizedRaces.includes(race));

        // ถ้าไม่ตรงกับ dictionary เลย fallback ไปเป็น Unknown แทนที่จะปล่อย null
        return matchedRace ? EMBLEM_DATA[matchedRace] : EMBLEM_DATA["unknown"];
    }, [target]);

    const cardBgStyle = isWin
        ? "bg-gradient-to-b from-[#281508] via-[#0f0a07] to-[#0a0705] border-[#d47a2a]/45 shadow-[0_0_50px_rgba(212,122,42,0.25)] ring-1 ring-[#d47a2a]/10"
        : "bg-gradient-to-b from-[#0f0e1a] via-[#090912] to-[#05050a] border-[#c8a96e]/50 shadow-[0_0_37px_rgba(200,169,110,0.1)] ring-1 ring-[#c8a96e]/10";

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
                    <span className="text-3xl" style={{ color: activeTier.color }}>卍</span>
                    <h2 className="text-2xl font-bold mt-2 tracking-[0.2em] uppercase" style={{ color: isWin ? '#c8a96e' : '#e84d4d' }}>
                        {isWin ? "REISHI KAKUNIN" : "KONPAKU DANZETSU"}
                    </h2>
                    <p className="text-[11px] tracking-[0.3em] uppercase text-[#eed9c4]/50 mt-1">
                        {isWin ? "Reishi Signature Resonance Confirmed" : "Konpaku Link Severed"}
                    </p>
                </div>

                {mode === 'daily' && (
                    <DailyResetTimer />
                )}

                <div className="relative p-[1px] my-4 bg-gradient-to-b from-[#c8a96e]/50 to-transparent">
                    {/* ตัว Card หลัก */}
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

                {/* Target Character Metadata Block */}
                {target && (
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
                                <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-[#c8a96e]/70">
                                    {isWin ? "Identity Verified" : "Data Analysis Report"}
                                </p>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse shadow-[0_0_10px_#c8a96e] pointer-events-none" />
                            </div>

                            {/* กล่องข้อมูลตัวละครตรงกลาง */}
                            <div className="relative flex items-start gap-4 p-4">
                                {/* Character Image */}
                                <div className='relative h-20 w-20 shrink-0 border border-[#c8a96e]/20 p-[1px] bg-black/40 z-10'>
                                    <Image
                                        src={`/assets/characters/${target.image}`}
                                        alt={target.name}
                                        fill
                                        className="object-cover grayscale-[10%] brightness-[95%]"
                                    />
                                </div>

                                {/* Info Section */}
                                <div className="flex flex-col text-left overflow-hidden pt-1 z-10">
                                    <h2 className="text-xl text-[#f5ebd5] tracking-wide truncate">{target.name}</h2>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">{target.gender}</span>
                                        <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">{target.race.join(' / ')}</span>
                                        <span className="px-2 py-0.5 text-[12px] text-[#c8a96e]/80 border border-[#c8a96e]/20 bg-[#c8a96e]/5 font-mono">{target.affiliation}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid (Central 46 Style) */}
                            <div className="grid grid-cols-2 gap-[1px] bg-[#c8a96e]/10 border-t border-[#c8a96e]/10">
                                {[
                                    { label: 'Height', value: formatHeight(target.height_cm) },
                                    { label: 'Age', value: formatAge(target.age) },
                                    { label: 'Eyes', value: target.eye_color },
                                    { label: 'Hair', value: target.hair_color },
                                    { label: 'Debut', value: target.first_appearance_chapter },
                                    { label: 'Weapon', value: target.weapon.join(', ') },
                                    { label: 'Ability', value: target.primary_ability.join(', ') },
                                    { label: 'Release', value: target.release.join(', ') },
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

                {/* Identification Logs Block */}
                <div className="my-4 border-t border-white/[0.05] pt-4 flex flex-col items-center w-full">
                    <p className="text-[12px] text-[#eed9c4]/70 uppercase tracking-widest mb-1">Identification History</p>
                    <p className="text-2xl font-mono font-bold mb-4 text-[#f5ebd5]">{guesses.length} <span className="text-xs text-[#eed9c4]/50 font-normal">attempts</span></p>

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
                                            className="w-4 h-4 opacity-75 shadow-sm transition-all hover:opacity-100"
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
                        className="flex items-center justify-between w-full border border-[#c8a96e]/15 bg-[#c8a96e]/5 hover:bg-[#c8a96e]/10 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#c8a96e] transition-all duration-200 select-none"
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
                        <div className="grid grid-cols-2 gap-1.5 max-h-[137px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/10">
                            {[...guesses].map((entry, i) => {
                                const originalIndex = guesses.length - i;
                                const isCorrect = entry.result && Object.entries(entry.result).every(([key, value]) => {
                                    if (key === 'image') return true; // ข้ามการเช็คฟิลด์รูปภาพตามเงื่อนไข
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
                                            style={{ backgroundColor: isCorrect ? '#4de880' : '#a64747' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Narrative Flavor Text Block */}
                <div className="text-center italic text-[#eed9c4]/70 text-xs leading-relaxed px-2 my-5 border-l-2 border-[#c8a96e]/50">
                    "{activeTier.flavor}"
                </div>

                {/* Streak Analytics Grid */}
                <div className="grid grid-cols-2 divide-x divide-white/[0.08] mb-6 border-t border-white/[0.05] pt-4">
                    <div className="flex flex-col items-center">
                        <p className="text-[11px] uppercase text-[#eed9c4]/70 tracking-widest">Current Streaks</p>
                        <p className="text-xl font-mono font-bold mt-0.5 text-[#f5ebd5]">
                            {isWin ? stats.currentStreak : 0}
                        </p>
                    </div>

                    <div className="flex flex-col items-center">
                        <p className="text-[11px] uppercase text-[#eed9c4]/70 tracking-widest">Max Streaks</p>
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