import { useState } from 'react'; // 🔮 เพิ่ม useState เพื่อควบคุมการ Expand
import { Button } from "@/src/shared/ui/button";
import { ComparisonOutcome, MatchResult } from "../types";
import { Modal } from "@/src/shared/ui/modal";

const STATUS_COLORS: Record<MatchResult, string> = {
    correct: '#4de880',
    partial: '#e8b830',
    wrong: '#3a2828',
    higher: '#7090f0',
    lower: '#7090f0',
};

const RESULT_KEYS: (keyof ComparisonOutcome)[] = [
    'gender', 'race', 'affiliation', 'height', 'age',
    'eyeColor', 'hairColor', 'weapon', 'primaryAbility',
    'release', 'firstAppearanceChapter'
];

export const GameOverModal = ({ isOpen, onClose, guesses, target, isWin, stats = { currentStreak: 0, maxStreak: 0 } }: any) => {
    // ⚙️ Senior Dev Architecture: ควบคุมการเปิด-ปิดประวัติแบบ Dynamic โดยไม่รบกวน Global State
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            variant={isWin ? 'success' : 'danger'}
            title={isWin ? "SOUL RECOGNIZED" : "REIATSU INSUFFICIENT"}
        >

            {target && (
                <div className="mb-6 overflow-hidden rounded border border-[#c8a96e]/30 bg-[#0a0a0f] shadow-2xl">
                    {/* Header */}
                    <div className="bg-[#c8a96e]/10 px-3 py-1.5 text-center border-b border-[#c8a96e]/20">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#c8a96e]">
                            {isWin ? "THE SOUL IDENTIFIED" : "DEFEAT - SOUL ANALYSIS"}
                        </p>
                    </div>

                    {/* Character Info */}
                    <div className="flex items-center gap-3 p-3">
                        <img
                            src={`/assets/characters/${target.image}`}
                            alt={target.name}
                            className="h-16 w-16 shrink-0 rounded border border-[#c8a96e]/20 object-cover"
                        />
                        <div className="flex flex-col text-left overflow-hidden">
                            <h2 className="text-md font-bold text-[#c8a96e] truncate">{target.name}</h2>
                            <div className="flex flex-wrap gap-1 mt-1">
                                <span className="bg-[#c8a96e]/10 px-1.5 py-0.5 text-[9px] text-white/70 border border-white/10">{target.race.join(', ')}</span>
                                <span className="bg-[#c8a96e]/10 px-1.5 py-0.5 text-[9px] text-white/70 border border-white/10">{target.affiliation}</span>
                            </div>
                        </div>
                    </div>

                    {/* Compact Details Grid */}
                    {!isWin && (
                        <div className="grid grid-cols-2 gap-[1px] bg-[#c8a96e]/20 border-t border-[#c8a96e]/20">
                            <div className="bg-[#0a0a0f] p-2 text-[9px] text-white/50 uppercase">ARC: <span className="text-white/90 normal-case">{target.firstAppearanceChapter}</span></div>
                            <div className="bg-[#0a0a0f] p-2 text-[9px] text-white/50 uppercase">WEAPON: <span className="text-white/90 normal-case">{target.weapon.join(', ')}</span></div>
                            <div className="bg-[#0a0a0f] p-2 text-[9px] text-white/50 uppercase">ABILITY: <span className="text-white/90 normal-case">{target.primaryAbility.join(', ')}</span></div>
                            <div className="bg-[#0a0a0f] p-2 text-[9px] text-white/50 uppercase">RELEASE: <span className="text-white/90 normal-case">{target.release.join(', ')}</span></div>
                        </div>
                    )}
                </div>
            )}

            {/* ส่วนสถิติและการเดา */}
            <div className="my-6 border-y border-white/10 py-4 flex flex-col items-center w-full">
                <p className="text-xs text-white/50 uppercase tracking-wider">Identification Count</p>
                <p className="text-3xl text-white font-bold mb-3">{guesses.length}</p>

                {/* 🟥 Matrix Block (เก็บเป็นระเบียบ) */}
                <div className="flex flex-col gap-1.5 items-center mb-4">
                    {guesses.map((guess: any, i: number) => (
                        <div key={i} className="flex gap-1">
                            {RESULT_KEYS.map((key) => {
                                const status = guess.result[key] as MatchResult;
                                const bgColor = STATUS_COLORS[status] || '#3a2828';
                                return (
                                    <div
                                        key={key}
                                        className="w-4 h-4 rounded-[1px] opacity-80"
                                        style={{ backgroundColor: bgColor }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* ⚔️ UX/UI ACCORDION TRIGGER - ปุ่มสไตล์แผงควบคุมยมทูตไซเบอร์ */}
                <button
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="flex items-center justify-between w-full border border-[#c8a96e]/20 bg-[#c8a96e]/5 hover:bg-[#c8a96e]/10 px-3 py-2 rounded text-[9px] font-mono uppercase tracking-[0.18em] text-[#c8a96e] transition-all duration-200 select-none"
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

                {/* 🎬 EXPANDABLE CHRONICLE STORAGE */}
                <div
                    className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${isHistoryExpanded ? 'max-h-[92px] opacity-100 mt-2.5' : 'max-h-0 opacity-0'
                        }`}
                >
                    {/* Grid เค้าโครง 2 คอลัมน์ ล็อคความสูงที่ 92px พอดีกับขนาดยอดฮิต 2 แถว */}
                    <div className="grid grid-cols-2 gap-1.5 max-h-[90px] overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/10">
                        {guesses.map((entry: any, i: number) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 border border-white/5 bg-black/40 p-1.5 rounded-[2px] hover:border-[#c8a96e]/30 transition-colors"
                            >
                                {/* ลำดับการเดาฟอนต์ Mono */}
                                <span className="font-mono text-[9px] text-white/30 shrink-0">
                                    #{String(i + 1).padStart(2, '0')}
                                </span>

                                {/* 🎯 FIXED: เข้าถึง path .guess.image ให้ถูกต้อง */}
                                <img
                                    src={`/assets/characters/${entry.guess.image}`}
                                    alt={entry.guess.name}
                                    className="w-7 h-7 rounded-[1px] border border-white/10 object-cover shrink-0 bg-neutral-900"
                                />

                                {/* 🎯 FIXED: เข้าถึง path .guess.name ให้ถูกต้อง */}
                                <span className="text-[10px] font-medium text-white/80 tracking-wide truncate">
                                    {entry.guess.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Streak Section */}
            <div className="grid grid-cols-2 divide-x divide-white/10 mb-6">
                <div className="flex flex-col items-center">
                    <p className="text-[10px] uppercase text-white/50 tracking-widest">Current Streaks</p>
                    <p className="text-xl font-bold text-white mt-1">
                        {isWin ? stats.currentStreak : 0}
                    </p>
                </div>

                <div className="flex flex-col items-center">
                    <p className="text-[10px] uppercase text-white/50 tracking-widest">Max Streaks</p>
                    <p className="text-xl font-bold text-[#c8a96e] mt-1">
                        {stats.maxStreak}
                    </p>
                </div>
            </div>

            <Button variant="outline" className="w-full" onClick={onClose}>
                New Challenge
            </Button>
        </Modal>
    );
};