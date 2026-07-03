// src/shared/ui/GameControlPanel.tsx
import { SearchBar } from '@/src/shared/ui/SearchBar';
import { Character } from '@/src/entities/character/schema';
import { useState } from 'react';
import { Modal } from '../modal';

interface GameControlPanelProps {
    mode: 'daily' | 'unlimited'; // รับโหมดเพื่อเปลี่ยน Logic เล็กน้อย
    target: Character | null;
    characters: Character[];
    remainingGuesses?: number;
    stats: { currentStreak: number; maxStreak: number };
    timeLeft?: string; // ใส่เฉพาะโหมด daily
    game: any; // หรือระบุ interface ของ game object ให้ชัดเจน
    disabled?: boolean;
    maxGuesses?: number;
    isGameOver?: boolean;
    onSurrender?: () => void;
}

export function GameControlPanel({
    mode,
    target,
    characters,
    remainingGuesses,
    stats,
    timeLeft,
    game,
    disabled = false,
    maxGuesses,
    isGameOver = false,
    onSurrender
}: GameControlPanelProps) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    let isLimitReached = false;
    if (mode === 'unlimited') {
        // 🛡️ FIX: เดิม `remainingGuesses >= maxGuesses` กลับตรรกะ (true ตอนเพิ่งเริ่มเกม,
        // false ตอน attempts หมดแล้ว) — บั๊กนี้ไม่เคยโดนทดสอบเพราะ mode 'unlimited' ยังไม่มีใครเรียกใช้จริง
        // ต้องเช็คว่า "attempts เหลือ 0 หรือน้อยกว่า" ถึงจะ disable การเดาต่อ
        isLimitReached = remainingGuesses !== undefined && remainingGuesses <= 0;
    }

    const hasGuesses = game?.guesses?.length > 0;

    return (
        <div className="flex flex-col items-center">
            {/* Search Section */}
            {target && (
                <div className="flex justify-center w-full mb-6">
                    <SearchBar
                        characters={characters}
                        disabled={disabled || isLimitReached || !target}
                        game={game}
                    />
                </div>
            )}

            {/* Stats Section */}
            <div className="flex justify-center gap-8 my-6 text-[11px] uppercase tracking-[0.2em] text-[#5a5a78]">
                {mode === 'daily' && timeLeft && (
                    <div className="flex flex-col items-center">
                        <span className="text-[#d1a9a9]">Next Reset</span>
                        <span className="text-[#4de880] text-lg font-bold font-mono">{timeLeft}</span>
                    </div>
                )}

                {mode === 'unlimited' && (
                    <div className="flex flex-col items-center">
                        <span className="text-[#d1a9a9]">Attempts Left</span>
                        <span className={`${remainingGuesses === 0 ? 'text-[#e83030]' : 'text-[#4de880]'} text-lg font-bold`}>
                            {remainingGuesses}
                        </span>
                    </div>
                )}

                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Current Streaks</span>
                    <span className="text-[#c8a96e] text-lg font-bold">{stats.currentStreak}</span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Max Streaks</span>
                    <span className="text-[#c8a96e] text-lg font-bold">{stats.maxStreak}</span>
                </div>


                {/* ⚔️ EXPERT ULTRA-PREMIUM FORFEIT NODE (MUTED TACTICAL CRIMSON HOVER) */}
                {mode === 'daily' && hasGuesses && !isGameOver && onSurrender && (
                    <>
                        <button
                            onClick={() => setIsConfirmOpen(true)} // 👈 เรียกใช้งานมอดอลหรูแทนหน้าต่างโบราณ
                            className="flex flex-col items-center justify-center px-4 py-1.5 border border-transparent hover:bg-[#5e1b1b] hover:border-[#b06d6d]/30 hover:shadow-[0_0_12px_rgba(89,14,14,0.2)] transition-all duration-200 group cursor-pointer focus:outline-none select-none"
                        >
                            {/* หัวคอลัมน์: จากแดงดิบ เปลี่ยนเป็นสีแดงควันจางๆ คุมโทน */}
                            <span className="text-[#e83030]/50 group-hover:text-[#a64747] text-[11px] uppercase tracking-[0.2em] transition-colors duration-200">
                                FORFEIT
                            </span>

                            {/* ตัวอักษรหลัก: เปลี่ยนจากสีขาวจ้า (Blinding White) เป็นสีครีมพลาตินั่มนวลตา (#d8d0c8) ของตัวเกม */}
                            <span className="text-neutral-500 group-hover:text-[#d8d0c8] text-lg font-bold tracking-wider transition-colors duration-200">
                                GIVE UP
                            </span>
                        </button>

                        {/* ⛩️ PREMIUM BREAK ZANPAKUTO ALERT MODAL */}
                        <Modal
                            isOpen={isConfirmOpen}
                            onClose={() => setIsConfirmOpen(false)}
                            title="FORFEIT PERCEPTION"
                            variant="danger" // ระบบจะเปลี่ยนเป็นสีแดงให้อัตโนมัติ ทั้งกรอบและปุ่ม
                            maxWidth="max-w-[420px]"
                            // ⚙️ เรียกใช้ Action Props ได้เลย
                            onConfirm={() => {
                                setIsConfirmOpen(false);
                                onSurrender();
                            }}
                            confirmText="Surrender"
                            cancelText="Cancel"
                        >
                            {/* โฟกัสแค่ Content ล้วนๆ ไม่ต้องเขียนปุ่มซ้ำแล้ว */}
                            <div className="flex flex-col items-center text-center -mt-2">
                                <p className="text-xs tracking-[0.1em] text-neutral-300 uppercase font-mono leading-relaxed">
                                    Are you sure you want to surrender? <br />
                                    Your current streak will be reset to <span className="text-[#e83030] font-bold">0</span>.
                                </p>
                            </div>
                        </Modal>
                    </>
                )}
            </div>
        </div>
    );
}