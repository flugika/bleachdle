// src/features/quote/components/shared/QuoteGuessTable.tsx
'use client';

import { Character } from '@/src/entities/character/schema';
import { QuoteGuessEntry } from '@/src/features/quote/types';

interface QuoteGuessCardProps {
    guess: Character;
    status: 'correct' | 'wrong';
    attemptNumber: number;
    isNew?: boolean;
}

// 🎫 ตั๋วเดียวกับสไตล์ SongGuessCard — VERIFIED (เขียว) / VOID (แดง)
export function QuoteGuessCard({ guess, status, attemptNumber, isNew }: QuoteGuessCardProps) {
    const isCorrect = status === 'correct';

    return (
        <div
            id={`quote-row-${guess.id}`}
            className={[
                'flex items-center justify-between gap-3 px-4 py-3 mb-2 border transition-all duration-300',
                isCorrect
                    ? 'bg-[#0d2918] border-[#1a5530]'
                    : 'bg-[#1c0808] border-[#822d2d]/50',
                isNew ? 'animate-in fade-in slide-in-from-top-2 duration-500' : '',
            ].join(' ')}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 text-[10px] font-mono text-[#5a5a78] tabular-nums">
                    #{attemptNumber}
                </span>
                <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wider truncate text-[#e2e2e5]">
                        {guess.name}
                    </span>
                </div>
            </div>

            <span
                className={[
                    'shrink-0 text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 border',
                    isCorrect
                        ? 'text-[#4de880] border-[#2da157]/50 bg-[#0d2918]'
                        : 'text-[#c47a7a] border-[#822d2d]/40 bg-[#1c0808]',
                ].join(' ')}
            >
                {isCorrect ? 'VERIFIED' : 'VOID'}
            </span>
        </div>
    );
}

interface QuoteGuessTableProps {
    guesses: QuoteGuessEntry[];
}

export function QuoteGuessTable({ guesses }: QuoteGuessTableProps) {
    const total = guesses.length;

    return (
        <div className="w-full max-w-md mx-auto mt-4">
            {guesses.map((entry, idx) => (
                <QuoteGuessCard
                    key={entry.guess.id}
                    guess={entry.guess}
                    status={entry.status}
                    attemptNumber={total - idx}
                    isNew={entry.isNew}
                />
            ))}
        </div>
    );
}