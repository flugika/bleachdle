// src/features/silhouette/components/unlimited/UnlimitedSilhouetteWrapper.tsx
"use client";

import { useEffect, useState } from 'react';
import { SilhouetteGuessTable } from '@/src/features/silhouette/components/shared/SilhouetteGuessTable';
import { SilhouetteControlPanel } from '@/src/shared/ui/control-panel/SilhouetteControlPanel';
import { useSilhouetteGame } from '@/src/features/silhouette/hooks/unlimited/useSilhouetteGame';
import { getSilhouettes } from '@/src/features/silhouette/silhouette';
import { getCharacters } from '@/src/features/character/character';
import { SilhouetteSummaryGuess } from '@/src/features/silhouette/components/shared/SilhouetteSummaryGuess';
import { SilhouetteHowToPlayModal } from '@/src/features/silhouette/components/shared/SilhouetteHowToPlayModal';

import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/shared/ui/control-panel/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_UNLIMITED_SILHOUETTE_GUESSES } from '@/src/const/guess';
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

export default function UnlimitedSilhouetteWrapper() {
    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useSilhouetteGame();
    const { target, revealedCharacter, guesses, initializeGame, finalizeGame, resetGame, hardReset, hasFinalized, _hasHydrated, resetStreakKeepMax, stats, loadStats, applyRemoteProgress, applyRemoteStats } = gameStore;
    const silhouettes = getSilhouettes();
    const characters = getCharacters(); // full roster ตามที่ SilhouetteControlPanel ต้องการ

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
        const meta = await pullAndApplyMeta('silhouette', 'unlimited');
        applyRemoteStats(meta.stats);
        if (meta.reincarnationCount !== null) {
            setReincarnationCount(meta.reincarnationCount);
        }
        if (meta.soulName) {
            setSoulName(meta.soulName);
        }

        // ถ้า unlimited silhouette มี isGameCompleted concept (เล่นครบทุกตัวละคร)
        const allCharacters = getCharacters();
        const completedIds = new Set(meta.completed);
        setIsGameCompleted(allCharacters.length > 0 && completedIds.size >= allCharacters.length);
    };

    const remoteProgress = useRemoteProgressSync({
        gameMode: 'silhouette',
        gameType: 'unlimited',
        hasHydrated: _hasHydrated,
        localTargetId: target?.id ?? null,
        localHasFinalized: hasFinalized,
        localGuessCount: guesses.length,
        applyRemoteProgress: handleRemoteLoad,
    });

    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    useEffect(() => {
        const recompute = () => {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
            const completed: string[] = completedData.unlimited || [];
            const uniqueCharacterIds = new Set(silhouettes.map(s => s.character_id));
            setIsGameCompleted(uniqueCharacterIds.size > 0 && completed.length >= uniqueCharacterIds.size);
        };
        return onCompletedSynced('silhouette', recompute);
    }, [silhouettes]);

    useEffect(() => {
        setManuallyClosed(false);
        logFullTarget(target);
        setRevealDelayDone(false);
    }, [target, hasFinalized]);

    const remainingGuesses = Math.max(0, MAX_UNLIMITED_SILHOUETTE_GUESSES - guesses.length);

    const [soulName, setSoulName] = useState('');
    const [inputName, setInputName] = useState('');
    const [reincarnationCount, setReincarnationCount] = useState(0);
    const canReset = soulName.trim().length > 0;

    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = guesses.length >= MAX_UNLIMITED_SILHOUETTE_GUESSES && !isWin;
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

            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
            const completed: string[] = completedData.unlimited || [];
            const uniqueCharacterIds = new Set(silhouettes.map(s => s.character_id));
            setIsGameCompleted(uniqueCharacterIds.size > 0 && completed.length >= uniqueCharacterIds.size);

            const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
            const registry = registryData.silhouette || { name: "", count: 0 };
            if (registry.name) {
                setSoulName(registry.name);
            }
            setReincarnationCount(registry.count || 0);

            if (!registry.name) {
                SyncEngine.getInstance().getSoulName().then((globalName) => {
                    if (!globalName) return;
                    setSoulName(globalName);
                    const rd = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
                    rd.silhouette = { ...(rd.silhouette || { name: '', count: 0 }), name: globalName };
                    localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(rd));
                });
            }

            await initializeGame();

            if (!cancelled) setIsReady(true);
        })();

        return () => { cancelled = true; };
    }, [initializeGame, silhouettes, silhouettes.length, _hasHydrated, loadStats]);

    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    useEffect(() => {
        if (isReady) {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
            const completed: string[] = completedData.unlimited || [];
            const uniqueCharacterIds = new Set(silhouettes.map(s => s.character_id));
            setIsGameCompleted(uniqueCharacterIds.size > 0 && completed.length >= uniqueCharacterIds.size);
        }
    }, [target, silhouettes, silhouettes.length, isReady]);

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
        const currentRegistry = registryData.silhouette || { name: "", count: 0 };
        const updated = { ...currentRegistry, name: inputName.trim() };

        registryData.silhouette = updated;
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        setSoulName(inputName.trim());

        // 🆕 no gameMode arg — sets players.soul_name globally
        SyncEngine.getInstance().registerSoulName(inputName.trim()).catch(() => { });
    };

    const handleHardReset = () => {
        resetStreakKeepMax();

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const currentRegistry = registryData.silhouette || { name: "", count: 0 };
        registryData.silhouette = {
            ...currentRegistry,
            count: (currentRegistry.count || 0) + 1
        };
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        setReincarnationCount(registryData.silhouette.count);

        hardReset();
        SyncEngine.getInstance().reincarnate('silhouette').catch(() => { });
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

    if (!FEATURE_FLAGS.unlimited?.silhouette) {
        return <Sealed />;
    }

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#13131c] via-[#0a0a0e] to-[#050507]">
            <Header />

            {/* 🌌 คุมระดับ Max-Width ของ Main ให้เท่ากับ Quote และเพิ่มมิติการจัดวาง */}
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
                    <SubHeader title={BL_MODES_METADATA.silhouette.title} subtitle={BL_MODES_METADATA.silhouette.statusLine} />
                </div>

                {/* 🎮 โซนแกนกลางคอมโพเนนต์หลัก */}
                <div className="w-full flex flex-col items-center justify-center mt-6">
                    {!showSummary && (
                        <div className="w-full max-w-xl mx-auto">
                            <SilhouetteControlPanel
                                mode="unlimited"
                                target={target}
                                characters={characters}
                                remainingGuesses={remainingGuesses}
                                stats={stats}
                                game={gameStore}
                                isGameOver={isGameOver}
                            />
                        </div>
                    )}

                    {(guesses.length > 0 && !showSummary) && (
                        <div className="w-full max-w-xl mx-auto">
                            <Divider />
                            <Legend variant="simple" />
                        </div>
                    )}

                    {/* 📊 โซนแสดงรายงานตารางสรุป / ตารางเดาผล */}
                    <div className="w-full mt-2">
                        {showSummary ? (
                            <SilhouetteSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} revealedCharacter={revealedCharacter} isWin={isWin} mode="unlimited" stats={stats} />
                        ) : target ? (
                            <SilhouetteGuessTable guesses={guesses} />
                        ) : isGameCompleted ? (
                            <div className="w-full max-w-2xl mx-auto">
                                <Central46ConfidentialArchive
                                    mode='silhouette'
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
                            </div>
                        ) : (
                            <div className="mt-32 flex flex-col items-center justify-center">
                                <p className="text-xs uppercase tracking-[0.25em] font-mono text-[#777796] animate-pulse">
                                    Opening Senkaimon...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <SilhouetteHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="unlimited" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}