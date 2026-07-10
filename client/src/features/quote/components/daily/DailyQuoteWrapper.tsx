// src/features/quote/components/daily/DailyQuoteWrapper.tsx
"use client";

import { useEffect, useState } from 'react';
import { QuoteGuessTable } from '@/src/features/quote/components/shared/QuoteGuessTable';
import { QuoteSummaryGuess } from '@/src/features/quote/components/shared/QuoteSummaryGuess';
import { useQuoteGame } from '@/src/features/quote/hooks/daily/useQuoteGame';
import { QuoteHowToPlayModal } from '../shared/QuoteHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { QuoteTarget } from '@/src/features/quote/types';
import { QuoteControlPanel } from '@/src/shared/ui/control-panel/QuoteControlPanel';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { BL_MODES_METADATA } from '@/src/config/mode';
import { MAX_DAILY_QUOTE_GUESSES } from '@/src/const/guess';
import { DailyHubModalFooter } from '@/src/shared/ui/daily-hub/DailyHubModalFooter';
import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { getQuotes } from '../../quote';

export default function DailyQuoteWrapper({ initialTarget }: { initialTarget: QuoteTarget | null }) {
    if (!FEATURE_FLAGS.daily.quote) {
        return <Sealed />;
    }

    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useQuoteGame();
    // 🆕 initializeGame(target) ตัวเดิมถูกแทนด้วย setTarget(target) — factory ของ daily
    // ไม่มี initializeGame แล้ว (ไม่มี concept "สุ่มตัวใหม่" ใน daily อยู่แล้วแต่แรก)
    // reconcile วันเดิม/วันใหม่ทำอยู่ข้างใน setTarget ของ store เอง เหมือนที่ Silhouette daily ทำ
    const { target, guesses, setTarget, finalizeGame, resetGame, hasFinalized, _hasHydrated, stats, loadStats } = gameStore;
    const quotes = getQuotes();
    const isSynced = target !== null && initialTarget !== null && target.id === initialTarget.id;

    const { markModePlayed } = useDailyHub();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            setTarget(initialTarget);

            if (target && process.env.NODE_ENV !== 'production') {
                console.log('target:', useQuoteGame.getState().target);
            }
        }
    }, [initialTarget, _hasHydrated]);

    // 🆕 นำสเตตควบคุม UI แบบระบุเงื่อนไขรอบของ Silhouette มาแทนที่ตำแหน่งเดิม
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

    // 🆕 เคลียร์สเตตฝั่ง UI ทันทีเมื่อวันใหม่มาถึงหรือ Target ID สลับตัว
    useEffect(() => {
        setManuallyClosed(false);
        setRevealDelayDone(false);
    }, [target?.id]);

    // 🎯 คำนวณสถิติตามเงื่อนไขเดิม
    const remainingGuesses = Math.max(0, MAX_DAILY_QUOTE_GUESSES - guesses.length);
    const isWin = guesses.length > 0 && guesses[0].status === 'correct';
    const isLoss = guesses.length >= MAX_DAILY_QUOTE_GUESSES && !isWin;
    const isGameOver = isWin || isLoss;

    // 🆕 ประกาศสถานะแสดงกล่องสรุปผลอิงตามสถานะจริงของเกมตัวแปรเดียว
    const showSummary = _hasHydrated && isReady && isGameOver && !manuallyClosed && revealDelayDone;

    const latestGuess = guesses[0];
    const isFreshFinish = Boolean(latestGuess?.isNew && isGameOver);

    // 🆕 ⏳ รักษา Logic ดีเลย์ของ Quote ไว้คงเดิมเด๊ะๆ (2500ms นิ่งๆ เท่ากันทุกกรณี)
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

    // 🆕 initializeGame() ตัวเดิมเป็น no-op เสมอ (เรียกไม่มี target อาร์กิวเมนต์ →
    // implementation เดิม `if (!target) return;` return ทันที) ตัดทิ้งไปเลย เหลือแค่
    // loadStats + ประกาศพร้อม
    useEffect(() => {
        if (!_hasHydrated) return;
        loadStats();
        setIsReady(true);
    }, [_hasHydrated, loadStats]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    // 🏁 บันทึกสถานะการเล่น/สถิติประจำวันทันทีแบบไม่ต้องรอดีเลย์ UI หน่วงเวลา (Pattern สำคัญของ Silhouette)
    useEffect(() => {
        if (!_hasHydrated || !isSynced) return;
        if (isGameOver && !hasFinalized) {
            finalizeGame(isWin);
            markModePlayed('quote', isWin);
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

    // 🆕 ตัวจับการเลื่อนจอสมูทสลับมาผูกพิกัดตามตัวแปร showSummary
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
                    <SubHeader title={BL_MODES_METADATA.quote.title} subtitle={BL_MODES_METADATA.quote.statusLine} />
                </div>

                {!showSummary && (
                    <QuoteControlPanel
                        mode="daily"
                        target={target}
                        quotes={quotes}
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
                        <QuoteSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="daily" stats={stats} />
                        <DailyHubModalFooter activeMode="quote" />
                    </>
                ) : target && isSynced ? (
                    <div className="w-full overflow-x-auto">
                        <QuoteGuessTable guesses={guesses} />
                    </div>
                ) : (
                    <div className="mt-40 flex flex-col items-center justify-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#777796] animate-bounce">
                            Opening Senkaimon...
                        </p>
                    </div>
                )}
            </main>
            <QuoteHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="daily" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}