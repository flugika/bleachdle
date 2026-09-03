// app/(game)/unlimited/character/UnlimitedCharacterWrapper.tsx
//
// 🆕 changes:
//   1. SyncEngine.registerSoulName() call fixed — no longer takes a
//      gameMode arg (soul_name is now global on players.soul_name, not
//      per-mode). See 14_soul_name_unification.sql.
//   2. On mount, after reading the LOCAL per-mode name (unchanged
//      behavior), also check the GLOBAL name via getSoulName(). If a
//      global name already exists and this mode's local copy doesn't,
//      backfill it — this is what makes "name yourself once in any mode"
//      propagate everywhere, without changing Central46ConfidentialArchive's
//      props/behavior at all (soulName is still just a plain string prop,
//      same shape as before — only WHERE its value can come from changed).
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
import Central46ConfidentialArchive from '@/src/shared/ui/control-panel/Central46ConfidentialArchive';
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
import { Legend } from '@/src/shared/ui/control-panel/Legend';
import { SyncEngine } from '@/src/lib/sync/syncEngine';
import { useRemoteProgressSync } from '@/src/shared/hooks/useRemoteProgressSync';
import { RemoteProgressBanner } from '@/src/shared/ui/pairing/RemoteProgressBanner';
import { ResyncButton } from '@/src/shared/ui/pairing/ResyncButton';
import { pullAndApplyMeta } from '@/src/lib/sync/pullAndApplyMeta';
import { onCompletedSynced } from '@/src/lib/sync/completedSyncEvent';

export default function UnlimitedCharacterWrapper() {
    const { navigate, state, reportReady } = useSenkaimon();

    // 🛡️ Subscribe Store เพียงครั้งเดียวเพื่อป้องกันปัญหา Re-render ซ้ำซ้อน
    const gameStore = useCharacterGame();
    const {
        target, guesses, initializeGame, finalizeGame, resetGame, hardReset,
        hasFinalized, _hasHydrated, resetStreakKeepMax, stats, loadStats, applyRemoteProgress, applyRemoteStats
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
        const meta = await pullAndApplyMeta('character', 'unlimited');
        applyRemoteStats(meta.stats);
        if (meta.reincarnationCount !== null) {
            setReincarnationCount(meta.reincarnationCount);
        }
        if (meta.soulName) {
            setSoulName(meta.soulName);
        }

        // ถ้า unlimited character มี isGameCompleted concept (เล่นครบทุกตัวละคร)
        const allCharacters = getCharacters();
        const completedIds = new Set(meta.completed);
        setIsGameCompleted(allCharacters.length > 0 && completedIds.size >= allCharacters.length);
    };

    const remoteProgress = useRemoteProgressSync({
        gameMode: 'character',
        gameType: 'unlimited',
        hasHydrated: _hasHydrated,
        localTargetId: target?.id ?? null,
        localHasFinalized: hasFinalized,
        localGuessCount: guesses.length,
        applyRemoteProgress: handleRemoteLoad,
    });

    // 🎯 คำนวณสถานะการแพ้/ชนะ (คงคุณลักษณะเฉพาะของระบบเปรียบเทียบฟิลด์ตัวละครไว้)
    const latestGuess = guesses[0];
    const isWin = guesses.length > 0 &&
        Object.entries(latestGuess.result)
            .filter(([key]) => key !== 'image')
            .every(([, status]) => status === 'correct');

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

    useEffect(() => {
        const recompute = () => {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(characters.length > 0 && completed.length >= characters.length);
        };
        return onCompletedSynced('character', recompute);
    }, [characters]);

    // รีเซ็ตสถานะหน้าต่างสรุปผลเมื่อเป้าหมายเกม (Target) มีการเปลี่ยนแปลง
    useEffect(() => {
        setManuallyClosed(false);
        logFullTarget(target);
        setRevealDelayDone(false);
    }, [target, hasFinalized]);

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

        let cancelled = false;

        (async () => {
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

            if (!registry.name) {
                SyncEngine.getInstance().getSoulName().then((globalName) => {
                    if (!globalName) return;
                    setSoulName(globalName);
                    const rd = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
                    rd.character = { ...(rd.character || { name: '', count: 0 }), name: globalName };
                    localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(rd));
                });
            }

            // 🆕 await ให้ target ถูกตั้งค่าจริงก่อนประกาศ ready — เหตุผลเดียวกับ
            // song wrapper: initializeGame ตอนนี้รอ fetchActiveRemoteProgress
            // อยู่ข้างใน ถ้าไม่ await, setIsReady(true) จะยิงก่อน target มา
            await initializeGame();

            if (!cancelled) setIsReady(true);
        })();

        return () => { cancelled = true; };
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
        void initializeGame(true); // 🆕 ตั้งใจ fire-and-forget — ไม่บล็อก UI ตอนปิด modal
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

        // 🆕 no gameMode arg — this sets players.soul_name globally now
        SyncEngine.getInstance().registerSoulName(inputName.trim()).catch(() => { });
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
        SyncEngine.getInstance().reincarnate('character').catch(() => { });
    };

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    if (!FEATURE_FLAGS.unlimited.character) {
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
                        isGameOver={isGameOver}
                    />
                )}

                {(guesses.length > 0 && !showSummary) && (
                    <>
                        <Divider />
                        <Legend variant="full" />
                    </>
                )}

                {showSummary && target ? (
                    <CharacterSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="unlimited" stats={stats} />
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