// app/unlimited/quote/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { QuoteGuessTable } from '@/src/features/quote/components/shared/QuoteGuessTable';
import { QuoteControlPanel } from '@/src/shared/ui/control-panel/QuoteControlPanel';
import { useQuoteGame } from '@/src/features/quote/hooks/unlimited/useQuoteGame';
import { getQuotes } from '@/src/features/quote/quote';
import { QuoteSummaryGuess } from '@/src/features/quote/components/shared/QuoteSummaryGuess';
import { QuoteHowToPlayModal } from '@/src/features/quote/components/shared/QuoteHowToPlayModal';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/shared/ui/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_UNLIMITED_QUOTE_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';

export default function UnlimitedQuoteGame() {
    // 🛡️ TODO: เพิ่ม key `quote: { daily: boolean; unlimited: boolean }` ใน feature.flags.ts
    if (!FEATURE_FLAGS.unlimited?.quote) {
        return <Sealed />;
    }

    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useQuoteGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hardReset, hasFinalized, _hasHydrated, resetStreakKeepMax, stats, loadStats } = gameStore;
    const quotes = getQuotes();

    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isGameCompleted, setIsGameCompleted] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);
    const [finalRoundGuesses, setFinalRoundGuesses] = useState<typeof guesses>([]);

    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    useEffect(() => {
        setManuallyClosed(false);
        if (target && process.env.NODE_ENV !== 'production') {
            console.log('target:', useQuoteGame.getState().target);
        }
        setRevealDelayDone(false);
    }, [target]);

    const remainingGuesses = Math.max(0, MAX_UNLIMITED_QUOTE_GUESSES - guesses.length);

    const [soulName, setSoulName] = useState('');
    const [inputName, setInputName] = useState('');
    const [reincarnationCount, setReincarnationCount] = useState(0);
    const canReset = soulName.trim().length > 0;

    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = guesses.length >= MAX_UNLIMITED_QUOTE_GUESSES && !isWin;
    const isGameOver = isWin || isLoss;
    const showSummary = _hasHydrated && isReady && isGameOver && !manuallyClosed && revealDelayDone;
    const latestGuess = guesses[0];
    const isFreshFinish = Boolean(latestGuess?.isNew && isGameOver);

    useEffect(() => {
        if (!isGameOver) return;

        if (!isFreshFinish) {
            setRevealDelayDone(true);
            return;
        }

        const delay = isWin ? 1600 : 900;
        const timer = setTimeout(() => setRevealDelayDone(true), delay);
        return () => clearTimeout(timer);
    }, [isGameOver, isFreshFinish, isWin]);

    useEffect(() => {
        if (_hasHydrated && isGameOver && !hasFinalized) {
            setFinalRoundGuesses(guesses);
            finalizeGame(isWin);
        }
    }, [isGameOver, hasFinalized, isWin, _hasHydrated, finalizeGame]);

    useEffect(() => {
        if (!_hasHydrated) return;

        loadStats();

        const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_COMPLETED) || '{}');
        const completed = completedData.unlimited || [];
        setIsGameCompleted(quotes.length > 0 && completed.length >= quotes.length);

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_REGISTRY) || '{}');
        const registry = registryData.unlimited || { name: "", count: 0 };
        if (registry.name) {
            setSoulName(registry.name);
        }
        setReincarnationCount(registry.count || 0);

        initializeGame();
        setIsReady(true);
    }, [initializeGame, quotes.length, _hasHydrated, loadStats]);

    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    useEffect(() => {
        if (isReady) {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_COMPLETED) || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(quotes.length > 0 && completed.length >= quotes.length);
        }
    }, [target, quotes.length, isReady]);

    const handleCloseModal = () => {
        setManuallyClosed(true);
        resetGame();
        initializeGame(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRegisterSoul = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_REGISTRY) || '{}');
        const currentRegistry = registryData.unlimited || { name: "", count: 0 };
        const updated = { ...currentRegistry, name: inputName.trim() };

        registryData.unlimited = updated;
        localStorage.setItem(STORAGE_KEYS.QOUTE_REGISTRY, JSON.stringify(registryData));
        setSoulName(inputName.trim());
    };

    const handleHardReset = () => {
        resetStreakKeepMax();

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_REGISTRY) || '{}');
        const currentRegistry = registryData.unlimited || { name: "", count: 0 };
        registryData.unlimited = {
            ...currentRegistry,
            count: (currentRegistry.count || 0) + 1
        };
        localStorage.setItem(STORAGE_KEYS.QOUTE_REGISTRY, JSON.stringify(registryData));
        setReincarnationCount(registryData.unlimited.count);

        hardReset();
    };

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    useEffect(() => {
        if (showSummary) {
            const timer = setTimeout(() => {
                const subHeaderEl = document.getElementById('game-sub-header');
                if (subHeaderEl) {
                    subHeaderEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100); // ดีเลย์ 100ms เพื่อให้ DOM จัดการ Layout สรุปผลเสร็จสิ้นก่อนเลื่อนหน้าจอ

            return () => clearTimeout(timer);
        }
    }, [showSummary]);

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[80%] mx-auto px-4 pb-24">
                <ModeBadge mode="unlimited" onClick={() => setIsModeSelectorOpen(true)} />
                <div id="game-sub-header">
                    <SubHeader title={BL_MODES_METADATA.quote.title} subtitle={BL_MODES_METADATA.quote.statusLine} />
                </div>

                {!showSummary && (
                    <QuoteControlPanel
                        mode="unlimited"
                        target={target}
                        quotes={quotes}
                        remainingGuesses={remainingGuesses}
                        stats={stats}
                        game={gameStore}
                        maxGuesses={MAX_UNLIMITED_QUOTE_GUESSES}
                        isGameOver={isGameOver}
                    />
                )}

                {(guesses.length > 0 && !showSummary) && (
                    <>
                        <Divider />
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                            {([
                                ['correct', '#0d2918', '#1a5530', '#4de880', 'Correct'],
                                ['wrong', '#590e0e', '#a64747', '#3a2828', 'Wrong'],
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
                    <QuoteSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="unlimited" stats={stats} />
                ) : target ? (
                    <div className="w-full overflow-x-auto">
                        <QuoteGuessTable guesses={guesses} />
                    </div>
                ) : isGameCompleted ? (
                    <Central46ConfidentialArchive
                        mode='quote'
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

            <QuoteHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="unlimited" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}