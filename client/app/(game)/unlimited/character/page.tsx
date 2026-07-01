"use client";

import { useEffect, useState } from 'react';
import { GuessTable } from '@/src/features/character';
import { SearchBar } from '@/src/shared/ui/SearchBar';
import { useCharacterGame } from '@/src/features/character/hooks/unlimited/useCharacterGame';
import { getCharacters } from '@/src/lib/utils/character';
import { SummaryGuess } from '@/src/features/character/components/unlimited/SummaryGuess';
import { HowToPlayModal } from '@/src/features/character/components/shared/HowToPlayModal';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/features/character/components/unlimited/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/ModeBadge';

export default function UnlimitedCharacterGame() {
    if (!FEATURE_FLAGS.unlimited.character) {
        return (
            <Sealed />
        )
    }

    const game = useCharacterGame();

    const { target, guesses, initializeGame, finalizeGame, resetGame, hardReset, hasFinalized } = useCharacterGame();
    const characters = getCharacters();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({ currentStreak: 0, maxStreak: 0 });
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isGameCompleted, setIsGameCompleted] = useState(false);
    const MAX_GUESSES = 10;
    const remainingGuesses = Math.max(0, MAX_GUESSES - guesses.length);

    const [soulName, setSoulName] = useState('');
    const [inputName, setInputName] = useState('');
    const [reincarnationCount, setReincarnationCount] = useState(0);
    const canReset = soulName.trim().length > 0;

    const isWin = guesses.length > 0 &&
        (Object.entries(guesses[0].result)
            .filter(([key]) => key !== 'image')
            .every(([_, status]) => status === 'correct')
        );
    const isLoss = guesses.length >= 10 && !isWin;
    const isGameOver = isWin || isLoss;

    // ── 🛡️ จัดการโครงสร้างสถิติแบบ Object Nesting
    const updateStats = (won: boolean) => {
        const statsData = JSON.parse(localStorage.getItem('bleachdle-character-stats') || '{}');
        const saved = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

        const newStats = {
            currentStreak: won ? saved.currentStreak + 1 : 0,
            maxStreak: won ? Math.max(saved.maxStreak, saved.currentStreak + 1) : saved.maxStreak
        };

        statsData.unlimited = newStats;
        localStorage.setItem('bleachdle-character-stats', JSON.stringify(statsData));
        setStats(newStats);
    };

    // โหลดและซิงค์ข้อมูลฝั่ง Client จากคีย์หลักแบบไม่มีจุดทศนิยมต่อท้าย
    useEffect(() => {
        const statsData = JSON.parse(localStorage.getItem('bleachdle-character-stats') || '{}');
        setStats(statsData.unlimited || { currentStreak: 0, maxStreak: 0 });

        const completedData = JSON.parse(localStorage.getItem('bleachdle-character-completed') || '{}');
        const completed = completedData.unlimited || [];
        setIsGameCompleted(characters.length > 0 && completed.length >= characters.length);

        const registryData = JSON.parse(localStorage.getItem('bleachdle-soul-registry') || '{}');
        const registry = registryData.unlimited || { name: "", count: 0 };
        if (registry.name) {
            setSoulName(registry.name);
        }
        setReincarnationCount(registry.count || 0);

        initializeGame();
        setIsReady(true);
    }, [initializeGame, characters.length]);

    useEffect(() => {
        if (isReady) {
            const completedData = JSON.parse(localStorage.getItem('bleachdle-character-completed') || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(characters.length > 0 && completed.length >= characters.length);
        }
    }, [target, characters.length, isReady]);

    useEffect(() => {
        if (target) {
            console.log("target:", target);
        }
    }, [target]);

    useEffect(() => {
        if (isGameOver) {
            const timer = setTimeout(() => {
                // 1. ทำ Logic: บันทึกข้อมูลเฉพาะถ้ายังไม่เคยบันทึกมาก่อน (ป้องกัน Streak พุ่ง)
                if (!hasFinalized) {
                    finalizeGame(isWin);
                    updateStats(isWin);
                }

                // 2. ทำ UI: เปิด Modal ทุกครั้งที่โหลดหน้าเว็บหากเกมจบแล้ว
                setIsModalOpen(true);
            }, 2500); // ลดเวลาลงนิดหน่อยให้ UX ดูฉับไวขึ้นตอน Refresh

            return () => clearTimeout(timer);
        }
        // เราไม่ต้องกังวลเรื่อง hasFinalized ใน dependency เท่าไหร่ เพราะเงื่อนไขด้านในเช็คให้แล้ว
    }, [isGameOver, isWin, finalizeGame, hasFinalized]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetGame();
        initializeGame(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── 🛡️ ทะเบียนวิญญาณแบบจารึกรวมศูนย์
    const handleRegisterSoul = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        const registryData = JSON.parse(localStorage.getItem('bleachdle-soul-registry') || '{}');
        const currentRegistry = registryData.unlimited || { name: "", count: 0 };
        const updated = { ...currentRegistry, name: inputName.trim() };

        registryData.unlimited = updated;
        localStorage.setItem('bleachdle-soul-registry', JSON.stringify(registryData));
        setSoulName(inputName.trim());
    };

    // ── 🛡️ คอมโบ Reset ข้อมูลโดยการเจาะทำลายเฉพาะกิ่งก้านของโหมดตัวเอง
    const handleHardReset = () => {
        const statsData = JSON.parse(localStorage.getItem('bleachdle-character-stats') || '{}');
        const saved = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
        statsData.unlimited = { currentStreak: 0, maxStreak: saved.maxStreak };
        localStorage.setItem('bleachdle-character-stats', JSON.stringify(statsData));
        setStats(statsData.unlimited);

        const registryData = JSON.parse(localStorage.getItem('bleachdle-soul-registry') || '{}');
        const currentRegistry = registryData.unlimited || { name: "", count: 0 };
        registryData.unlimited = {
            ...currentRegistry,
            count: (currentRegistry.count || 0) + 1
        };
        localStorage.setItem('bleachdle-soul-registry', JSON.stringify(registryData));
        setReincarnationCount(registryData.unlimited.count);

        hardReset();
    };

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <div className="w-full flex items-center justify-center px-[5%] opacity-90">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
                <div className="mx-8 relative flex items-center justify-center">
                    <div className="w-6 h-6 border border-[#c8a96e] rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(200,169,110,0.3)] bg-black/20">
                        <div className="w-1.5 h-1.5 bg-[#c8a96e] rotate-0 shadow-[0_0_8px_#c8a96e]" />
                    </div>
                    <div className="absolute -left-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                    <div className="absolute -right-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                </div>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
            </div>

            <main className="max-w-[80%] mx-auto px-4 pb-16">
                <ModeBadge mode="unlimited" />
                <SubHeader title='REIRAKU PERCEPTION' description='System // Scanning for Reiatsu Signature' />

                {(!isModalOpen && target) && (
                    <div className="flex justify-center">
                        <SearchBar characters={characters} disabled={guesses.length >= 10 || !target} game={game}/>
                    </div>
                )}

                {!isModalOpen && (
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
                )}

                {guesses.length > 0 && (
                    <>
                        <Divider />
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                            {([
                                ['correct', '#0d2918', '#1a5530', '#4de880', 'Correct'],
                                ['partial', '#2a1f00', '#5a4000', '#e8b830', 'Partial'],
                                ['wrong', '#590e0e', '#a64747', '#3a2828', 'Wrong'],
                                ['dir', '#0a0a22', '#3a3a7a', '#7090f0', 'Higher ▲ / Lower ▼'],
                            ] as const).map(([key, bg, border, fg, label]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                    <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ background: bg, border: `1px solid ${border}` }} />
                                    <span className="text-[10px] tracking-wide text-[#d1a9a9]">{label}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {isModalOpen ? (
                    <SummaryGuess isOpen={isModalOpen} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="unlimited" stats={stats} />
                ) : !isReady ? (
                    <div className="mt-40 flex flex-col items-center justify-center animate-pulse">
                        <span className="text-4xl text-[#c8a96e] animate-spin mb-4">卍</span>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#5a5a78]">
                            Synchronizing Soul Spiritual Energy...
                        </p>
                    </div>
                ) : target ? (
                    <div className="w-full overflow-x-auto">
                        <GuessTable guesses={guesses} />
                    </div>
                ) : isGameCompleted ? (
                    <Central46ConfidentialArchive
                        guesses={guesses}
                        soulName={soulName}
                        inputName={inputName}
                        setInputName={setInputName}
                        handleRegisterSoul={handleRegisterSoul}
                        reincarnationCount={reincarnationCount}
                        canReset={canReset}
                        handleHardReset={handleHardReset}
                        stats={stats}
                    />
                ) : (
                    <div className="mt-40 flex flex-col items-center justify-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#5a5a78] animate-bounce">
                            Opening Senkaimon...
                        </p>
                    </div>
                )}
            </main>
            <HowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="unlimited" />
        </div>
    );
}