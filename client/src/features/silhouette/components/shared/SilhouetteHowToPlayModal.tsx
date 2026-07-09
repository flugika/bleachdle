// src/features/silhouette/components/shared/SilhouetteHowToPlayModal.tsx
'use client';

import { Modal } from '@/src/shared/ui/modal';
import { Button } from '@/src/shared/ui/button';
import { MAX_DAILY_SILHOUETTE_GUESSES, MAX_UNLIMITED_SILHOUETTE_GUESSES } from '@/src/const/guess';
import { SilhouetteImage } from './SilhouetteImage';
import { SilhouetteGuessTable } from './SilhouetteGuessTable';
import { useEffect, useState } from 'react';
import { Character } from '@/src/entities/character/schema';
import { SilhouetteGuessEntry } from '@/src/features/silhouette/types';

interface SilhouetteHowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'unlimited';
}

// ─────────────────────────────────────────────────────────────
// MOCK DATA FOR SHOWCASE
// ─────────────────────────────────────────────────────────────
const EXAMPLE_CHARACTER = {
    id: 'demo-ichigo',
    name: 'Ichigo Kurosaki',
    image: 'Ichigo_Kurosaki_cutout_silhouette.webp',
    realImage: 'Ichigo_Kurosaki.webp',
};

const MOCK_GUESSES: SilhouetteGuessEntry[] = [
    {
        guess: { id: 'wrong-1', name: 'Renji Abarai' } as Character,
        status: 'wrong',
        isNew: false
    },
    {
        guess: { id: 'correct-1', name: 'Ichigo Kurosaki' } as Character,
        status: 'correct',
        isNew: true
    }
];

