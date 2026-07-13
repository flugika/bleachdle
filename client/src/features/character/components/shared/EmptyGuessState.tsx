// src/features/character/components/shared/EmptyGuessState.tsx
'use client';

import { Character } from '@/src/entities/character/schema';

interface EmptyGuessStateProps {
    characters: Character[];
    targetId: string | undefined;
    onRandomGuess: (characterId: string) => void;
    disabled?: boolean;
}

export function EmptyGuessState({ characters, targetId, onRandomGuess, disabled }: EmptyGuessStateProps) {
    const handleClick = () => {
        // Exclude the target before picking — never guess-then-check-and-retry,
        // since that can loop forever if the pool only has one character left.
        const pool = characters.filter((c) => c.id !== targetId);
        if (pool.length === 0) return; // edge case: only one character exists in the system
        const picked = pool[Math.floor(Math.random() * pool.length)];
        onRandomGuess(picked.id);
    };

    return (
        <div className="mt-10 flex flex-col items-center justify-center gap-2 py-14 border border-dashed border-[#3a352e] bg-[#0a0a0f]/40">
            <p className="text-xs uppercase tracking-[0.25em] text-[#e0cba2] text-center px-6">
                No guesses yet — make a guess to get started
            </p>
            <p className="text-[12px] text-[#e0cba2]/50 text-center px-6">
                Not sure where to start? Tap below and we'll pick a random first guess for you.
            </p>
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className={[
                    'random-guess-btn mt-2 px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-bold',
                    'border border-[#c8a96e]/40 text-[#c8a96e] bg-[#c8a96e]/5',
                    'transition-all duration-300 ease-out',
                    'hover:border-[#c8a96e] hover:text-white hover:bg-[#c8a96e]/15',
                    'hover:shadow-[0_0_18px_rgba(200,169,110,0.5),inset_0_0_12px_rgba(200,169,110,0.15)]',
                    'hover:scale-105 active:scale-95',
                    'disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
            >
                🎲 Random Guess
            </button>
        </div>
    );
}