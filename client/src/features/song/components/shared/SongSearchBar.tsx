// src/features/song/components/unlimited/SongSearchBar.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createSearchEngine } from '@/src/lib/search/fuzzy';
import { BleachSong } from '@/src/entities/song/schema';
import { SongGuessable } from '@/src/features/song/types';
import { Z } from '@/src/config/zIndex'; // 🎯 ใช้ z-index scale กลาง แทน hardcode z-50

interface SongSearchBarProps {
    songs: BleachSong[];
    disabled?: boolean;
    game: SongGuessable;
}

// 📏 ค่าคงที่สำหรับคำนวณ collision detection ของ dropdown — เหมือน SearchBar/ReleaseSearchBar เป๊ะ
// (ตอนนี้ SongSearchBar หน้ายาวพอไม่เจออาการ แต่ทำเผื่อไว้กันวันที่เนื้อหาหน้าสั้นลง/จอเล็กลง)
const DROPDOWN_MAX_HEIGHT = 360; // ต้องตรงกับ max-h เดิมที่เคยใส่ผ่าน className
const DROPDOWN_GAP = 8;          // ระยะห่างจาก input (บนหรือล่างแล้วแต่ทิศที่เปิด)

interface DropdownPosition {
    left: number;
    width: number;
    maxHeight: number;
    flipped: boolean;
    top?: number;
    bottom?: number;
}

