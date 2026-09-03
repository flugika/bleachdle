// src/features/song/components/unlimited/UnlimitedSongWrapper.tsx
//
// 🆕 changes: same as UnlimitedCharacterWrapper —
//   1. registerSoulName() no longer takes gameMode (global on players.soul_name).
//   2. On mount, backfill this mode's local name from the global name if
//      this mode never had one saved locally — safe/additive, no change to
//      Central46ConfidentialArchive's prop contract.
"use client";

import { useEffect, useState } from 'react';
import { SongGuessTable } from '@/src/features/song/components/shared/SongGuessTable';
import { SongControlPanel } from '@/src/shared/ui/control-panel/SongControlPanel';
import { useSongGame } from '@/src/features/song/hooks/unlimited/useSongGame';
import { getSongs } from '@/src/features/song/song';
import { SongSummaryGuess } from '@/src/features/song/components/shared/SongSummaryGuess';
import { SongHowToPlayModal } from '@/src/features/song/components/shared/SongHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/shared/ui/control-panel/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_UNLIMITED_SONG_GUESSES } from '@/src/const/guess';
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

export default function UnlimitedSongWrapper() {
    const { navigate, state, reportReady } = useSenkaimon(); // 👈 pattern เดียวกับหน้า character unlimited เป๊ะ

    // 🛡️ subscribe store ครั้งเดียว แล้วส่ง object เดิมต่อให้ SongSearchBar ผ่าน prop `game`
    const gameStore = useSongGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hardReset, hasFinalized, _hasHydrated, resetStreakKeepMax, stats, loadStats, applyRemoteProgress, applyRemoteStats } = gameStore;
    const songs = getSongs();

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
        const meta = await pullAndApplyMeta('song', 'unlimited');
        applyRemoteStats(meta.stats);
        if (meta.reincarnationCount !== null) {
            setReincarnationCount(meta.reincarnationCount);
        }
        if (meta.soulName) {
            setSoulName(meta.soulName);
        }

        // ถ้า unlimited song มี isGameCompleted concept (เล่นครบทุกเพลง)
        const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
        const completed = completedData.unlimited || [];
        setIsGameCompleted(songs.length > 0 && completed.length >= songs.length);
    };

    const remoteProgress = useRemoteProgressSync({
        gameMode: 'song',
        gameType: 'unlimited',
        hasHydrated: _hasHydrated,
        localTargetId: target?.id ?? null,
        localHasFinalized: hasFinalized,
        localGuessCount: guesses.length,
        applyRemoteProgress: handleRemoteLoad,
    });

    // 🛡️ FIX (ปัญหา modal ค้าง): ปิด modal ทันทีที่ประตูเซนไกมงเริ่ม "closing"
    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    useEffect(() => {
        const recompute = () => {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(songs.length > 0 && completed.length >= songs.length);
        };
        return onCompletedSynced('song', recompute);
    }, [songs]);

    useEffect(() => {
        setManuallyClosed(false);
        logFullTarget(target);
        setRevealDelayDone(false);
    }, [target, hasFinalized]);

    const remainingGuesses = Math.max(0, MAX_UNLIMITED_SONG_GUESSES - guesses.length);

    const [soulName, setSoulName] = useState('');
    const [inputName, setInputName] = useState('');
    const [reincarnationCount, setReincarnationCount] = useState(0);
    const canReset = soulName.trim().length > 0;

    // 🎵 Win condition ต่างจาก character: เพลงมีคำตอบเดียว ไม่ต้องเช็คทุก field == correct
    // แค่ guess ล่าสุด (index 0) ตรงเพลงเป้าหมายเป๊ะก็พอ
    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = guesses.length >= MAX_UNLIMITED_SONG_GUESSES && !isWin;
    const isGameOver = isWin || isLoss;
    const showSummary = _hasHydrated && isReady && isGameOver && !manuallyClosed && revealDelayDone;
    const latestGuess = guesses[0];
    const isFreshFinish = Boolean(latestGuess?.isNew && isGameOver);

    useEffect(() => {
        if (!isGameOver) return;

        // F5 มาเจอเกมที่จบไปแล้ว → ไม่มี "โมเมนต์สด" ให้รอ โชว์ summary ได้เลย
        if (!isFreshFinish) {
            setRevealDelayDone(true);
            return;
        }

        // ทายสดๆ → ให้เวลาโชว์ตั๋ว (ชนะให้เวลาดู confetti + stamp นานกว่า, แพ้สั้นกว่า)
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

    // 🛡️ รอ _hasHydrated (persist rehydrate จาก localStorage) ก่อนอ่าน/เขียนอะไรทั้งนั้น
    useEffect(() => {
        if (!_hasHydrated) return;

        let cancelled = false;

        (async () => {
            loadStats();

            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(songs.length > 0 && completed.length >= songs.length);

            const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
            const registry = registryData.song || { name: "", count: 0 };
            if (registry.name) {
                setSoulName(registry.name);
            }
            setReincarnationCount(registry.count || 0);

            if (!registry.name) {
                SyncEngine.getInstance().getSoulName().then((globalName) => {
                    if (!globalName) return;
                    setSoulName(globalName);
                    const rd = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
                    rd.song = { ...(rd.song || { name: '', count: 0 }), name: globalName };
                    localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(rd));
                });
            }

            // 🆕 await ให้ target ถูกตั้งค่าจริง (ไม่ว่าจะมาจาก remote-check หรือ
            // สุ่มใหม่) ก่อนประกาศว่า ready — กัน reportReady() ยิงเร็วเกินไป
            // ระหว่างที่ยังรอ fetchActiveRemoteProgress อยู่ข้างใน
            await initializeGame();

            if (!cancelled) setIsReady(true);
        })();

        return () => { cancelled = true; };
    }, [initializeGame, songs.length, _hasHydrated, loadStats]);

    // 🚪 แจ้ง NavigationContext กลับไปตอน "isReady" เป็น true จริงๆ (หลัง hydrate + initializeGame เสร็จ)
    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    useEffect(() => {
        if (isReady) {
            const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
            const completed = completedData.unlimited || [];
            setIsGameCompleted(songs.length > 0 && completed.length >= songs.length);
        }
    }, [target, songs.length, isReady]);

    const handleCloseModal = () => {
        setManuallyClosed(true);
        resetGame();
        void initializeGame(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── 🛡️ ทะเบียนวิญญาณแบบจารึกรวมศูนย์ (แยก registry ของ song ออกจาก character โดยสิ้นเชิง)
    const handleRegisterSoul = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const currentRegistry = registryData.song || { name: "", count: 0 };
        const updated = { ...currentRegistry, name: inputName.trim() };

        registryData.song = updated;
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        setSoulName(inputName.trim());

        // 🆕 no gameMode arg — sets players.soul_name globally
        SyncEngine.getInstance().registerSoulName(inputName.trim()).catch(() => { });
    };

    // ── 🛡️ คอมโบ Reset ข้อมูลโดยการเจาะทำลายเฉพาะกิ่งก้านของโหมด song/unlimited เท่านั้น
    const handleHardReset = () => {
        resetStreakKeepMax();

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const currentRegistry = registryData.song || { name: "", count: 0 };
        registryData.song = {
            ...currentRegistry,
            count: (currentRegistry.count || 0) + 1
        };
        localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        setReincarnationCount(registryData.song.count);

        hardReset();
        SyncEngine.getInstance().reincarnate('song').catch(() => { });
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

    if (!FEATURE_FLAGS.unlimited?.song) {
        return <Sealed />;
    }

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header />

            <main className="max-w-[80%] mx-auto px-4 pb-24">
                {/* mode ยังคง "unlimited" เพราะ /song อยู่ใต้มิติ unlimited เดิม แค่คนละประเภทเกม */}
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
                    <SubHeader title={BL_MODES_METADATA.song.title} subtitle={BL_MODES_METADATA.song.statusLine} />
                </div>

                {/* 🛡️ รวม SongAudioPlayer + SongSearchBar + stats เข้า SongControlPanel เดียว
                    (เดิมแยกเรนเดอร์ 3 บล็อกซ้ำ pattern กับ character page) sync กับ isLimitReached
                    fix ตัวเดียวกับ CharacterControlPanel */}
                {!showSummary && (
                    <SongControlPanel
                        mode="unlimited"
                        target={target}
                        songs={songs}
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
                    <SongSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="unlimited" stats={stats} />
                ) : target ? (
                    <div className="w-full overflow-x-auto">
                        <SongGuessTable guesses={guesses} />
                    </div>
                ) : isGameCompleted ? (
                    <Central46ConfidentialArchive
                        mode="song"
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

            <SongHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="unlimited" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}