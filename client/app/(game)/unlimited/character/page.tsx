"use client";

import { useEffect, useState } from 'react';
import { CharacterGuessTable } from '@/src/features/character';
import { CharacterControlPanel } from '@/src/shared/ui/control-panel/CharacterControlPanel';
import { useCharacterGame } from '@/src/features/character/hooks/unlimited/useCharacterGame';
import { getCharacters } from '@/src/features/character/character';
import { CharacterSummaryGuess } from '@/src/features/character/components/shared/CharacterSummaryGuess';
import { HowToPlayModal } from '@/src/features/character/components/shared/HowToPlayModal';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/shared/ui/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { usePathname, useRouter } from 'next/navigation';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_CHARACTER_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';

export default function UnlimitedCharacterGame() {
    if (!FEATURE_FLAGS.unlimited.character) {
        return (
            <Sealed />
        )
    }

    const router = useRouter();
    const pathname = usePathname();
    const { navigate, state, reportReady } = useSenkaimon(); // 👈 ดึง state + reportReady มาด้วย ใช้คุม modal ตอน transition และแจ้งความพร้อมกลับไปที่ Senkaimon

    // 🛡️ เดิมเรียก useCharacterGame() 2 ครั้งแยกกัน (ตัวแปร game + destructure ซ้ำ)
    // ตอนนี้ subscribe ครั้งเดียว แล้วส่ง store object เดิมต่อให้ SearchBar ผ่าน prop `game`
    const gameStore = useCharacterGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hardReset, hasFinalized, _hasHydrated } = gameStore;
    const characters = getCharacters();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({ currentStreak: 0, maxStreak: 0 });
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isGameCompleted, setIsGameCompleted] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [finalRoundGuesses, setFinalRoundGuesses] = useState<typeof guesses>([]);

    // 🛡️ FIX (ปัญหา modal ค้าง): ปิด modal ทันทีที่ประตูเซนไกมงเริ่ม "closing"
    // ผูกกับ state ตรงๆ ไม่พึ่งลำดับการเรียกจาก handleSwitchDimension เพียงจุดเดียว
    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    const remainingGuesses = Math.max(0, MAX_CHARACTER_GUESSES - guesses.length);

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
        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
        const saved = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

        const newStats = {
            currentStreak: won ? saved.currentStreak + 1 : 0,
            maxStreak: won ? Math.max(saved.maxStreak, saved.currentStreak + 1) : saved.maxStreak
        };

        statsData.unlimited = newStats;
        localStorage.setItem(STORAGE_KEYS.CHARACTER_STATS, JSON.stringify(statsData));
        setStats(newStats);
    };

    // 🛡️ FIX: เพิ่ม _hasHydrated เข้า dependency + เงื่อนไข guard
    // effect นี้จะรอจน zustand persist rehydrate จาก localStorage เสร็จจริงก่อน ค่อยยิง initializeGame()
    // ต่อให้ effect ถูกยิงซ้ำ (StrictMode dev double-invoke / remount ตอนสลับหน้าผ่าน Senkaimon)
    // initializeGame() ที่ store ก็ idempotent อยู่แล้ว (เช็ค target ก่อนสุ่มใหม่) เลยไม่มีทางเบิ้ล target อีก
    useEffect(() => {
        if (!_hasHydrated) return;

        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
        setStats(statsData.unlimited || { currentStreak: 0, maxStreak: 0 });

        const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || '{}');
        const completed = completedData.unlimited || [];
        setIsGameCompleted(characters.length > 0 && completed.length >= characters.length);

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_REGISTRY) || '{}');
        const registry = registryData.unlimited || { name: "", count: 0 };
        if (registry.name) {
            setSoulName(registry.name);
        }
        setReincarnationCount(registry.count || 0);

        initializeGame();
        setIsReady(true);
    }, [initializeGame, characters.length, _hasHydrated]);

    // 🚪 FIX (ประตูเปิดก่อนหน้าพร้อม): แจ้ง NavigationContext กลับไปตอน "isReady" เป็น true จริงๆ
    // (คือหลัง zustand rehydrate + initializeGame() เสร็จสมบูรณ์) แทนที่จะปล่อยให้ระบบ
    // เปิดประตูเองผ่าน READY_FALLBACK_MS (1200ms) เท่านั้น — sync กับ pattern เดียวกับ DailyCharacterWrapper
    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    useEffect(() => {
        if (isReady) {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || '{}');
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
                    setFinalRoundGuesses(guesses);
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

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_REGISTRY) || '{}');
        const currentRegistry = registryData.unlimited || { name: "", count: 0 };
        const updated = { ...currentRegistry, name: inputName.trim() };

        registryData.unlimited = updated;
        localStorage.setItem(STORAGE_KEYS.CHARACTER_REGISTRY, JSON.stringify(registryData));
        setSoulName(inputName.trim());
    };

    // ── 🛡️ คอมโบ Reset ข้อมูลโดยการเจาะทำลายเฉพาะกิ่งก้านของโหมดตัวเอง
    const handleHardReset = () => {
        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
        const saved = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
        statsData.unlimited = { currentStreak: 0, maxStreak: saved.maxStreak };
        localStorage.setItem(STORAGE_KEYS.CHARACTER_STATS, JSON.stringify(statsData));
        setStats(statsData.unlimited);

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_REGISTRY) || '{}');
        const currentRegistry = registryData.unlimited || { name: "", count: 0 };
        registryData.unlimited = {
            ...currentRegistry,
            count: (currentRegistry.count || 0) + 1
        };
        localStorage.setItem(STORAGE_KEYS.CHARACTER_REGISTRY, JSON.stringify(registryData));
        setReincarnationCount(registryData.unlimited.count);

        hardReset();
    };

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        // 1. ปิด Modal เลือกโหมด
        setIsModeSelectorOpen(false);

        // 2. โยนเป้าหมายให้ระบบเซนไกมงจัดการคำนวณตำแหน่งและสลับมิติให้เองแบบไร้รอยต่อ
        navigate(targetMode);
    };

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[80%] mx-auto px-4 pb-16">
                <ModeBadge mode="unlimited" onClick={() => setIsModeSelectorOpen(true)} />
                <SubHeader title={BL_MODES_METADATA.character.title} subtitle={BL_MODES_METADATA.character.statusLine} />

                {/* 🛡️ เปลี่ยนจาก SearchBar + stats block แบบ manual (ซ้ำโค้ดกับ daily) มาใช้
                    CharacterControlPanel ตัวเดียวกับ daily — sync กับ isLimitReached fix ที่แก้ไปด้วย
                    (เดิม unlimited mode ไม่เคยผ่าน component นี้เลยบั๊กเลยไม่เคยโผล่) */}
                {!isModalOpen && (
                    <CharacterControlPanel
                        mode="unlimited"
                        target={target}
                        characters={characters}
                        remainingGuesses={remainingGuesses}
                        stats={stats}
                        game={gameStore}
                        maxGuesses={MAX_CHARACTER_GUESSES}
                        isGameOver={isGameOver}
                    />
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
                                    <span className="text-[12px] tracking-wide text-[#d1a9a9]">{label}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {isModalOpen ? (
                    <CharacterSummaryGuess isOpen={isModalOpen} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="unlimited" stats={stats} />
                ) : target ? (
                    <div className="w-full overflow-x-auto">
                        <CharacterGuessTable guesses={guesses} />
                    </div>
                ) : isGameCompleted ? (
                    <Central46ConfidentialArchive
                        mode="character"
                        guesses={finalRoundGuesses}
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
                        <p className="text-xs uppercase tracking-[0.2em] text-[#777796] animate-bounce">
                            Opening Senkaimon...
                        </p>
                    </div>
                )}
            </main>
            <HowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="unlimited" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}