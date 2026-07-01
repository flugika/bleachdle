'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createSearchEngine } from '@/src/lib/search/fuzzy';
import { Character } from '@/src/entities/character/schema';
import Image from 'next/image';
import { CharacterGameController } from '@/src/features/character/types';

interface SearchBarProps {
    characters: Character[];
    disabled?: boolean;
    game: CharacterGameController; // 👈 inject มาแทน hook
}

export const SearchBar = ({ characters, disabled = false, game }: SearchBarProps) => {
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
        const rowEl = document.getElementById(`row-${charId}`);
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
        <div ref={wrapRef} className="relative w-full max-w-sm">

            <style jsx global>{`
                @keyframes reiatsuShake {
                    0%, 100% { transform: translateX(0) !important; }
                    15%, 45%, 75% { transform: translateX(-5px) !important; }
                    30%, 60%, 90% { transform: translateX(5px) !important; }
                }
                .animate-reiatsu-shake {
                    animation: reiatsuShake 0.5s cubic-bezier(.36,.07,.19,.97) both !important;
                }
            `}</style>

            {/* INPUT */}
            <div className="relative">
                <input
                    ref={inputRef}
                    value={query}
                    disabled={disabled}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => results.length && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter Soul name…"
                    autoComplete="off"
                    className="w-full py-2.5 pl-4 pr-10 bg-[#0e0e1a] text-[#d8d0c8] text-sm border border-[#2a2a42]"
                />
            </div>

            {/* DROPDOWN */}
            {isOpen && results.length > 0 && (
                <ul className="absolute top-[calc(100%+3px)] left-0 right-0 z-50 bg-[#0e0e1a] border border-[#2a2a42] max-h-[380px] overflow-y-auto">
                    {results.map(({ item }, idx) => {
                        const isGuessed = guessedIds.has(item.id);
                        const isActive = idx === activeIdx;

                        return (
                            <li
                                key={item.id}
                                onMouseDown={() => handleSelect(item)}
                                onMouseEnter={() => setActiveIdx(idx)}
                                className={[
                                    'group flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors duration-200',
                                    isActive ? 'bg-[#16162a]' : 'hover:bg-[#13131e]',
                                    isGuessed ? 'opacity-50' : ''
                                ].join(' ')}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative w-8 h-8 shrink-0">
                                        <Image
                                            src={`/assets/characters/${item.image}`}
                                            alt={item.name}
                                            fill
                                            className="object-cover border border-[#2a2a42]"
                                        />
                                    </div>

                                    <span className={[
                                        'truncate transition-all duration-200',
                                        isActive
                                            ? 'text-[#c8a96e]'
                                            : isGuessed
                                                ? 'text-[#5a5a78] line-through group-hover:no-underline group-hover:text-[#8a8298]'
                                                : 'text-[#a0988e]'
                                    ].join(' ')}>
                                        {item.name}
                                    </span>
                                </div>

                                {isGuessed ? (
                                    <span className="ml-3 shrink-0 text-[9px] tracking-[0.2em] uppercase text-[#c8a96e]/70 border border-[#c8a96e]/30 px-1.5 py-0.5 font-medium group-hover:text-[#c8a96e] group-hover:border-[#c8a96e]/60 transition-colors duration-200">
                                        Sealed
                                    </span>
                                ) : (
                                    <span className="ml-3 shrink-0 w-1.5 h-1.5 rounded-full bg-[#c8a96e] opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200" />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};