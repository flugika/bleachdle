// src/shared/ui/SongControlPanel.tsx
import { useState } from 'react';
import { SongSearchBar } from '@/src/features/song/components/shared/SongSearchBar';
import { SongAudioPlayer } from '@/src/features/song/components/shared/SongAudioPlayer';
import { BleachSong } from '@/src/entities/song/schema';
import { SongGuessable } from '@/src/features/song/types';
import { Modal } from '../modal';

interface SongControlPanelProps {
    mode: 'daily' | 'unlimited';
    target: BleachSong | null;
    songs: BleachSong[];
    remainingGuesses?: number;
    stats: { currentStreak: number; maxStreak: number };
    timeLeft?: string; // ใส่เฉพาะโหมด daily
    game: SongGuessable;
    disabled?: boolean;
    maxGuesses?: number;
    isGameOver?: boolean;
    onSurrender?: () => void;
}

export function SongControlPanel({
    mode,
    target,
    songs,
    remainingGuesses,
    stats,
    timeLeft,
    game,
    disabled = false,
    maxGuesses,
    isGameOver = false,
    onSurrender
}: SongControlPanelProps) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    let isLimitReached = false;
    if (mode === 'unlimited') {
        // attempts เหลือ 0 หรือน้อยกว่า = ปิดการเดาต่อ (sync กับ fix เดียวกันใน CharacterControlPanel)
        isLimitReached = remainingGuesses !== undefined && remainingGuesses <= 0;
    }

    const hasGuesses = game?.guesses?.length > 0;
    const attemptIndex = game?.guesses?.length ?? 0;

    return (
        <div className="flex flex-col items-center">
            {/* Audio + Search Section */}
            {target && (
                <>
                    <SongAudioPlayer
                        target={target}
                        attemptIndex={attemptIndex}
                        disabled={disabled || isLimitReached}
                    />

                    <div className="flex justify-center w-full mt-6 mb-6">
                        <SongSearchBar
                            songs={songs}
                            disabled={disabled || isLimitReached || !target}
                            game={game}
                        />
                    </div>
                </>
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

                {/* ⚔️ FORFEIT NODE — เหมือน CharacterControlPanel เป๊ะ (ใช้เฉพาะ daily) */}
                {mode === 'daily' && hasGuesses && !isGameOver && onSurrender && (
                    <>
                        <button
                            onClick={() => setIsConfirmOpen(true)}
                            className="flex flex-col items-center justify-center px-4 py-1.5 border border-transparent hover:bg-[#5e1b1b] hover:border-[#b06d6d]/30 hover:shadow-[0_0_12px_rgba(89,14,14,0.2)] transition-all duration-200 group cursor-pointer focus:outline-none select-none"
                        >
                            <span className="text-[#e83030]/50 group-hover:text-[#a64747] text-[11px] uppercase tracking-[0.2em] transition-colors duration-200">
                                FORFEIT
                            </span>
                            <span className="text-neutral-500 group-hover:text-[#d8d0c8] text-lg font-bold tracking-wider transition-colors duration-200">
                                GIVE UP
                            </span>
                        </button>

                        <Modal
                            isOpen={isConfirmOpen}
                            onClose={() => setIsConfirmOpen(false)}
                            title="FORFEIT RESONANCE"
                            variant="danger"
                            maxWidth="max-w-[420px]"
                            onConfirm={() => {
                                setIsConfirmOpen(false);
                                onSurrender();
                            }}
                            confirmText="Surrender"
                            cancelText="Cancel"
                        >
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