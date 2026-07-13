// src/features/character/components/daily/DailyCharacterWrapper.tsx
"use client";

import { useEffect, useState } from 'react';
import { CharacterGuessTable } from '@/src/features/character';
import { useCharacterGame } from '@/src/features/character/hooks/daily/useCharacterGame';
import { getCharacters } from '@/src/features/character/character';
import { CharacterSummaryGuess } from '@/src/features/character/components/shared/CharacterSummaryGuess';
import { CharacterHowToPlayModal } from '@/src/features/character/components/shared/CharacterHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { Character } from '@/src/entities/character/schema';
import { CharacterControlPanel } from '@/src/shared/ui/control-panel/CharacterControlPanel';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { usePathname, useRouter } from 'next/navigation';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';
import { MAX_DAILY_CHARACTER_GUESSES } from '@/src/const/guess';
import { DailyHubModalFooter } from '@/src/shared/ui/daily-hub/DailyHubModalFooter';
import { useDailyHub } from '@/src/shared/hooks/useDailyHub';

export default function DailyCharacterWrapper({ initialTarget }: { initialTarget: Character | null }) {
    if (!FEATURE_FLAGS.daily.character) {
        return <Sealed />;
    }

    const router = useRouter();
    const pathname = usePathname();
    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useCharacterGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hasFinalized, _hasHydrated, stats, loadStats } = gameStore;
    const characters = getCharacters();
    const isSynced = target !== null && initialTarget !== null && target.id === initialTarget.id;

    const { markModePlayed } = useDailyHub();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            initializeGame(initialTarget);

            if (target && process.env.NODE_ENV !== 'production') {
                console.log('target:', useCharacterGame.getState().target);
            }
        }
    }, [initialTarget, _hasHydrated]);

    // 🆕 เปลี่ยนจากสเตตเปิด/ปิดกล่องสรุปแบบเดิม มาใช้คู่สเตตควบคุมรอบสรุปผลของ Silhouette
    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);

    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);

    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    // 🆕 เคลียร์สถานะ UI ประจำวันใหม่ทันทีหาก ID ของเป้าหมายเปลี่ยนตัวไป
    useEffect(() => {
        setManuallyClosed(false);
        setRevealDelayDone(false);
    }, [target?.id]);

    // 🎯 รักษาเงื่อนไขคำนวณ Remaining และสเตตัสการตรวจคำตอบคุณลักษณะ (Properties) ของโมเดลเดิมไว้ทั้งหมด
    const remainingGuesses = Math.max(0, MAX_DAILY_CHARACTER_GUESSES - guesses.length);
    const isWin = guesses.length > 0 &&
        (Object.entries(guesses[0].result)
            .filter(([key]) => key !== 'image')
            .every(([_, status]) => status === 'correct')
        );
    const isLoss = guesses.length >= MAX_DAILY_CHARACTER_GUESSES && !isWin;
    const isGameOver = isWin || isLoss;

    // 🆕 สลับมาควบคุมผ่าน Single Source of Truth ตัวแปรเดียว
    const showSummary = _hasHydrated && isReady && isGameOver && !manuallyClosed && revealDelayDone;

    const latestGuess = guesses[0];
    const isFreshFinish = Boolean(latestGuess?.isNew && isGameOver);

    // 🆕 ⏳ รักษาค่าหน่วงเวลาแอนิเมชันเปิดกล่องของหน้าตัวละครไว้คงเดิม (2500ms นิ่งๆ)
    useEffect(() => {
        if (!isGameOver) return;

        if (!isFreshFinish) {
            setRevealDelayDone(true);
            return;
        }

        const targetDelay = 2500;
        const timer = setTimeout(() => setRevealDelayDone(true), targetDelay);
        return () => clearTimeout(timer);
    }, [isGameOver, isFreshFinish]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        loadStats();
        initializeGame();
        setIsReady(true);
    }, [initializeGame, characters.length, _hasHydrated, loadStats]);

    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    // 🏁 บันทึกประวัติและสถิติการเล่นเข้า Store ทันทีเมื่อเกมจบจริง (ไม่ต้องโดนบล็อกจากระบบหน่วงเวลาฝั่ง UI)
    useEffect(() => {
        if (!_hasHydrated || !isSynced) return;
        if (isGameOver && !hasFinalized) {
            finalizeGame(isWin);
            markModePlayed('character', isWin);
        }
    }, [isGameOver, hasFinalized, isWin, _hasHydrated, isSynced, finalizeGame, markModePlayed]);

    const handleCloseModal = () => {
        setManuallyClosed(true);
        resetGame();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            const diff = midnight.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // 🆕 จัดการพิกัดเลื่อนจอ Smooth Scroll เมื่อหน้าสรุปสถิติดำเนินการวาดลง DOM เรียบร้อย
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

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[80%] mx-auto px-4 pb-24">
                <ModeBadge mode="daily" onClick={() => setIsModeSelectorOpen(true)} />
                <div id="game-sub-header">
                    <SubHeader title={BL_MODES_METADATA.character.title} subtitle={BL_MODES_METADATA.character.statusLine} />
                </div>

                {/* เปลี่ยนการเช็คสวิตช์ซ่อนหน้าควบคุมหลักไปอิงจาก !showSummary */}
                {!showSummary && (
                    <CharacterControlPanel
                        mode="daily"
                        target={target}
                        characters={characters}
                        stats={stats}
                        timeLeft={timeLeft}
                        game={gameStore}
                        isGameOver={isGameOver}
                        remainingGuesses={remainingGuesses}
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
                    <>
                        <CharacterSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} targetId={target.id} isWin={isWin} mode="daily" stats={stats} />
                        <DailyHubModalFooter activeMode="character" />
                    </>
                ) : target && isSynced ? (
                    <div className="w-full overflow-x-auto">
                        <CharacterGuessTable guesses={guesses} />
                    </div>
                ) : (
                    <div className="mt-40 flex flex-col items-center justify-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#777796] animate-bounce">
                            Opening Senkaimon...
                        </p>
                    </div>
                )}
            </main>
            <CharacterHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="daily" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}