'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createSearchEngine } from '@/src/lib/search/fuzzy';
import { Character } from '@/src/entities/character/schema';
import Image from 'next/image';
import { GuessGameController } from '@/src/shared/types/guessGame';

interface GuessSearchBarProps {
    characters: Character[];
    disabled?: boolean;
    game: GuessGameController;
    /**
     * DOM id prefix used to scroll-to + shake an already-guessed row when
     * the player re-selects it from the dropdown.
     *
     * ⚠️ Must match whatever your guess table actually renders as the row id:
     *   - CharacterGuessTable renders  `id={`row-${guess.id}`}`        → prefix "row"
     *   - QuoteGuessTable renders      `id={`quote-row-${guess.id}`}`  → prefix "quote-row"
     * Passing the wrong prefix silently no-ops the scroll/shake (no crash,
     * just a missed UX nicety) — this was the actual reusability bug: the
     * old copy-pasted SearchBar.tsx hardcoded `row-${id}`, which is wrong
     * for the quote table.
     */
    rowIdPrefix?: string;
    placeholder?: string;
}

export const SearchBar = ({
    characters,
    disabled = false,
    game,
    rowIdPrefix = 'row',
    placeholder = 'ENTER SOUL NAME...',
}: GuessSearchBarProps) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);

    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { addGuess, guesses } = game;

    const guessedIds = useMemo(
        () => new Set(guesses.map(g => g.guess.id)),
        [guesses]
    );

    const searchEngine = useMemo(
        () => createSearchEngine(characters),
        [characters]
    );

    const results = useMemo(() => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return [];
        return searchEngine.search(trimmedQuery).slice(0, 10);
    }, [query, searchEngine]);

    useEffect(() => setActiveIdx(-1), [results]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const triggerScrollAndShake = (charId: string) => {
        const rowEl = document.getElementById(`${rowIdPrefix}-${charId}`);
        if (!rowEl) return;

        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        rowEl.classList.add(
            'animate-reiatsu-shake',
            'ring-2',
            'ring-[#c8a96e]/70',
            'z-20'
        );

        setTimeout(() => {
            rowEl.classList.remove(
                'animate-reiatsu-shake',
                'ring-2',
                'ring-[#c8a96e]/70',
                'z-20'
            );
        }, 600);
    };

    const handleSelect = (char: Character) => {
        if (guessedIds.has(char.id)) {
            triggerScrollAndShake(char.id);
        } else {
            addGuess(char.id);
        }

        setQuery('');
        setIsOpen(false);
        setActiveIdx(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || !results.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();

            if (activeIdx >= 0) {
                handleSelect(results[activeIdx].item);
            } else {
                handleSelect(results[0].item);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        setIsOpen(query.trim().length > 0);
    }, [query]);

    return (
        <div ref={wrapRef} className="relative w-full max-w-md mx-auto">
            {/* INPUT BOX - TYBW STYLING */}
            <div className="relative group/input">
                <div className="absolute -inset-px bg-gradient-to-r from-red-900/0 via-red-600/0 to-red-900/0 group-focus-within/input:via-red-600/40 transition-all duration-500" />

                <input
                    ref={inputRef}
                    value={query}
                    disabled={disabled}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => results.length && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="relative w-full py-3.5 pl-5 pr-12 bg-[#050507] text-[#e2e2e5] text-xs font-medium tracking-[0.15em] uppercase border border-[#1a1a24] focus:outline-none focus:border-red-600/80 focus:text-white transition-all duration-300 placeholder-[#444452]"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <span className="text-[12px] text-[#444452] group-focus-within/input:text-red-500 tracking-widest transition-colors duration-300 font-mono">
                        卍
                    </span>
                </div>
            </div>

            {/* DROPDOWN MENU */}
            {isOpen && results.length > 0 && (
                <ul className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-[#050507] border border-red-900/40 max-h-[360px] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md">
                    {results.map(({ item }, idx) => {
                        const isGuessed = guessedIds.has(item.id);
                        const isActive = idx === activeIdx;

                        return (
                            <li
                                key={item.id}
                                onMouseDown={() => handleSelect(item)}
                                onMouseEnter={() => setActiveIdx(idx)}
                                className={[
                                    'group relative flex items-center justify-between px-5 py-3 cursor-pointer border-b border-[#14141a]/60 last:border-0 transition-all duration-150',
                                    isActive ? 'bg-[#0f0f15]' : '',
                                    isGuessed ? 'opacity-40' : ''
                                ].join(' ')}
                            >
                                <div className={[
                                    'absolute left-0 top-0 bottom-0 w-[4px] bg-red-600 transition-all duration-300 scale-y-0 origin-center',
                                    isActive ? 'scale-y-100 shadow-[0_0_10px_#dc2626]' : ''
                                ].join(' ')} />

                                <div className="flex items-center gap-3 min-w-0 pr-4 transition-transform duration-200 group-hover:translate-x-1">
                                    <div className="relative w-8 h-8 shrink-0 border border-[#1a1a24]">
                                        <Image
                                            src={`/assets/characters/${item.image}`}
                                            alt={item.name}
                                            fill
                                            className={`object-cover transition-all duration-200 ${isGuessed ? 'grayscale opacity-60' : ''}`}
                                        />
                                    </div>

                                    <span className={[
                                        'text-xs font-semibold tracking-wider uppercase truncate transition-colors duration-200',
                                        isActive
                                            ? 'text-red-500'
                                            : isGuessed
                                                ? 'text-[#916564] line-through'
                                                : 'text-[#d1d1d6]'
                                    ].join(' ')}>
                                        {item.name}
                                    </span>
                                </div>

                                {isGuessed ? (
                                    <span className="ml-3 shrink-0 text-[10px] tracking-[0.2em] font-bold uppercase text-[#faaea7] border border-[#faaea7]/60 bg-red-950/20 px-2 py-0.5 shadow-[inset_0_0_6px_rgba(185,28,28,0.1)]">
                                        SEALED
                                    </span>
                                ) : (
                                    <span className={[
                                        'ml-3 shrink-0 w-1 h-1 bg-red-500 transition-all duration-200 opacity-0 scale-50 rounded',
                                        isActive ? 'opacity-100 scale-100 shadow-[0_0_8px_#dc2626]' : ''
                                    ].join(' ')} />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};