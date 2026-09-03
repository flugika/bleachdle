// src/features/release/components/unlimited/UnlimitedReleaseWrapper.tsx
//
// 🆕 changes: same as UnlimitedCharacterWrapper/UnlimitedSongWrapper —
//   1. registerSoulName() no longer takes gameMode (global on players.soul_name).
//   2. On mount, backfill this mode's local name from the global name if
//      this mode never had one saved locally.
"use client";

import { useEffect, useState } from 'react';
import { ReleaseGuessTable } from '@/src/features/release/components/shared/ReleaseGuessTable';
import { ReleaseControlPanel } from '@/src/shared/ui/control-panel/ReleaseControlPanel';
import { useReleaseGame } from '@/src/features/release/hooks/unlimited/useReleaseGame';
import { getReleasableItems, getReleases } from '@/src/features/release/release';
import { ReleaseSummaryGuess } from '@/src/features/release/components/shared/ReleaseSummaryGuess';
import { ReleaseHowToPlayModal } from '@/src/features/release/components/shared/ReleaseHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/shared/ui/control-panel/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_UNLIMITED_RELEASE_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';
import { logFullTarget } from '@/src/lib/debug/logFullTarget';
import { Legend } from '@/src/shared/ui/control-panel/Legend';
import { SyncEngine } from '@/src/lib/sync/syncEngine';
import { useRemoteProgressSync } from '@/src/shared/hooks/useRemoteProgressSync';
import { RemoteProgressBanner } from '@/src/shared/ui/pairing/RemoteProgressBanner';
import { ResyncButton } from '@/src/shared/ui/pairing/ResyncButton';
import { pullAndApplyMeta } from '@/src/lib/sync/pullAndApplyMeta';
import { onCompletedSynced } from '@/src/lib/sync/completedSyncEvent';