export const SongSearchBar = ({ songs, disabled = false, game }: SongSearchBarProps) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    // 🩹 ตำแหน่ง + ทิศทางของ dropdown คำนวณเองจาก getBoundingClientRect แล้ว render ผ่าน portal
    // ด้วย position:fixed แทน absolute — กัน scrollbar หลอกของหน้า (fixed ไม่ถูกนับรวมเข้า
    // scrollHeight ของ ancestor ไหนเลย) และรองรับ flip ขึ้นด้านบนเมื่อพื้นที่ด้านล่างไม่พอ
    const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

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

    // 📍 อัปเดตตำแหน่ง + ทิศทาง dropdown ทุกครั้งที่เปิด, ตอน scroll (ของ ancestor ชั้นไหนก็ตาม
    // เลยใช้ capture: true), และตอน resize จอ
    //
    // 🔄 FLIP LOGIC: เช็คพื้นที่ว่างด้านล่าง input เทียบกับด้านบน — ถ้าด้านล่างไม่พอ
    // (เช่น input อยู่ใกล้ footer/ขอบจอ) และด้านบนมีที่ว่างมากกว่า ให้เปิด dropdown ขึ้นด้านบน
    // แทน (pattern เดียวกับ Radix/Headless UI Popover) พร้อมจำกัด maxHeight ตามพื้นที่จริง
    // ที่เหลือของทิศนั้นๆ ด้วย กันไม่ให้ dropdown ยื่นล้นขอบจอไปเลยไม่ว่าจะเปิดทิศไหน
    useEffect(() => {
        if (!isOpen) return;

        const updatePos = () => {
            const rect = wrapRef.current?.getBoundingClientRect();
            if (!rect) return;

            const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP;
            const spaceAbove = rect.top - DROPDOWN_GAP;
            const flipped = spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow;

            setDropdownPos({
                left: rect.left,
                width: rect.width,
                maxHeight: Math.max(0, Math.min(DROPDOWN_MAX_HEIGHT, flipped ? spaceAbove : spaceBelow)),
                flipped,
                top: flipped ? undefined : rect.bottom + DROPDOWN_GAP,
                bottom: flipped ? window.innerHeight - rect.top + DROPDOWN_GAP : undefined,
            });
        };

        updatePos();
        window.addEventListener('scroll', updatePos, true);
        window.addEventListener('resize', updatePos);
        return () => {
            window.removeEventListener('scroll', updatePos, true);
            window.removeEventListener('resize', updatePos);
        };
    }, [isOpen]);

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

            // 🌟 ปรับเปลี่ยนตรงนี้: เลื่อนหน้าจอไปที่ Audio Player แทน
            // ใช้ setTimeout เล็กน้อยเพื่อให้แน่ใจว่า DOM อัปเดตสถานะการเดาเสร็จสิ้นแล้ว
            setTimeout(() => {
                const playerEl = document.getElementById('song-audio-player');
                if (playerEl) {
                    playerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
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
                    className="relative w-full py-3.5 pl-5 pr-12 bg-[#050507] text-[#e2e2e5] text-xs font-medium tracking-[0.15em] uppercase border border-[#3d3d54] focus:outline-none focus:border-red-600/80 focus:text-white transition-all duration-300 placeholder-[#9898b3]"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <span className="text-[12px] text-[#9898b3] group-focus-within/input:text-red-500 tracking-widest transition-colors duration-300 font-mono">
                        卍
                    </span>
                </div>
            </div>

            {/* DROPDOWN MENU - LUXURY BLADE DESIGN — render ผ่าน portal ไป document.body ด้วย
                position:fixed เพื่อไม่ให้ถูกนับรวมเข้า scrollHeight ของหน้า และใช้ Z.dropdown
                แทน hardcode เพื่อการันตีว่าชนะทุก static layout (footer/nav/cursor) เสมอ */}
            {isOpen && results.length > 0 && dropdownPos && createPortal(
                <ul
                    style={{
                        position: 'fixed',
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                        maxHeight: dropdownPos.maxHeight,
                        top: dropdownPos.top,
                        bottom: dropdownPos.bottom,
                        zIndex: Z.dropdown,
                    }}
                    className="bg-[#050507] border border-red-900/40 overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-md"
                >
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
                                    'absolute left-0 top-0 bottom-0 w-[4px] bg-red-600 transition-all duration-300 scale-y-0 origin-center',
                                    isActive ? 'scale-y-100 shadow-[0_0_10px_#dc2626]' : ''
                                ].join(' ')} />

                                {/* STACKED TYPOGRAPHY LAYOUT */}
                                <div className="flex flex-col min-w-0 pr-4 transition-transform duration-200 group-hover:translate-x-1">
                                    {/* ชื่อเพลงหลัก (Bold & Clear) */}
                                    <span className={[
                                        'text-xs font-semibold tracking-wider uppercase truncate transition-colors duration-200 font-[family-name:var(--font-display)]',
                                        isActive
                                            ? 'text-red-500'
                                            : isGuessed
                                                ? 'text-[#916564] line-through'
                                                : 'text-[#d1d1d6]'
                                    ].join(' ')}>
                                        {item.title}
                                    </span>

                                    {/* ชื่อศิลปิน + อัลบั้ม (Subtitle Muted) */}
                                    <span className={[
                                        'text-[12px] mt-0.5 tracking-wide font-medium truncate transition-colors duration-200',
                                        isActive ? 'text-white/60' : 'text-[#555566]'
                                    ].join(' ')}>
                                        BY {item.artist}
                                        {item.album && (
                                            <span className={`font-black ${isActive} ? 'text-red-500/70' : 'text-[#444452]'`}>
                                                {' '}// {item.album.toUpperCase()}
                                            </span>
                                        )}
                                    </span>
                                </div>

                                {/* BADGE STATE */}
                                {isGuessed ? (
                                    <span className="ml-3 shrink-0 text-[10px] tracking-[0.2em] font-bold uppercase text-[#faaea7] border border-[#faaea7]/60 bg-red-950/20 px-2 py-0.5 shadow-[inset_0_0_6px_rgba(185,28,28,0.1)]">
                                        SEALED
                                    </span>
                                ) : (
                                    /* ดอทสีแดงสไตล์เป้าเล็งสำหรับการเลือก */
                                    <span className={[
                                        'ml-3 shrink-0 w-1 h-1 bg-red-500 transition-all duration-200 opacity-0 scale-50 rounded',
                                        isActive ? 'opacity-100 scale-100 shadow-[0_0_8px_#dc2626]' : ''
                                    ].join(' ')} />
                                )}
                            </li>
                        );
                    })}
                </ul>,
                document.body
            )}
        </div>
    );
};