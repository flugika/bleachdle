// src/features/emoji/components/shared/EmojiHowToPlayModal.tsx
'use client';

import { Modal } from '@/src/shared/ui/modal';
import { Button } from '@/src/shared/ui/button';
import { EmojiGuessCard } from './EmojiGuessTable';
import { Character } from '@/src/entities/character/schema';
import { EmojiTile } from './EmojiTestimonyDisplay';

interface EmojiHowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'unlimited';
}

const T = {
    border: '#2b2534',
    gold: '#c8a96e',
    reiatsu: '#8a6bf2',
    reiatsuBright: '#b39cff',
};

const EXAMPLE_WRONG_CHARACTER = {
    id: 'ef5ac1b1-6858-4880-b62f-f4d878d1edf3',
    name: 'Kon',
    image: 'Kon.webp',
    affiliation: 'MOD-SOUL'
} as unknown as Character;

const EXAMPLE_CORRECT_CHARACTER = {
    id: 'c7a8b9d0-1e2f-4a3b-8c5d-6e7f8a9b0c1d',
    name: 'Ichigo Kurosaki',
    image: 'Ichigo_Kurosaki.webp',
    affiliation: 'SUBSTITUTE SOUL REAPER'
} as unknown as Character;

const DEMO_TILES = [
    { emoji: '🍓', status: 'gameplay' as const },
    { emoji: '⚔️', status: 'gameplay' as const },
    { emoji: '🧡', status: 'sealed' as const },
    { emoji: '👹', status: 'sealed' as const },
];

export const EmojiHowToPlayModal = ({ isOpen, onClose, mode }: EmojiHowToPlayModalProps) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="RECORDS & GUIDELINES" titleAlign="center">
            {/* ─── SIDE-BY-SIDE SEPARATION OF CONCERNS ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start max-w-4xl mx-auto text-sm">

                {/* 📋 LEFT COLUMN: ALL RULES & TEXTUAL CORE */}
                <div className="space-y-4 border-r border-[#c8a96e]/10 pr-5 flex flex-col h-full">

                    {/* Part 1: Objective */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[#c8a96e] text-xs">❖</span>
                            <h3 className="text-[#c8a96e] text-xs font-bold tracking-widest uppercase">
                                The Objective
                            </h3>
                        </div>
                        <p className="text-[#a0988e] text-[12px] leading-relaxed">
                            Identify which <span className="text-white font-medium">Bleach character</span> is represented by the 4 mystery symbols within {mode === 'unlimited' ? <span className="text-[#c8a96e] font-semibold">10 attempts</span> : <span className="text-[#4de880] font-semibold">unlimited attempts</span>} to sustain your win streak.
                        </p>

                        <div className="text-[10px] font-semibold tracking-wider text-[#e83030]/90 uppercase bg-[#200b0b]/60 border border-[#401515]/60 px-2 py-0.5 inline-block rounded-sm">
                            ⚠️ System Warning: No spiritual hints provided.
                        </div>

                        <div className="flex flex-col gap-1 text-[11px] tracking-wide pt-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#4de880] shadow-[0_0_6px_#4de880]" />
                                <span className="text-[#4de880]">Correct Match — exact soul identified</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#c47a7a]" />
                                <span className="text-[#a0988e]">No Match — try another soul</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-px w-full bg-[#c8a96e]/10 my-1" />

                    {/* Part 2: Unsealing Rules */}
                    <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[#c8a96e] text-xs">❖</span>
                            <h3 className="text-[#c8a96e] text-xs font-bold tracking-widest uppercase">
                                Unsealing Symbols
                            </h3>
                        </div>
                        <ul className="text-[#a0988e] text-[11.5px] space-y-2 list-none pl-0 leading-relaxed">
                            <li className="flex items-start gap-1.5">
                                <span className="text-[#c8a96e] select-none">•</span>
                                <span><strong className="text-white font-medium">1st symbol:</strong> unsealed the moment the round starts — free clue.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-[#c8a96e] select-none">•</span>
                                <span><strong className="text-white font-medium">Every 2 wrong guesses:</strong> unseals the next symbol, up to 4 of 4.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-[#c8a96e] select-none">•</span>
                                <span><strong className="text-white font-medium">Stamp Status:</strong> A <span className="text-[#4de880] font-semibold">VERIFIED</span> stamp confirms the target soul, while a <span className="text-[#e83030] font-semibold">REJECTED</span> stamp indicates a complete mismatch.</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <span className="text-[#c8a96e] select-none">•</span>
                                <span>Symbol sets belong to a single explicit character — there are no near-misses on factions or story arcs.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 🎨 RIGHT COLUMN: ALL VISUAL DEMOS & INTERACTIVE EXPERIENCES */}
                <div className="space-y-3.5 pl-1">
                    <span className="text-[#c8a96e] font-black text-xs tracking-widest uppercase block mb-1 px-1">
                        EXAMPLE TICKETS
                    </span>

                    {/* Visual Area 1: Genuine Reishi Ward Plate */}
                    <div className="relative p-2.5 border border-[#2b2534] bg-[#0b0a13] rounded shadow-[0_10px_25px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#c8a96e]/30" />
                        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#c8a96e]/30" />
                        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#c8a96e]/30" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#c8a96e]/30" />

                        <div className="flex items-center justify-between mb-2 font-mono text-[9px] tracking-widest text-[#726c85]">
                            <span>THE MYSTERY SYMBOLS</span>
                            <span className="text-[#8a6bf2]/75 animate-pulse flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-current" /> CRYPT_SEALED
                            </span>
                        </div>

                        {/* Genuine Game Tiles Engine integrated seamlessly */}
                        <div className="grid grid-cols-4 gap-2.5 max-w-xs mx-auto">
                            {DEMO_TILES.map((tile, i) => (
                                <EmojiTile
                                    key={i}
                                    index={i}
                                    emoji={tile.emoji}
                                    status={tile.status}
                                    justUnlocked={false}
                                />
                            ))}
                        </div>
                        <p className="text-[#726c85] text-[9px] tracking-widest text-center mt-2 uppercase">
                            — Decode the cipher panel above —
                        </p>
                    </div>

                    {/* Visual Area 2: Consolidated Archive Example Tickets */}
                    <div className="flex flex-col space-y-1.5 bg-black/15 rounded border border-white/[0.02] overflow-hidden">
                        <div className="transform scale-[0.86] origin-top-left w-[116%] -mb-2">
                            <EmojiGuessCard guess={EXAMPLE_WRONG_CHARACTER} status="wrong" attemptNumber={1} />
                        </div>
                        <div className="transform scale-[0.86] origin-top-left w-[116%] -mt-4 -mb-5">
                            <EmojiGuessCard guess={EXAMPLE_CORRECT_CHARACTER} status="correct" attemptNumber={2} />
                        </div>
                    </div>

                </div>
            </div>

            {/* ─── BOTTOM FULL-WIDTH ACTION ACTION RIM ─── */}
            <div className="mt-4 pt-3 border-t border-[#c8a96e]/10">
                <Button className="w-full text-xs py-2.5 font-bold tracking-widest uppercase" onClick={onClose}>
                    Start Imagination
                </Button>
            </div>
        </Modal>
    );
};