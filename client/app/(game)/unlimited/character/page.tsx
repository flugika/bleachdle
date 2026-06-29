"use client";

import { useEffect, useState } from 'react';
import { SearchBar, GuessTable, useCharacterGame } from '@/src/features/character';
import { getCharacters } from '@/src/lib/utils/character';
import { GameOverModal } from '@/src/features/character/components/GameOverModal';
import { findDuplicateIds } from '@/src/lib/utils/checking';
import { HowToPlayModal } from '@/src/features/character/components/HowToPlayModal';
import { Tooltip } from '@/src/shared/ui/tooltip';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';

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
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            {/* ── Imperial Seal Divider ──────────────────────────────────────────── */}
            <div className="w-full flex items-center justify-center px-[5%] opacity-90">
                {/* เส้นทางซ้าย */}
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />

                {/* Premium Center - Geometric Seal */}
                <div className="mx-8 relative flex items-center justify-center">
                    {/* สัญลักษณ์ตราประทับตรงกลาง */}
                    <div className="w-6 h-6 border border-[#c8a96e] rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(200,169,110,0.3)] bg-black/20">
                        <div className="w-1.5 h-1.5 bg-[#c8a96e] rotate-0 shadow-[0_0_8px_#c8a96e]" />
                    </div>

                    {/* กราฟิกเสริมซ้าย-ขวา */}
                    <div className="absolute -left-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                    <div className="absolute -right-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                </div>

                {/* เส้นทางขวา */}
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
            </div>

            {/* ── Main content ────────────────────────────────────── */}
            <main className="max-w-[80%] mx-auto px-4 pb-16">

                <SubHeader title='REIRAKU PERCEPTION' description='System // Scanning for Reiatsu Signature' />

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
                    <Divider />
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
                                    className="inline-block w-2.5 h-2.5 rounded-[4px] shrink-0"
                                    style={{ background: bg, border: `1px solid ${border}` }}
                                />
                                <span className="text-[10px] tracking-wide text-[#d1a9a9]">{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Table — ไม่ scroll page, scroll เฉพาะ container นี้ */}
                {target ? (
                    <div className="w-full overflow-x-auto rounded-[4px]
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