export default function UnlimitedReleaseWrapper() {
    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useReleaseGame();
    const { target, revealedCharacter, guesses, initializeGame, finalizeGame, resetGame, hardReset, hasFinalized, _hasHydrated, resetStreakKeepMax, stats, loadStats, applyRemoteProgress, applyRemoteStats } = gameStore;
    const releases = getReleases();

    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isGameCompleted, setIsGameCompleted] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);
    const [finalRoundGuesses, setFinalRoundGuesses] = useState<typeof guesses>([]);

    const handleRemoteLoad = async (remoteTargetId: string, remoteGuesses: unknown[]) => {
        // 🆕 reset local ephemeral summary-gating state IMPERATIVELY, in the
        // same handler that pulls in new remote data — don't rely solely on
        // a useEffect keyed off target identity to catch this. Resync can be
        // triggered while a summary is already showing (ResyncButton/banner
        // stay mounted regardless of showSummary), so the reset must not
        // depend on a round-trip through React's effect scheduler.
        setManuallyClosed(false);
        setRevealDelayDone(false);
        applyRemoteProgress(remoteTargetId, remoteGuesses);

        // 🆕 resync ควรดึง stats/completed/soul-registry มาด้วย ไม่ใช่แค่ progress
        const meta = await pullAndApplyMeta('release', 'unlimited');
        applyRemoteStats(meta.stats);
        if (meta.reincarnationCount !== null) {
            setReincarnationCount(meta.reincarnationCount);
        }
        if (meta.soulName) {
            setSoulName(meta.soulName);
        }

        // ถ้า unlimited release มี isGameCompleted concept (เล่นครบทุกตัวละคร)
        const allReleases = getReleasableItems();
        const completedIds = new Set(meta.completed);
        setIsGameCompleted(allReleases.length > 0 && completedIds.size >= allReleases.length);
    };

    const remoteProgress = useRemoteProgressSync({
        gameMode: 'release',
        gameType: 'unlimited',
        hasHydrated: _hasHydrated,
        localTargetId: target?.id ?? null,
        localHasFinalized: hasFinalized,
        localGuessCount: guesses.length,
        applyRemoteProgress,
    });

    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    useEffect(() => {
        const recompute = () => {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELEASE_COMPLETED) || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(releases.length > 0 && completed.length >= releases.length);
        };
        return onCompletedSynced('release', recompute);
    }, [releases]);

    useEffect(() => {
        setManuallyClosed(false);
        logFullTarget(target);
        setRevealDelayDone(false);
    }, [target, hasFinalized]);

    const remainingGuesses = Math.max(0, MAX_UNLIMITED_RELEASE_GUESSES - guesses.length);

    const [soulName, setSoulName] = useState('');
    const [inputName, setInputName] = useState('');
    const [reincarnationCount, setReincarnationCount] = useState(0);
    const canReset = soulName.trim().length > 0;

    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = guesses.length >= MAX_UNLIMITED_RELEASE_GUESSES && !isWin;
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
    }, [guesses, isGameOver, hasFinalized, isWin, _hasHydrated, finalizeGame]);

    useEffect(() => {
        if (!_hasHydrated) return;

        let cancelled = false;

        (async () => {
            loadStats();

            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELEASE_COMPLETED) || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(releases.length > 0 && completed.length >= releases.length);

            const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
            const registry = registryData.release || { name: "", count: 0 };
            if (registry.name) {
                setSoulName(registry.name);
            }
            setReincarnationCount(registry.count || 0);

            // 🆕 backfill this mode's local name from the global players.soul_name
            // if it wasn't already set locally.
            if (!registry.name) {
                SyncEngine.getInstance().getSoulName().then((globalName) => {
                    if (!globalName) return;
                    setSoulName(globalName);
                    const rd = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
                    rd.release = { ...(rd.release || { name: '', count: 0 }), name: globalName };
                    localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(rd));
                });
            }

            await initializeGame();

            if (!cancelled) setIsReady(true);
        })();

        return () => { cancelled = true; };
    }, [initializeGame, releases.length, _hasHydrated, loadStats]);

    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    useEffect(() => {
        if (isReady) {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELEASE_COMPLETED) || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(releases.length > 0 && completed.length >= releases.length);
        }
    }, [target, releases.length, isReady]);

    const handleCloseModal = () => {
        setManuallyClosed(true);
        resetGame();
        void initializeGame(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRegisterSoul = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const currentRegistry = registryData.release || { name: "", count: 0 };
        const updated = { ...currentRegistry, name: inputName.trim() };

        registryData.release = updated;
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        setSoulName(inputName.trim());

        // 🆕 no gameMode arg — sets players.soul_name globally
        SyncEngine.getInstance().registerSoulName(inputName.trim()).catch(() => { });
    };

    const handleHardReset = () => {
        resetStreakKeepMax();

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const currentRegistry = registryData.release || { name: "", count: 0 };
        registryData.release = {
            ...currentRegistry,
            count: (currentRegistry.count || 0) + 1
        };
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        setReincarnationCount(registryData.release.count);

        hardReset();
        SyncEngine.getInstance().reincarnate('release').catch(() => { });
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

    if (!FEATURE_FLAGS.unlimited?.release) {
        return <Sealed />;
    }

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header />

            <main className="max-w-[80%] mx-auto px-4 pb-24">
                <ModeBadge mode="unlimited" onClick={() => setIsModeSelectorOpen(true)} />
                {remoteProgress.visible ? (
                    <RemoteProgressBanner
                        updatedAt={remoteProgress.updatedAt}
                        onDismiss={remoteProgress.onDismiss}
                        onLoad={remoteProgress.onLoad}
                    />
                ) : (
                    <ResyncButton gameMode={remoteProgress.gameMode} gameType={remoteProgress.gameType} applyRemoteProgress={handleRemoteLoad} />
                )}
                <div id="game-sub-header">
                    <SubHeader title={BL_MODES_METADATA.release.title} subtitle={BL_MODES_METADATA.release.statusLine} />
                </div>

                {!showSummary && (
                    <ReleaseControlPanel
                        mode="unlimited"
                        target={target}
                        releases={releases}
                        remainingGuesses={remainingGuesses}
                        stats={stats}
                        game={gameStore}
                        isGameOver={isGameOver}
                    />
                )}

                {(guesses.length > 0 && !showSummary) && (
                    <>
                        <Divider />
                        <Legend variant="simple" />
                    </>
                )}

                {showSummary ? (
                    <ReleaseSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} revealedCharacter={revealedCharacter} isWin={isWin} mode="unlimited" stats={stats} />
                ) : target ? (
                    <div className="max-w-full mx-auto overflow-x-auto">
                        <ReleaseGuessTable guesses={guesses} />
                    </div>
                ) : isGameCompleted ? (
                    <Central46ConfidentialArchive
                        mode='release'
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

            <ReleaseHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="unlimited" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}