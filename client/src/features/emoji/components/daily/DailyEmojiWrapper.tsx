// src/features/emoji/components/daily/DailyEmojiWrapper.tsx
"use client";

import { useEffect, useState } from 'react';
import { EmojiGuessTable } from '@/src/features/emoji/components/shared/EmojiGuessTable';
import { EmojiSummaryGuess } from '@/src/features/emoji/components/shared/EmojiSummaryGuess';
import { useEmojiGame } from '@/src/features/emoji/hooks/daily/useEmojiGame';
import { getCharacters } from '@/src/features/character/character';
import { EmojiHowToPlayModal } from '../shared/EmojiHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { EmojiTarget } from '@/src/features/emoji/types';
import { EmojiControlPanel } from '@/src/shared/ui/control-panel/EmojiControlPanel';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { BL_MODES_METADATA } from '@/src/config/mode';
import { MAX_DAILY_EMOJI_GUESSES } from '@/src/const/guess';
import { DailyHubModalFooter } from '@/src/shared/ui/daily-hub/DailyHubModalFooter';
import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { getEmojiSets } from '../../emoji';

export default function DailyEmojiWrapper({ initialTarget }: { initialTarget: EmojiTarget | null }) {
    if (!FEATURE_FLAGS.daily.emoji) {
        return <Sealed />;
    }

    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useEmojiGame();
    const {
        target, guesses, revealedCount, initializeGame, finalizeGame, resetGame,
        hasFinalized, _hasHydrated, stats, loadStats,
    } = gameStore;
    const characters = getCharacters();
    const emojiSets = getEmojiSets();
    const isSynced = target !== null && initialTarget !== null && target.id === initialTarget.id;

    const { markModePlayed } = useDailyHub();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            initializeGame(initialTarget);

            if (target && process.env.NODE_ENV !== 'production') {
                console.log('target:', useEmojiGame.getState().target);
            }
        }
    }, [initialTarget, _hasHydrated]);

    // 🆕 ถอดสเตตปิดเปิดหน้าต่างเก่าออก แล้วใช้คู่สเตตควบคุมรอบของ Silhouette
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

    // 🆕 ล้างสเตตฝั่ง UI ทันทีเมื่อวันใหม่เริ่มขึ้นหรือค่า ID ของเป้าหมายเปลี่ยน
    useEffect(() => {
        setManuallyClosed(false);
        setRevealDelayDone(false);
    }, [target?.id]);

    const remainingGuesses = Math.max(0, MAX_DAILY_EMOJI_GUESSES - guesses.length);
    const isWin = guesses.length > 0 && guesses[0].status === 'correct';
    const isLoss = guesses.length >= MAX_DAILY_EMOJI_GUESSES && !isWin;
    const isGameOver = isWin || isLoss;

    // 🆕 สลับมาควบคุมผ่าน Single Source of Truth ตัวแปรเดียว
    const showSummary = _hasHydrated && isReady && isGameOver && !manuallyClosed && revealDelayDone;

    const latestGuess = guesses[0];
    const isFreshFinish = Boolean(latestGuess?.isNew && isGameOver);

    // 🆕 ⏳ รักษา Logic หน่วงเวลาเปิดของโหมด Emoji ไว้คงเดิมอย่างแม่นยำ (2500ms นิ่งๆ)
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
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    // 🏁 บันทึกผลและสถิติประจำวันเข้าคลังระบบทันทีเมื่อเกมสิ้นสุด (แยกส่วนจาก UI หน่วงเวลาแอนิเมชัน)
    useEffect(() => {
        if (!_hasHydrated || !isSynced) return;
        if (isGameOver && !hasFinalized) {
            finalizeGame(isWin);
            markModePlayed('emoji', isWin);
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

    // 🆕 จัดการระบบเลื่อนจอ Smooth Scroll เมื่อหน้าสรุปคะแนนพร้อมถูกวาดลง DOM 
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
                    <SubHeader title={BL_MODES_METADATA.emoji.title} subtitle={BL_MODES_METADATA.emoji.statusLine} />
                </div>

                {!showSummary && (
                    <EmojiControlPanel
                        mode="daily"
                        target={target}
                        emojiSets={emojiSets}
                        revealedCount={revealedCount}
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
                                ['correct', '#0d2918', '#1a5530', '#4de880', 'Verified'],
                                ['wrong', '#2a1010', '#5a2020', '#a64747', 'Rejected'],
                            ] as const).map(([key, bg, border, fg, label]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                    <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ background: bg, border: `1px solid ${border}` }} />
                                    <span className="text-[12px] tracking-wide text-[#d1a9a9]">{label}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {showSummary ? (
                    <>
                        <EmojiSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="daily" stats={stats} />
                        <DailyHubModalFooter activeMode="emoji" />
                    </>
                ) : target && isSynced ? (
                    <div className="w-full overflow-x-auto">
                        <EmojiGuessTable guesses={guesses} />
                    </div>
                ) : (
                    <div className="mt-40 flex flex-col items-center justify-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#777796] animate-bounce">
                            Opening Senkaimon...
                        </p>
                    </div>
                )}
            </main>
            <EmojiHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="daily" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}