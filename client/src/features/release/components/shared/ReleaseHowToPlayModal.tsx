// src/features/release/components/shared/ReleaseHowToPlayModal.tsx
'use client';

import { Modal } from '@/src/shared/ui/modal';
import { Button } from '@/src/shared/ui/button';
import { ReleaseGuessCard } from './ReleaseGuessTable';
import { BleachRelease } from '@/src/entities/release/schema';

interface ReleaseHowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'unlimited';
}

// 🎭 ข้อมูลตัวอย่างสำหรับสาธิตเท่านั้น ไม่ใช่ release จริงในชุดข้อมูลเกม
const EXAMPLE_WRONG_RELEASE = {
    "id": "556e5b70-a25d-4ff3-a3f4-a0e69fc7caa4",
    "character_id": "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
    "release_type": "Resurreccion",
    "trigger_phrase": "Resurreccion",
    "technique_name": "Segunda Etapa",
    "technique_translation": "Second Stage",
    "audio_url": "Resurreccion_Ulquiorra_Cifer_2.mp3",
    "clip_end_ms": 1300,
    "source_episode": null
} as unknown as BleachRelease;

const EXAMPLE_CORRECT_RELEASE = {
    "id": "ef890ae4-8d04-4934-9a88-9382dd65ed0f",
    "character_id": "9e2a3c7b-841d-4e9f-a2c1-23f4a56b7c8d",
    "release_type": "Bankai",
    "trigger_phrase": "Bankai",
    "technique_name": "Daiguren Hyorinmaru",
    "technique_translation": "Great Crimson Ice Lotus",
    "audio_url": "Bankai_Toshiro_Hitsugaya.mp3",
    "clip_end_ms": 1600,
    "source_episode": null
} as unknown as BleachRelease;

const EXAMPLE_TRIGGER = `"Sit Upon the Frozen Heavens..."`;

export const ReleaseHowToPlayModal = ({ isOpen, onClose, mode }: ReleaseHowToPlayModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="How to Play" titleAlign="center">
            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-sm">
                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>卍</span> The Objective
                    </h3>

                    <div className="space-y-2">
                        {mode === 'unlimited' ? (
                            <p className="text-[#a0988e] text-xs leading-relaxed">
                                Listen to the sealed release clip, then name the exact{' '}
                                <span className="text-white font-medium">technique</span> within{' '}
                                <span className="text-[#c8a96e] font-semibold">10 attempts</span> to
                                sustain your win streak.
                            </p>
                        ) : (
                            <p className="text-[#a0988e] text-xs leading-relaxed">
                                Listen to today's sealed release clip, then name the exact{' '}
                                <span className="text-white font-medium">technique</span>. You have{' '}
                                <span className="text-[#4de880] font-semibold">unlimited attempts</span> —
                                the trigger phrase is your only clue.
                            </p>
                        )}

                        <div className="text-[11px] font-semibold tracking-wider text-[#e83030]/90 uppercase bg-[#200b0b]/60 border border-[#401515]/60 px-2.5 py-1 inline-block">
                            ⚠️ System Warning: Clip cuts before the technique name is spoken.
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3.5 h-3.5 bg-[#0d2918] border border-[#2da157]/50" />
                            <span className="text-[#4de880]">Correct Match — exact technique identified</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3.5 h-3.5 bg-[#1c0808] border border-[#822d2d]/40" />
                            <span className="text-[#c47a7a]">No Match — try another technique</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>卍</span> Reading Your Record
                    </h3>
                    <ul className="text-[#a0988e] text-xs space-y-2">
                        <li>
                            <strong className="text-white">Stamp:</strong> An <span className="text-[#4de880]">UNSEALED</span> stamp
                            confirms the correct technique. A <span className="text-[#c47a7a]">REJECTED</span> stamp means wrong guess.
                        </li>
                        <li>
                            <strong className="text-white">Rec No.:</strong> The attempt number this guess was made on, oldest first.
                        </li>
                        <li>
                            <strong className="text-white">Technique Guessed:</strong> The technique you selected —
                            not the mystery answer, so you can rule out options as you go.
                        </li>
                        <li>
                            Each release has a single correct technique — search matches on the romanized name
                            or its English meaning, but there's no "close" match, unlike character mode.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Mystery Clip Preview */}
            <div className="border-t border-[#c8a96e]/20 pt-6 mb-6">
                <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs mb-3">The Trigger Phrase</h3>
                <blockquote className="text-white/90 text-sm italic leading-relaxed border-l-2 border-[#c8a96e]/40 pl-4">
                    {EXAMPLE_TRIGGER}
                </blockquote>
                <p className="text-[#a0988e] text-[11px] mt-2">— The clip cuts here. What's the technique?</p>
            </div>

            {/* Example Gameplay — ใช้ ReleaseGuessCard ตัวจริง ให้ตรงกับของในเกม 100% */}
            <div className="border-t border-[#c8a96e]/20 pt-6">
                <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs mb-4">Example Records</h3>

                <div className="max-w-[80%] mx-auto">
                    <ReleaseGuessCard guess={EXAMPLE_WRONG_RELEASE} status="wrong" attemptNumber={1} />
                    <ReleaseGuessCard guess={EXAMPLE_CORRECT_RELEASE} status="correct" attemptNumber={2} />
                </div>
            </div>

            <Button className="w-full mt-6" onClick={onClose}>
                Start Listening
            </Button>
        </Modal>
    );
};