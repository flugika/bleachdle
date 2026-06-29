// src/features/character/components/SearchBar.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createSearchEngine } from '@/src/lib/search/fuzzy';
import { Character } from '@/src/entities/character/schema';
import { useCharacterGame } from '@/src/features/character/hooks/useCharacterGame';
import Image from 'next/image';

interface SearchBarProps {
    characters: Character[];
    disabled?: boolean; // เพิ่มบรรทัดนี้ (ใช้ ? เพราะเป็น Optional)
}

export const SearchBar = ({ characters, disabled = false }: SearchBarProps) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { addGuess, guesses } = useCharacterGame();
    const guessedIds = useMemo(() => new Set(guesses.map(g => g.guess.id)), [guesses]);

    const searchEngine = useMemo(() => createSearchEngine(characters), [characters]);
    const results = useMemo(() => {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) return [];

        return searchEngine
            .search(trimmedQuery)
            .filter(({ item }) => !guessedIds.has(item.id))
            .slice(0, 6);
    }, [query, searchEngine, guessedIds]);

    // reset active index ทุกครั้งที่ results เปลี่ยน
    useEffect(() => { setActiveIdx(-1); }, [results]);

    // ปิด dropdown ถ้าคลิกนอก
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (char: Character) => {
        addGuess(char.id);
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
        } else if (e.key === 'Enter' && activeIdx >= 0) {
            e.preventDefault();
            handleSelect(results[activeIdx].item);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (query.trim().length > 0) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [query]);

    return (
        <div ref={wrapRef} className="relative w-full max-w-sm">
            {/* Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    value={query}
                    disabled={disabled}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => { if (results.length) setIsOpen(true); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter Soul name…"
                    autoComplete="off"
                    className={[
                        'w-full py-2.5 pl-4 pr-10',
                        'bg-[#0e0e1a] text-[#d8d0c8] text-sm',
                        'border border-[#2a2a42] rounded-[3px]',
                        'placeholder:text-[#2e2e48]',
                        'outline-none transition-colors duration-150',
                        'focus:border-[#c8a96e]',
                        disabled && 'opacity-50 cursor-not-allowed'
                    ].join(' ')}
                />
                {/* search icon */}
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#3a3a52] text-sm">
                    卍
                </span>
            </div>

            {/* Dropdown */}
            {isOpen && results.length > 0 && (
                <ul
                    role="listbox"
                    className={[
                        'absolute top-[calc(100%+3px)] left-0 right-0 z-50',
                        'bg-[#0e0e1a] border border-[#2a2a42] rounded-[3px]',
                        'overflow-hidden',
                    ].join(' ')}
                >
                    {results.map(({ item }, idx) => (
                        <li
                            key={item.id}
                            role="option"
                            aria-selected={idx === activeIdx}
                            onMouseDown={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className={[
                                'flex items-center gap-2.5 px-4 py-2.5 cursor-pointer',
                                'text-sm border-b border-[#1a1a28] last:border-b-0',
                                'transition-colors duration-100',
                                idx === activeIdx
                                    ? 'bg-[#16162a] text-[#c8a96e]'
                                    : 'text-[#a0988e] hover:bg-[#13131e] hover:text-[#c8a96e]',
                            ].join(' ')}
                        >
                            <div className="relative w-8 h-8 shrink-0">
                                <Image
                                    src={`/assets/characters/${item.image}`} // เปลี่ยนตาม path ที่เก็บไฟล์จริงของคุณ
                                    alt={item.name}
                                    fill
                                    sizes="32px"
                                    className="rounded-[4px] object-cover border border-[#2a2a42]"
                                />
                            </div>
                            <span className={idx === activeIdx ? 'text-[#c8a96e]' : 'text-[#a0988e]'}>
                                {item.name}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};