export const SilhouetteHowToPlayModal = ({ isOpen, onClose, mode }: SilhouetteHowToPlayModalProps) => {
    // 🌟 ใช้ State ง่ายๆ เพื่อสลับแค่ โชว์เงา <-> โชว์รูปจริง
    const [forceRevealDemo, setForceRevealDemo] = useState(false);

    useEffect(() => {
        // สลับสถานะทุกๆ 2.5 วินาที
        const interval = setInterval(() => {
            setForceRevealDemo((prev) => !prev);
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    const isDaily = mode === 'daily';
    const MAX_SILHOUETTE_GUESSES = isDaily ? MAX_DAILY_SILHOUETTE_GUESSES : MAX_UNLIMITED_SILHOUETTE_GUESSES;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="HOW TO PLAY"
            titleAlign="center"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-sm">

                {/* SECTION 1: OBJECTIVE & PROTOCOLS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-[#c8a96e]/10 pb-6 col-span-1 md:col-span-2">
                    <div className="space-y-3">
                        <h3 className="text-[11px] font-bold tracking-[0.2em] text-[#c8a96e] uppercase flex items-center gap-2">
                            <span className="text-[#8fd66a] text-lg leading-none">⚝</span> THE OBJECTIVE
                        </h3>
                        <p className="text-[#d8d0c8] text-xs leading-relaxed">
                            Identify the hidden <strong className="text-white">BLEACH CHARACTER</strong> by analyzing their spiritual silhouette structure
                            <span> within <span className="text-[#c8a96e] font-mono font-bold">{MAX_SILHOUETTE_GUESSES} ATTEMPTS</span> to maintain your archive clearance.</span>
                        </p>
                        <div className="bg-[#1a0505]/80 border border-[#c85050]/40 p-2.5 text-[10px] text-[#e8b4b4] tracking-wider uppercase font-mono shadow-[inset_0_0_10px_rgba(200,80,80,0.1)]">
                            <span className="text-[#ff4d4d]">⚠ SYSTEM WARNING:</span> RADAR SHADOW ACTIVE. PHYSICAL DETAILS ARE COMPRESSED.
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[11px] font-bold tracking-[0.2em] text-[#c8a96e] uppercase flex items-center gap-2">
                            READING YOUR LOGS
                        </h3>
                        <ul className="space-y-2 text-[#b8ac9e] text-xs">
                            <li><strong className="text-white">REC NO:</strong> The tracking index allocated for each query sequence.</li>
                            <li><strong className="text-white">VERDICT:</strong> <span className="text-[#8fd66a] font-bold">MATCHED (合)</span> means frequency aligned. <span className="text-[#c85050] font-bold">MISMATCH (否)</span> means identity denied.</li>
                            <li><strong className="text-white">ARCHIVE:</strong> Signatures are cross-referenced with Soul Society high-security logs.</li>
                        </ul>
                    </div>
                </div>

                {/* SECTION 2: SHOWCASE - THE SILHOUETTE SCANNER MATRIX */}
                <div className="col-span-1 md:col-span-2 border-b border-[#c8a96e]/10 pb-6">
                    <h3 className="text-[11px] font-bold tracking-[0.2em] text-[#c8a96e] uppercase mb-4 text-center">
                        REISHI STRUCTURE DETECTION MATRIX
                    </h3>

                    <div className="bg-[#06060a] border border-[#c8a96e]/20 p-5 flex flex-col sm:flex-row items-center gap-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
                        {/* Scanline overlay for aesthetic */}
                        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />

                        {/* Interactive Demo Silhouette Block */}
                        <div className="w-36 h-36 shrink-0 border border-[#c8a96e]/30 bg-[#010103] p-1 relative flex items-center justify-center shadow-[0_0_20px_rgba(200,169,110,0.1)]">
                            <div className="w-full h-full select-none pointer-events-none">
                                <SilhouetteImage
                                    mode={mode}
                                    characterId={EXAMPLE_CHARACTER.id}
                                    image={EXAMPLE_CHARACTER.image}
                                    realImage={EXAMPLE_CHARACTER.realImage}
                                    guessCount={0} // ล็อคตายตัวที่ 2 เพื่อให้เปิดป้ายแค่บางส่วนตลอดเวลา (ส่งเข้า getRevealedCellIndices ตามปกติ)
                                    forceReveal={forceRevealDemo} // สลับ true / false 
                                />
                            </div>
                            <div className="absolute inset-x-0 -bottom-2 bg-black/90 border border-[#c8a96e]/40 text-center py-1 z-50">
                                <span className="text-[9px] font-mono tracking-widest text-[#c8a96e] animate-pulse">REISHI OVERLOAD SCAN</span>
                            </div>
                        </div>

                        {/* Rules Breakdown Explanations */}
                        <div className="flex-1 space-y-4 text-xs relative z-10">
                            <div className="flex items-start gap-3 bg-[#111116]/80 p-2 border-l-2 border-[#8fd66a]">
                                <span>
                                    <strong className="text-white">Initial Baseline:</strong> The matrix shatters <span className="text-[#8fd66a] font-mono font-bold">5 random grid cells</span> to leak the fundamental shape of the entity.
                                </span>
                            </div>
                            <div className="flex items-start gap-3 bg-[#111116]/80 p-2 border-l-2 border-[#c8a96e]">
                                <span>
                                    <strong className="text-white">Adaptive Reveal:</strong> Every <span className="text-[#c8a96e] font-mono font-bold">1 incorrect guess</span>, stripping away <span className="text-[#c8a96e] font-mono font-bold">1 grid block</span>. totally 15 blocks reveal.
                                </span>
                            </div>
                            <div className="flex items-start gap-3 bg-[#111116]/80 p-2 border-l-2" style={{ borderColor: isDaily ? '#c85050' : '#8fd66a' }}>
                                <span>
                                    <strong className="text-white">Stability:</strong>
                                    {!isDaily ? (
                                        <span> Exceeding <span className="text-[#c85050] font-mono font-bold">{MAX_SILHOUETTE_GUESSES} attempts</span> results in <span className="text-[#c85050] font-bold">DEFEAT</span>.</span>
                                    ) : (
                                        <span> Runs on <span className="text-[#8fd66a] font-mono font-bold">Unlimited Guesses</span>.</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: EXAMPLE SCAN LOGS (SHOWCASE) */}
                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-4 mb-4 justify-center">
                        <div className="h-px bg-gradient-to-r from-transparent via-[#c8a96e]/30 to-transparent flex-1" />
                        <h3 className="text-[11px] font-bold tracking-[0.2em] text-[#c8a96e] uppercase text-center">
                            EXAMPLE SCAN LOGS
                        </h3>
                        <div className="h-px bg-gradient-to-r from-transparent via-[#c8a96e]/30 to-transparent flex-1" />
                    </div>

                    <div className="max-w-md mx-auto pointer-events-none">
                        <SilhouetteGuessTable guesses={MOCK_GUESSES} />
                    </div>
                </div>

            </div>

            {/* ACTION FOOTER BUTTON */}
            <div className="mt-4 max-w-xl mx-auto">
                <Button
                    variant="primary"
                    className="w-full text-xs font-mono tracking-widest uppercase hover:shadow-[0_0_20px_rgba(200,169,110,0.2)] py-3 border border-[#c8a96e]/40 transition-all duration-300"
                    onClick={onClose}
                >
                    Start Revealing
                </Button>
            </div>
        </Modal>
    );
};