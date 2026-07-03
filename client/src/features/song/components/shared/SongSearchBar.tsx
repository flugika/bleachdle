// src/features/song/components/unlimited/SongSearchBar.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createSearchEngine } from '@/src/lib/search/fuzzy';
import { BleachSong } from '@/src/entities/song/schema';
import { SongGuessable } from '@/src/features/song/types';

interface SongSearchBarProps {
    songs: BleachSong[];
    disabled?: boolean;
    game: SongGuessable;
}

export const SongSearchBar = ({ songs, disabled = false, game }: SongSearchBarProps) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);

    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { addGuess, guesses } = game;

    // รวบรวม ID เพลงที่เคยเดาไปแล้วเพื่อป้องกันการส่งซ้ำ
    const guessedIds = useMemo(
        () => new Set(guesses.map(g => g.guess.id)),
        [guesses]
    );

    // 🔥 ENTERPRISE SEARCH: ค้นหาแบบ 3 มิติผ่าน Title, Artist, และ Album (เช่นพิมพ์ "op-3" หรือ "special-ed" ก็เจอ)
    const searchEngine = useMemo(
        () => createSearchEngine(songs, { keys: ['title', 'artist', 'album'] }),
        [songs]
    );

    const results = useMemo(() => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return [];
        return searchEngine.search(trimmedQuery).slice(0, 10);
    }, [query, searchEngine]);

    useEffect(() => setActiveIdx(-1), [results]);

    // ปิดหน้าต่าง Dropdown เมื่อคลิกพื้นที่อื่นภายนอกคอมโพเนนต์
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const triggerScrollAndShake = (songId: string) => {
        const rowEl = document.getElementById(`row-${songId}`);
        if (!rowEl) return;

        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rowEl.classList.add(
            'animate-reiatsu-shake',
            'ring-1',
            'ring-red-600/70',
            'z-20'
        );

        setTimeout(() => {
            rowEl.classList.remove(
                'animate-reiatsu-shake',
                'ring-1',
                'ring-red-600/70',
                'z-20'
            );
        }, 600);
    };

    const handleSelect = (song: BleachSong) => {
        if (guessedIds.has(song.id)) {
            triggerScrollAndShake(song.id);
        } else {
            addGuess(song.id);
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
                {/* ขอบเงาสีแดงเลือดแบบบางซ่อนอยู่เบื้องหลัง */}
                <div className="absolute -inset-px bg-gradient-to-r from-red-900/0 via-red-600/0 to-red-900/0 group-focus-within/input:via-red-600/40 transition-all duration-500" />

                <input
                    ref={inputRef}
                    value={query}
                    disabled={disabled}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => results.length && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="ENTER TRACK, ARTIST, OR OP/ED..."
                    autoComplete="off"
                    className="relative w-full py-3.5 pl-5 pr-12 bg-[#050507] text-[#e2e2e5] text-xs font-medium tracking-[0.15em] uppercase border border-[#1a1a24] focus:outline-none focus:border-red-600/80 focus:text-white transition-all duration-300 placeholder-[#444452]"
                />

                {/* ไอคอนประดับสไตล์ดาบฟันวิญญาณ */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-[#444452] group-focus-within/input:text-red-500 tracking-widest transition-colors duration-300 font-mono">
                        卍
                    </span>
                </div>
            </div>

            {/* DROPDOWN MENU - LUXURY BLADE DESIGN */}
            {isOpen && results.length > 0 && (
                <ul className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-[#050507] border border-red-900/40 max-h-[360px] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md">
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
                                {/* เอฟเฟกต์เส้นขอบคมดาบวิ่งด้านข้างตอน Hover */}
                                <div className={[
                                    'absolute left-0 top-0 bottom-0 w-[2px] bg-red-600 transition-all duration-300 scale-y-0 origin-center',
                                    isActive ? 'scale-y-100 shadow-[0_0_8px_#dc2626]' : ''
                                ].join(' ')} />

                                {/* STACKED TYPOGRAPHY LAYOUT */}
                                <div className="flex flex-col min-w-0 pr-4 transition-transform duration-200 group-hover:translate-x-1">
                                    {/* ชื่อเพลงหลัก (Bold & Clear) */}
                                    <span className={[
                                        'text-xs font-semibold tracking-wider uppercase truncate transition-colors duration-200',
                                        isActive
                                            ? 'text-red-500'
                                            : isGuessed
                                                ? 'text-[#444452] line-through'
                                                : 'text-[#d1d1d6]'
                                    ].join(' ')}>
                                        {item.title}
                                    </span>

                                    {/* ชื่อศิลปิน + อัลบั้ม (Subtitle Muted) */}
                                    <span className={[
                                        'text-[10px] mt-0.5 tracking-wide font-medium truncate transition-colors duration-200',
                                        isActive ? 'text-white/60' : 'text-[#555566]'
                                    ].join(' ')}>
                                        BY {item.artist}
                                        {item.album && (
                                            <span className={isActive ? 'text-red-500/70' : 'text-[#444452]'}>
                                                {' '}// {item.album.toUpperCase()}
                                            </span>
                                        )}
                                    </span>
                                </div>

                                {/* BADGE STATE */}
                                {isGuessed ? (
                                    <span className="ml-3 shrink-0 text-[8px] tracking-[0.2em] font-bold uppercase text-red-500/80 border border-red-900/60 bg-red-950/20 px-2 py-0.5 shadow-[inset_0_0_4px_rgba(185,28,28,0.1)]">
                                        ECHOED
                                    </span>
                                ) : (
                                    /* ดอทสีแดงสไตล์เป้าเล็งสำหรับการเลือก */
                                    <span className={[
                                        'ml-3 shrink-0 w-1 h-1 bg-red-500 transition-all duration-200 opacity-0 scale-50 rounded',
                                        isActive ? 'opacity-100 scale-100 shadow-[0_0_6px_#dc2626]' : ''
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