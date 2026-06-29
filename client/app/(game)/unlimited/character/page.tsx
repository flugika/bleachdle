"use client";

import { useEffect, useState } from 'react';
import { SearchBar, GuessTable, useCharacterGame } from '@/src/features/character';
import { getCharacters } from '@/src/lib/utils/character';
import { GameOverModal } from '@/src/features/character/components/GameOverModal';
import { findDuplicateIds } from '@/src/lib/utils/checking';
import { HowToPlayModal } from '@/src/features/character/components/HowToPlayModal';
import { Tooltip } from '@/src/shared/ui/tooltip';

export default function UnlimitedGame() {
    const { target, guesses, initializeGame, finalizeGame, resetGame } = useCharacterGame();
    const characters = getCharacters();
    const duplicates = findDuplicateIds(characters);
    if (duplicates.length > 0) {
        console.error("พบ ID ซ้ำในระบบ:", duplicates);
    }

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({ currentStreak: 0, maxStreak: 0 });
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const MAX_GUESSES = 10;
    const remainingGuesses = Math.max(0, MAX_GUESSES - guesses.length);

    // ใช้ useMemo เพื่อหาผลลัพธ์เกมล่าสุด
    const isWin = guesses.length > 0 &&
        (Object.entries(guesses[0].result)
            .filter(([key]) => key !== 'image') // ตัดฟิลด์ image ออกจากการตรวจสอบ
            .every(([_, status]) => status === 'correct')
        );
    const isLoss = guesses.length >= 10 && !isWin;
    const isGameOver = isWin || isLoss;

    const updateStats = (won: boolean) => {
        const saved = JSON.parse(localStorage.getItem('bleachdle-character-stats') || '{"currentStreak":0, "maxStreak":0}');

        const newStats = {
            currentStreak: won ? saved.currentStreak + 1 : 0,
            maxStreak: won ? Math.max(saved.maxStreak, saved.currentStreak + 1) : saved.maxStreak
        };

        localStorage.setItem('bleachdle-character-stats', JSON.stringify(newStats));
        setStats(newStats);
    };

    // โหลด Stats
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('bleachdle-character-stats') || '{"currentStreak":0, "maxStreak":0}');
        setStats(saved);
        initializeGame();
    }, [initializeGame]);

    useEffect(() => {
        if (target) {
            console.log("target:", target)
            console.log("bleachdle-character-completed:", localStorage.getItem('bleachdle-character-completed'))
            console.log("bleachdle-character-stats:", localStorage.getItem('bleachdle-character-stats'))
            console.log("bleachdle-character-progress:", localStorage.getItem('bleachdle-character-progress'))
        }
    }, [target])


    // จัดการ Logic การจบเกม
    const ANIMATION_DURATION = 3000;

    useEffect(() => {
        if (isGameOver) {
            const timer = setTimeout(() => {
                // 1. จัดการเรื่อง localStorage ผ่าน Store
                finalizeGame(isWin);

                // 2. จัดการเรื่อง Streak
                updateStats(isWin);

                // 3. เปิด Modal
                setIsModalOpen(true);
            }, ANIMATION_DURATION);
            return () => clearTimeout(timer);
        }
    }, [isLoss, isWin, finalizeGame]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetGame();
        initializeGame(true);
    };

    return (
        // full-viewport dark canvas — ไม่มี horizontal overflow
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">

            {/* ── Header ──────────────────────────────────────────── */}
            <header className="w-full border-b border-[#1e1e30]">
                <Tooltip content="System // How To Play" className="absolute top-4 right-4">
                    <button
                        onClick={() => setIsHowToOpen(true)}
                        className="text-[#c8a96e] opacity-70 hover:opacity-100 transition-opacity hover:cursor-pointer"
                        aria-label="How to play"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </button>
                </Tooltip>
                <div className="max-w-[80%] mx-auto px-4 py-6 flex flex-col items-center gap-1 text-center">
                    <p className="text-[10px] tracking-[0.35em] text-[#d1a9a9] font-medium uppercase"
                        style={{ fontFamily: "'Cinzel', serif" }}>
                        Soul Society Intelligence Division <br />
                    </p>
                    <h1 className="text-3xl font-bold tracking-[0.2em] text-[#c8a96e]"
                        style={{ fontFamily: "'Cinzel', serif" }}>
                        BLEACHDLE
                    </h1>
                    {/* thin gold rule */}
                    <div className="mt-2 w-20 h-px bg-[#c8a96e] opacity-40" />
                </div>
            </header>

            {/* ── Main content ────────────────────────────────────── */}
            <main className="max-w-[80%] mx-auto px-4 pb-16">

                {/* Prompt + counter */}
                <div className="mt-8 mb-6 text-center">
                    <p className="text-sm text-[#d1a9a9] tracking-widest uppercase"
                        style={{ fontFamily: "'Cinzel', serif" }}>
                        Identify a soul
                    </p>
                </div>

                <div className="flex justify-center">
                    <SearchBar characters={characters} disabled={guesses.length >= 10} />
                </div>

                <div className="flex justify-center gap-8 my-6 text-[11px] uppercase tracking-[0.2em] text-[#5a5a78]">
                    <div className="flex flex-col items-center">
                        <span className="text-[#d1a9a9]">Attempts Left</span>
                        <span className={`${remainingGuesses === 0 ? 'text-[#e83030]' : 'text-[#4de880]'} text-lg font-bold`}>
                            {remainingGuesses}
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[#d1a9a9]">Current Streaks</span>
                        <span className="text-[#c8a96e] text-lg font-bold">{stats.currentStreak}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[#d1a9a9]">Max Streaks</span>
                        <span className="text-[#c8a96e] text-lg font-bold">{stats.maxStreak}</span>
                    </div>
                </div>

                {/* Section divider */}
                {guesses.length > 0 && (
                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-[#786060]" />
                        <span className="text-[10px] text-[#786060] tracking-widest"
                            style={{ fontFamily: "'Cinzel', serif" }}>
                            卍
                        </span>
                        <div className="flex-1 h-px bg-[#786060]" />
                    </div>
                )}

                {/* Legend */}
                {guesses.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                        {([
                            ['correct', '#0d2918', '#1a5530', '#4de880', 'Correct'],
                            ['partial', '#2a1f00', '#5a4000', '#e8b830', 'Partial'],
                            ['wrong', '#590e0e', '#a64747', '#3a2828', 'Wrong'],
                            ['dir', '#0a0a22', '#3a3a7a', '#7090f0', 'Higher ▲ / Lower ▼'],
                        ] as const).map(([key, bg, border, fg, label]) => (
                            <div key={key} className="flex items-center gap-1.5">
                                <span
                                    className="inline-block w-2.5 h-2.5 rounded-[2px] shrink-0"
                                    style={{ background: bg, border: `1px solid ${border}` }}
                                />
                                <span className="text-[10px] tracking-wide text-[#d1a9a9]">{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Table — ไม่ scroll page, scroll เฉพาะ container นี้ */}
                {target ? (
                    <div className="w-full overflow-x-auto rounded-[2px]
                                    [&::-webkit-scrollbar]:h-1
                                    [&::-webkit-scrollbar-track]:bg-[#0e0e1a]
                                    [&::-webkit-scrollbar-thumb]:bg-[#2a2a40]
                                    [&::-webkit-scrollbar-thumb]:rounded-full">
                        <GuessTable guesses={guesses} />
                    </div>
                ) : (
                    <div className="mt-20 flex flex-col items-center animate-in fade-in duration-1000">
                        <div className="border-2 border-[#c8a96e] p-8 max-w-md text-center bg-black/40 backdrop-blur-md">
                            <span className="text-4xl">卍</span>
                            <h2 className="text-2xl font-bold text-[#c8a96e] mt-4 tracking-widest uppercase">
                                Bankai: Soul Master
                            </h2>
                            <p className="text-sm text-[#d1a9a9] mt-4 leading-relaxed">
                                You have successfully identified every soul in the Soul Society intelligence files.
                                Your dedication marks you as a true Captain of the Knowledge Division.
                            </p>
                            <button
                                onClick={() => finalizeGame(isWin)}
                                className="mt-8 border border-[#c8a96e] px-6 py-2 text-[10px] uppercase tracking-widest hover:bg-[#c8a96e] hover:text-black transition"
                            >
                                Reset Memory & Restart
                            </button>
                        </div>
                    </div>
                )}
            </main>
            <GameOverModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                guesses={guesses}
                target={target}
                isWin={isWin}
                stats={stats}
            />
            <HowToPlayModal
                isOpen={isHowToOpen}
                onClose={() => setIsHowToOpen(false)}
            />
        </div>
    );
}