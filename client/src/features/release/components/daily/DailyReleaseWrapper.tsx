// src/features/release/components/daily/DailyReleaseWrapper.tsx
"use client";

import { useEffect, useState } from 'react';
import { ReleaseGuessTable } from '@/src/features/release/components/shared/ReleaseGuessTable';
import { ReleaseSummaryGuess } from '@/src/features/release/components/shared/ReleaseSummaryGuess';
import { useReleaseGame } from '@/src/features/release/hooks/daily/useReleaseGame';
import { ReleaseHowToPlayModal } from '../shared/ReleaseHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ReleaseTargetHidden } from '@/src/features/release/types';
import { ReleaseControlPanel } from '@/src/shared/ui/control-panel/ReleaseControlPanel';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { BL_MODES_METADATA } from '@/src/config/mode';
import { MAX_DAILY_RELEASE_GUESSES } from '@/src/const/guess';
import { DailyHubModalFooter } from '@/src/shared/ui/daily-hub/DailyHubModalFooter';
import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { getReleases } from '../../release';
import { logFullTarget } from '@/src/lib/debug/logFullTarget';

export default function DailyReleaseWrapper({ initialTarget }: { initialTarget: ReleaseTargetHidden | null }) {
    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useReleaseGame();
    const { target, revealedCharacter, guesses, setTarget, finalizeGame, resetGame, hasFinalized, _hasHydrated, stats, loadStats } = gameStore;
    const releases = getReleases();
    // 🎯 sync check เทียบ target.id ตรงๆ — เหมือน quote (ทั้งคู่ reconcile ด้วย .id ของ target)
    const isSynced = target !== null && initialTarget !== null && target.id === initialTarget.id;

    const { markModePlayed } = useDailyHub();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            setTarget(initialTarget);

            logFullTarget(target);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with server-provided target only
    }, [initialTarget, _hasHydrated]);

    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);

    useEffect(() => {
        if (state === "closing") setIsModeSelectorOpen(false);
    }, [state]);

    useEffect(() => {
        setManuallyClosed(false);
        setRevealDelayDone(false);
    }, [target?.id]);

    const remainingGuesses = Math.max(0, MAX_DAILY_RELEASE_GUESSES - guesses.length);
    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = guesses.length >= MAX_DAILY_RELEASE_GUESSES && !isWin;
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
        const delay = isWin ? 1600 : 900; // 🎯 ใช้ delay เดียวกับ unlimited release ไม่ใช่ quote (2500ms)
        const timer = setTimeout(() => setRevealDelayDone(true), delay);
        return () => clearTimeout(timer);
    }, [isGameOver, isFreshFinish, isWin]);

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        loadStats();
        setIsReady(true);
    }, [_hasHydrated, loadStats]);

    useEffect(() => {
        if (isReady) reportReady();
    }, [isReady, reportReady]);

    useEffect(() => {
        if (!_hasHydrated || !isSynced) return;
        if (isGameOver && !hasFinalized) {
            finalizeGame(isWin);
            markModePlayed('release', isWin);
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
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (showSummary) {
            const timer = setTimeout(() => {
                document.getElementById('game-sub-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showSummary]);

    if (!FEATURE_FLAGS.daily?.release) {
        return <Sealed />;
    }

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header />

            <main className="max-w-[80%] mx-auto px-4 pb-24">
                <ModeBadge mode="daily" onClick={() => setIsModeSelectorOpen(true)} />
                <div id="game-sub-header">
                    <SubHeader title={BL_MODES_METADATA.release.title} subtitle={BL_MODES_METADATA.release.statusLine} />
                </div>

                {!showSummary && (
                    <ReleaseControlPanel
                        mode="daily"
                        target={target}
                        releases={releases}
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
                                ['correct', '#0d2918', '#1a5530', 'Correct'],
                                ['wrong', '#590e0e', '#a64747', 'Wrong'],
                            ] as const).map(([key, bg, border, label]) => (
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
                        {/* 🩹 เดิมไม่ได้ส่ง revealedCharacter เข้ามาเลย ทั้งที่ destructure จาก
                            gameStore ไว้แล้วด้านบน — component เลยต้องพึ่ง `target` (hidden)
                            แทนของเต็ม ตอนนี้ต้องส่งทั้งคู่แยกกันตามสัญญาใหม่ */}
                        <ReleaseSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} revealedCharacter={revealedCharacter} isWin={isWin} mode="daily" stats={stats} />
                        <DailyHubModalFooter activeMode="release" />
                    </>
                ) : target && isSynced ? (
                    <div className="max-w-full mx-auto overflow-x-auto">
                        <ReleaseGuessTable guesses={guesses} />
                    </div>
                ) : (
                    <div className="mt-40 flex flex-col items-center justify-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#777796] animate-bounce">
                            Opening Senkaimon...
                        </p>
                    </div>
                )}
            </main>

            <ReleaseHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="daily" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}