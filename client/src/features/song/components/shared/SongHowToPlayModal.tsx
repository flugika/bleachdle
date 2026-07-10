// src/features/song/components/shared/SongHowToPlayModal.tsx
'use client';

import { Modal } from '@/src/shared/ui/modal';
import { Button } from '@/src/shared/ui/button';
import { SongGuessCard } from './SongGuessTable';
import { BleachSong } from '@/src/entities/song/schema';

interface SongHowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'unlimited';
}

// 🎵 ข้อมูลตัวอย่างสำหรับสาธิตเท่านั้น ไม่ใช่เพลงจริงในชุดข้อมูลเกม
// cast แบบเดียวกับ legacy-normalizer pattern ที่ใช้ใน SongGuessTable (ใช้แค่ field ที่ UI ต้องใช้จริง)
const EXAMPLE_WRONG_SONG = {
    id: 'example-wrong',
    title: 'D-Technolife',
    artist: 'UVERworld',
    album: 'OP 5',
} as unknown as BleachSong;

const EXAMPLE_CORRECT_SONG = {
    id: 'example-correct',
    title: 'Never Meant To Belong',
    artist: 'Shiro Sagisu',
    album: 'OST',
} as unknown as BleachSong;

export const SongHowToPlayModal = ({ isOpen, onClose, mode }: SongHowToPlayModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="How to Play" titleAlign="center">
            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-sm">
                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>♪</span> The Objective
                    </h3>

                    <div className="space-y-2">
                        {mode === 'unlimited' ? (
                            <p className="text-[#a0988e] text-xs leading-relaxed">
                                Identify the mystery <span className="text-white font-medium">Bleach track</span> from
                                a short audio clip within <span className="text-[#c8a96e] font-semibold">10 attempts</span> to
                                sustain your win streak. Every wrong guess unlocks a longer clip to listen to.
                            </p>
                        ) : (
                            <p className="text-[#a0988e] text-xs leading-relaxed">
                                Identify today's mystery <span className="text-white font-medium">Bleach track</span> from
                                a short audio clip. You have <span className="text-[#4de880] font-semibold">unlimited attempts</span> —
                                every wrong guess unlocks a longer clip to listen to.
                            </p>
                        )}

                        <div className="text-[11px] font-semibold tracking-wider text-[#e83030]/90 uppercase bg-[#200b0b]/60 border border-[#401515]/60 px-2.5 py-1 inline-block">
                            ⚠️ System Warning: No spiritual hints provided.
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3.5 h-3.5 bg-[#0d2918] border border-[#2da157]/50" />
                            <span className="text-[#4de880]">Correct Match — exact track identified</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3.5 h-3.5 bg-[#1c0808] border border-[#822d2d]/40" />
                            <span className="text-[#c47a7a]">No Match — try again with a longer clip</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>♪</span> Reading Your Ticket
                    </h3>
                    <ul className="text-[#a0988e] text-xs space-y-2">
                        <li>
                            <strong className="text-white">Stamp:</strong> A <span className="text-[#4de880]">VERIFIED</span> stamp
                            confirms an exact match. A <span className="text-[#c47a7a]">VOID</span> stamp means the track was wrong.
                        </li>
                        <li>
                            <strong className="text-white">Ticket No.:</strong> The attempt number this guess was made on, oldest first.
                        </li>
                        <li>
                            <strong className="text-white">Track / Artist:</strong> The title and artist of the song you guessed —
                            not the mystery target, so you can rule out options as you go.
                        </li>
                        <li>
                            Songs have a single correct answer — there's no "close" match on artist or album, unlike character mode.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Example Gameplay — ใช้ SongGuessCard ตัวจริง ให้ตรงกับของในเกม 100% */}
            <div className="border-t border-[#c8a96e]/20 pt-4">
                <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs mb-4">Example Tickets</h3>

                <div className="max-w-md mx-auto">
                    <SongGuessCard guess={EXAMPLE_WRONG_SONG} status="wrong" attemptNumber={1} />
                    <SongGuessCard guess={EXAMPLE_CORRECT_SONG} status="correct" attemptNumber={2} />
                </div>
            </div>

            <Button className="w-full mt-6" onClick={onClose}>
                Start Listening
            </Button>
        </Modal>
    );
};