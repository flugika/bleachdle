// src/features/quote/components/shared/QuoteSummaryGuess.tsx
'use client';

import { BleachQuote } from '@/src/entities/quote/schema';
import { QuoteGuessEntry } from '@/src/features/quote/types';
import { getCharacterById } from '@/src/lib/utils/character'; // ⚠️ ปรับ path ให้ตรงของจริง
import { QuoteGuessTable } from './QuoteGuessTable';
import { Button } from '@/src/shared/ui/button';

interface QuoteSummaryGuessProps {
    isOpen: boolean;
    onClose: () => void;
    guesses: QuoteGuessEntry[];
    target: BleachQuote | null;
    isWin: boolean;
    mode: 'daily' | 'unlimited';
    stats: { currentStreak: number; maxStreak: number };
}

export function QuoteSummaryGuess({ isOpen, onClose, guesses, target, isWin, mode, stats }: QuoteSummaryGuessProps) {
    if (!isOpen || !target) return null;

    const answerCharacter = getCharacterById(target.character_id);
    const divider = '━'.repeat(20);

    return (
        <div className="w-full max-w-lg mx-auto mt-6 flex flex-col items-center">
            {/* Result stamp */}
            <div
                className={[
                    'text-lg font-black uppercase tracking-[0.2em] mb-4',
                    isWin ? 'text-[#4de880]' : 'text-[#e83030]',
                ].join(' ')}
            >
                {isWin ? '✓ Identity Confirmed' : '✕ Reiatsu Signal Lost'}
            </div>

            {/* Quote ticket card */}
            <div className="w-full bg-[#0a0a0f]/80 border border-[#c8a96e]/25 px-6 py-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                {isWin && answerCharacter && (
                    <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#4de880] mb-4">
                        ✓ {answerCharacter.name}
                    </p>
                )}

                <p className="text-[10px] text-[#5a5a78] font-mono tracking-widest select-none">{divider}</p>

                <p className="italic text-sm text-[#d8d0c8] leading-relaxed my-4 whitespace-pre-line">
                    "{target.text}"
                </p>

                <p className="text-[10px] text-[#5a5a78] font-mono tracking-widest select-none">{divider}</p>

                {(target.episode || target.chapter || target.arc || target.context) && (
                    <div className="grid grid-cols-2 gap-4 mt-6 text-left text-xs">
                        {target.episode != null && (
                            <div>
                                <p className="text-[#5a5a78] uppercase tracking-wider text-[10px]">Episode</p>
                                <p className="text-[#c8a96e] font-bold">{target.episode}</p>
                            </div>
                        )}
                        {target.chapter != null && (
                            <div>
                                <p className="text-[#5a5a78] uppercase tracking-wider text-[10px]">Chapter</p>
                                <p className="text-[#c8a96e] font-bold">{target.chapter}</p>
                            </div>
                        )}
                        {target.arc && (
                            <div className="col-span-2">
                                <p className="text-[#5a5a78] uppercase tracking-wider text-[10px]">Arc</p>
                                <p className="text-[#c8a96e] font-bold">{target.arc}</p>
                            </div>
                        )}
                        {target.context && (
                            <div className="col-span-2">
                                <p className="text-[#5a5a78] uppercase tracking-wider text-[10px]">Context</p>
                                <p className="text-[#a0988e] leading-relaxed">{target.context}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Guess history */}
            <QuoteGuessTable guesses={guesses} />

            {/* Stats footer */}
            <div className="flex justify-center gap-8 my-6 text-[11px] uppercase tracking-[0.2em] text-[#5a5a78]">
                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Current Streaks</span>
                    <span className="text-[#c8a96e] text-lg font-bold">{stats.currentStreak}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Max Streaks</span>
                    <span className="text-[#c8a96e] text-lg font-bold">{stats.maxStreak}</span>
                </div>
            </div>

            <Button className="w-full max-w-xs" onClick={onClose}>
                Next Reiatsu Trace
            </Button>
        </div>
    );
}