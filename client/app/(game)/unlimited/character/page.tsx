"use client";

import { useEffect, useState } from 'react';
import { CharacterGuessTable } from '@/src/features/character';
import { CharacterControlPanel } from '@/src/shared/ui/control-panel/CharacterControlPanel';
import { useCharacterGame } from '@/src/features/character/hooks/unlimited/useCharacterGame';
import { getCharacters } from '@/src/features/character/character';
import { CharacterSummaryGuess } from '@/src/features/character/components/shared/CharacterSummaryGuess';
import { CharacterHowToPlayModal } from '@/src/features/character/components/shared/CharacterHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/shared/ui/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_UNLIMITED_CHARACTER_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';
import { EmptyGuessState } from '@/src/features/character/components/shared/EmptyGuessState';
import { logFullTarget } from '@/src/lib/debug/logFullTarget';

export default function UnlimitedCharacterGame() {
    if (!FEATURE_FLAGS.unlimited.character) {
        return <Sealed />;
    }

    const { navigate, state, reportReady } = useSenkaimon();

    // 🛡️ Subscribe Store เพียงครั้งเดียวเพื่อป้องกันปัญหา Re-render ซ้ำซ้อน
    const gameStore = useCharacterGame();
    const {
        target, guesses, initializeGame, finalizeGame, resetGame, hardReset,
        hasFinalized, _hasHydrated, resetStreakKeepMax, stats, loadStats
    } = gameStore;
    const characters = getCharacters();

    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isGameCompleted, setIsGameCompleted] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);
    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [finalRoundGuesses, setFinalRoundGuesses] = useState<typeof guesses>([]);

    const [soulName, setSoulName] = useState('');
    const [inputName, setInputName] = useState('');
    const [reincarnationCount, setReincarnationCount] = useState(0);
    const canReset = soulName.trim().length > 0;

    const remainingGuesses = Math.max(0, MAX_UNLIMITED_CHARACTER_GUESSES - guesses.length);

    // 🎯 คำนวณสถานะการแพ้/ชนะ (คงคุณลักษณะเฉพาะของระบบเปรียบเทียบฟิลด์ตัวละครไว้)
    const latestGuess = guesses[0];
    const isWin = guesses.length > 0 &&
        Object.entries(latestGuess.result)
            .filter(([key]) => key !== 'image')
            .every(([_, status]) => status === 'correct');

    const isLoss = guesses.length >= MAX_UNLIMITED_CHARACTER_GUESSES && !isWin;
    const isGameOver = isWin || isLoss;

    // ควบคุมการแสดงผลหน้าสรุปสถิติด้วยสถาปัตยกรรมแบบ Single Source of Truth
    const showSummary = _hasHydrated && isReady && isGameOver && !manuallyClosed && revealDelayDone;
    const isFreshFinish = Boolean(latestGuess?.isNew && isGameOver);

    // 🚪 ปิด Modal เลือกโหมดเมื่อระบบประตูเซนไกมงเริ่มเปลี่ยนสถานะ
    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    // รีเซ็ตสถานะหน้าต่างสรุปผลเมื่อเป้าหมายเกม (Target) มีการเปลี่ยนแปลง
    useEffect(() => {
        setManuallyClosed(false);
        logFullTarget(target);
        setRevealDelayDone(false);
    }, [target]);

    // ⏳ จัดการเอฟเฟกต์ความล่าช้าก่อนแสดงผลตั๋วสรุป (สดใหม่ vs รีเฟรชหน้าเก่า)
    useEffect(() => {
        if (!isGameOver) return;

        if (!isFreshFinish) {
            setRevealDelayDone(true);
            return;
        }

        const delay = 2500;
        const timer = setTimeout(() => setRevealDelayDone(true), delay);
        return () => clearTimeout(timer);
    }, [isGameOver, isFreshFinish, isWin]);

    // บันทึกและสรุปผลข้อมูลสถิติลงคลังระบบ
    useEffect(() => {
        if (_hasHydrated && isGameOver && !hasFinalized) {
            setFinalRoundGuesses(guesses);
            finalizeGame(isWin);
        }
    }, [isGameOver, hasFinalized, isWin, _hasHydrated, finalizeGame, guesses]);

    // 🛡️ รอกระบวนการ Hydration เสร็จสิ้นก่อนดึงประวัติมาใช้งานจากหน่วยความจำ
    useEffect(() => {
        if (!_hasHydrated) return;

        loadStats();

        const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || '{}');
        const completed = completedData.unlimited || [];
        setIsGameCompleted(characters.length > 0 && completed.length >= characters.length);

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const registry = registryData.character || { name: "", count: 0 };
        if (registry.name) {
            setSoulName(registry.name);
        }
        setReincarnationCount(registry.count || 0);

        initializeGame();
        setIsReady(true);
    }, [initializeGame, characters.length, _hasHydrated, loadStats]);

    // แจ้งการเชื่อมต่อระบบเซนไกมงเมื่อความพร้อมตัวแปรสมบูรณ์
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

    // 📜 เอฟเฟกต์เลื่อนหน้าจอกลับมาจุดบนสุดของ SubHeader เมื่อแสดงผลสรุป
    useEffect(() => {
        if (showSummary) {
            const timer = setTimeout(() => {
                const subHeaderEl = document.getElementById('game-sub-header');
                if (subHeaderEl) {
                    subHeaderEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [showSummary]);

    const handleCloseModal = () => {
        setManuallyClosed(true);
        resetGame();
        initializeGame(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRegisterSoul = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const currentRegistry = registryData.character || { name: "", count: 0 };
        const updated = { ...currentRegistry, name: inputName.trim() };

        registryData.character = updated;
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        setSoulName(inputName.trim());
    };

    const handleHardReset = () => {
        resetStreakKeepMax();

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const currentRegistry = registryData.character || { name: "", count: 0 };
        registryData.character = {
            ...currentRegistry,
            count: (currentRegistry.count || 0) + 1
        };
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        setReincarnationCount(registryData.character.count);

        hardReset();
    };

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[80%] mx-auto px-4 pb-24">
                <ModeBadge mode="unlimited" onClick={() => setIsModeSelectorOpen(true)} />

                {/* 🆕 ใส่ ID ครอบคอมโพเนนต์ส่วนหัวเรื่องสำหรับการทำ Smooth Scrolling */}
                <div id="game-sub-header">
                    <SubHeader title={BL_MODES_METADATA.character.title} subtitle={BL_MODES_METADATA.character.statusLine} />
                </div>

                {!showSummary && (
                    <CharacterControlPanel
                        mode="unlimited"
                        target={target}
                        characters={characters}
                        remainingGuesses={remainingGuesses}
                        stats={stats}
                        game={gameStore}
                        maxGuesses={MAX_UNLIMITED_CHARACTER_GUESSES}
                        isGameOver={isGameOver}
                    />
                )}

                {(guesses.length > 0 && !showSummary) && (
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

                {showSummary && target ? (
                    <CharacterSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} targetId={target.id} isWin={isWin} mode="unlimited" stats={stats} />
                ) : target ? (
                    <div className="w-full overflow-x-auto">
                        {guesses.length === 0 ? (
                            <EmptyGuessState
                                characters={characters}
                                targetId={target.id}
                                onRandomGuess={gameStore.addGuess}
                                disabled={isGameOver}
                            />
                        ) : (
                            <CharacterGuessTable guesses={guesses} />
                        )}
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

            <CharacterHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="unlimited" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}