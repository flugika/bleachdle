// src/features/quote/components/shared/QuoteHowToPlayModal.tsx
'use client';

import { Modal } from '@/src/shared/ui/modal';
import { Button } from '@/src/shared/ui/button';
import { QuoteGuessCard } from './QuoteGuessTable';
import { Character } from '@/src/entities/character/schema';

interface QuoteHowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'unlimited';
}

// 🎭 ข้อมูลตัวอย่างสำหรับสาธิตเท่านั้น ไม่ใช่ตัวละครจริงในชุดข้อมูลเกม
const EXAMPLE_WRONG_CHARACTER = {
    id: 'ef5ac1b1-6858-4880-b62f-f4d878d1edf3',
    name: 'Kon',
    image: 'Kon.webp',
} as unknown as Character;

const EXAMPLE_CORRECT_CHARACTER = {
    id: '6adb1439-598a-47aa-afde-002c4bc0cbb0',
    name: 'Sosuke Aizen',
    image: 'Sosuke_Aizen.webp',
} as unknown as Character;

const EXAMPLE_QUOTE = `"If you wish to kill 100 men, you must be prepared to be killed by 100 men."`;

export const QuoteHowToPlayModal = ({ isOpen, onClose, mode }: QuoteHowToPlayModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="How to Play" titleAlign="center">
            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-sm">
                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>❝</span> The Objective
                    </h3>

                    <div className="space-y-2">
                        {mode === 'unlimited' ? (
                            <p className="text-[#a0988e] text-xs leading-relaxed">
                                Identify which <span className="text-white font-medium">Bleach character</span> spoke
                                the mystery quote within <span className="text-[#c8a96e] font-semibold">10 attempts</span> to
                                sustain your win streak.
                            </p>
                        ) : (
                            <p className="text-[#a0988e] text-xs leading-relaxed">
                                Identify which <span className="text-white font-medium">Bleach character</span> spoke
                                today's mystery quote. You have <span className="text-[#4de880] font-semibold">unlimited attempts</span> —
                                read it carefully, the phrasing is the only clue you get.
                            </p>
                        )}

                        <div className="text-[11px] font-semibold tracking-wider text-[#e83030]/90 uppercase bg-[#200b0b]/60 border border-[#401515]/60 px-2.5 py-1 inline-block">
                            ⚠️ System Warning: No spiritual hints provided.
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3.5 h-3.5 bg-[#0d2918] border border-[#2da157]/50" />
                            <span className="text-[#4de880]">Correct Match — exact speaker identified</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3.5 h-3.5 bg-[#1c0808] border border-[#822d2d]/40" />
                            <span className="text-[#c47a7a]">No Match — try another soul</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>❝</span> Reading Your Ticket
                    </h3>
                    <ul className="text-[#a0988e] text-xs space-y-2">
                        <li>
                            <strong className="text-white">Stamp:</strong> A <span className="text-[#4de880]">VERIFIED</span> stamp
                            confirms the quote's true speaker. A <span className="text-[#c47a7a]">VOID</span> stamp means wrong character.
                        </li>
                        <li>
                            <strong className="text-white">Ticket No.:</strong> The attempt number this guess was made on, oldest first.
                        </li>
                        <li>
                            <strong className="text-white">Character:</strong> The name of the character you guessed —
                            not the mystery speaker, so you can rule out options as you go.
                        </li>
                        <li>
                            Quotes have a single correct speaker — there's no "close" match on affiliation or arc, unlike character mode.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Mystery Quote Preview — ให้เห็น context ของสิ่งที่ต้องเดา ก่อนลงตัวอย่าง ticket */}
            <div className="border-t border-[#c8a96e]/20 pt-6 mb-6">
                <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs mb-3">The Mystery Quote</h3>
                <blockquote className="text-white/90 text-sm italic leading-relaxed border-l-2 border-[#c8a96e]/40 pl-4">
                    {EXAMPLE_QUOTE}
                </blockquote>
                <p className="text-[#a0988e] text-[11px] mt-2">— Who said it? Guess the character below.</p>
            </div>

            {/* Example Gameplay — ใช้ QuoteGuessCard ตัวจริง ให้ตรงกับของในเกม 100% */}
            <div className="border-t border-[#c8a96e]/20 pt-6">
                <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs mb-4">Example Tickets</h3>

                <div className="max-w-md mx-auto">
                    <QuoteGuessCard guess={EXAMPLE_WRONG_CHARACTER} status="wrong" attemptNumber={1} />
                    <QuoteGuessCard guess={EXAMPLE_CORRECT_CHARACTER} status="correct" attemptNumber={2} />
                </div>
            </div>

            <Button className="w-full mt-6" onClick={onClose}>
                Start Reading
            </Button>
        </Modal>
    );
};