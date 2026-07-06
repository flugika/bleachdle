"use client";

import { useEffect, useState } from 'react';
import { QuoteGuessTable } from '@/src/features/quote/components/shared/QuoteGuessTable';
import { QuoteSummaryGuess } from '@/src/features/quote/components/shared/QuoteSummaryGuess';
import { useQuoteGame } from '@/src/features/quote/hooks/daily/useQuoteGame';
import { getCharacters } from '@/src/features/character/character';
import { QuoteHowToPlayModal } from '../shared/QuoteHowToPlayModal';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { QuoteTarget } from '@/src/features/quote/types';
import { QuoteControlPanel } from '@/src/shared/ui/control-panel/QuoteControlPanel';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';
// 📅 Daily Hub: แถบ progress รวมทุกโหมด daily + CTA เล่นต่อ
import { DailyHubModalFooter } from '@/src/shared/ui/daily-hub/DailyHubModalFooter';
import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { getQuotes } from '../../quote';

export default function DailyQuoteWrapper({ initialTarget }: { initialTarget: QuoteTarget | null }) {
    if (!FEATURE_FLAGS.daily.quote) {
        return (
            <Sealed />
        )
    }

    const { navigate, state, reportReady } = useSenkaimon(); // 👈 ดึง state + reportReady มาด้วย ใช้คุม modal ตอน transition และแจ้งความพร้อมกลับไปที่ Senkaimon

    const gameStore = useQuoteGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hasFinalized, _hasHydrated } = gameStore;
    const characters = getCharacters();
    const quotes = getQuotes();
    const isSynced = target !== null && initialTarget !== null && target.id === initialTarget.id;
    const stats = useQuoteGame(s => s.stats);
    const loadStats = useQuoteGame(s => s.loadStats);

    // 📅 Daily Hub: markModePlayed('quote', won) จะถูกเรียกตอนเกมจบจริงเท่านั้น (ดู effect ด้านล่าง)
    const { markModePlayed } = useDailyHub();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            initializeGame(initialTarget);

            if (target && process.env.NODE_ENV !== 'production') {
                console.log('target:', useQuoteGame.getState().target);
            }
        }
    }, [initialTarget, _hasHydrated]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [isSurrendered, setIsSurrendered] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);

    // 🛡️ FIX (ปัญหา modal ค้าง): ปิด modal ทันทีที่ประตูเซนไกมงเริ่ม "closing"
    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    // 🗨️ Quote mode is binary (correct/wrong), not a multi-field comparison like
    // character mode — a win is just "the most recent guess is correct".
    const isWin = guesses.length > 0 && guesses[0].status === 'correct';
    const isLoss = isSurrendered || (hasFinalized && !isWin);
    const isGameOver = isWin || isLoss;

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    // โหลดและซิงค์ข้อมูลฝั่ง Client จากคีย์หลักแบบไม่มีจุดทศนิยมต่อท้าย
    useEffect(() => {
        if (!_hasHydrated) return;
        loadStats();

        initializeGame();
        setIsReady(true);
    }, [initializeGame, characters.length, _hasHydrated, loadStats]);

    useEffect(() => {
        loadStats(); // โหลด stats จาก localStorage เข้า store ครั้งเดียวตอน mount
    }, [loadStats]);

    // 🚪 แจ้ง NavigationContext กลับไปตอน "isReady" เป็น true จริงๆ (หลัง rehydrate + initializeGame เสร็จ)
    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!isSynced) return; // ยังไม่ reconcile เสร็จ ห้ามตัดสินใจจาก guesses/hasFinalized ตอนนี้

        if (isGameOver) {
            if (hasFinalized) {
                setIsModalOpen(true);
                return;
            }

            const targetDelay = isSurrendered ? 0 : 2500;
            const timer = setTimeout(() => {
                if (!hasFinalized) {
                    finalizeGame(isWin);
                    markModePlayed('quote', isWin);
                }
                setIsModalOpen(true);
            }, targetDelay);

            return () => clearTimeout(timer);
        }
    }, [isGameOver, isWin, finalizeGame, hasFinalized, _hasHydrated, isSurrendered, isSynced]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsSurrendered(false);
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

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[80%] mx-auto px-4 pb-16">
                <ModeBadge mode="daily" onClick={() => setIsModeSelectorOpen(true)} />
                <SubHeader title={BL_MODES_METADATA.quote.title} subtitle={BL_MODES_METADATA.quote.statusLine} />

                {/* 📅 Daily Hub: ตั้งใจไม่โชว์บนหน้าเล่นเกม — ให้โผล่แค่ตอนจบเกม */}
                {!isModalOpen && (
                    <QuoteControlPanel
                        mode="daily"
                        target={target}
                        quotes={quotes}
                        stats={stats}
                        timeLeft={timeLeft}
                        game={gameStore}
                        isGameOver={isGameOver}
                        onSurrender={() => setIsSurrendered(true)}
                    />
                )}

                {guesses.length > 0 && (
                    <>
                        <Divider />
                        {/* 🗨️ Legend เหลือแค่ correct/wrong ตามธรรมชาติของ quote mode
                            (ไม่มี partial/higher-lower เหมือน character ที่เทียบทีละ field) */}
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

                {isModalOpen ? (
                    <>
                        <QuoteSummaryGuess isOpen={isModalOpen} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="daily" stats={stats} />
                        {/* 📅 Daily Hub: CTA "เล่นต่อ" ต่อท้ายการ์ดสรุปผล */}
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