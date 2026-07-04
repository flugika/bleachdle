// app/unlimited/song/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { SongGuessTable } from '@/src/features/song/components/shared/SongGuessTable';
import { SongControlPanel } from '@/src/shared/ui/control-panel/SongControlPanel';
import { useSongGame } from '@/src/features/song/hooks/unlimited/useSongGame';
import { getSongs } from '@/src/lib/utils/song';
import { SongSummaryGuess } from '@/src/features/song/components/shared/SongSummaryGuess';
import { SongHowToPlayModal } from '@/src/features/song/components/shared/SongHowToPlayModal';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/features/character/components/unlimited/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_SONG_GUESSES } from '@/src/const/guess';
import SoulSyncLoader from '@/src/shared/ui/loader/SoulSyncLoader'
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';

export default function UnlimitedSongGame() {
    // 🛡️ TODO: เพิ่ม key `song: { daily: boolean; unlimited: boolean }` ใน feature.flags.ts
    // ถ้ายังไม่มี ให้ลบ optional chaining (?.) ออกแล้วใส่ FEATURE_FLAGS.unlimited.song ตรงๆ
    if (!FEATURE_FLAGS.unlimited?.song) {
        return <Sealed />;
    }

    const { navigate, state, reportReady } = useSenkaimon(); // 👈 pattern เดียวกับหน้า character unlimited เป๊ะ

    // 🛡️ subscribe store ครั้งเดียว แล้วส่ง object เดิมต่อให้ SongSearchBar ผ่าน prop `game`
    const gameStore = useSongGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hardReset, hasFinalized, _hasHydrated } = gameStore;
    const songs = getSongs();

    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [stats, setStats] = useState({ currentStreak: 0, maxStreak: 0 });
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isGameCompleted, setIsGameCompleted] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);
    const [finalRoundGuesses, setFinalRoundGuesses] = useState<typeof guesses>([]);

    // 🛡️ FIX (ปัญหา modal ค้าง): ปิด modal ทันทีที่ประตูเซนไกมงเริ่ม "closing"
    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    useEffect(() => {
        setManuallyClosed(false);
        if (target) {
            console.log("target:", target)
        }
        setRevealDelayDone(false);
    }, [target]);

    const remainingGuesses = Math.max(0, MAX_SONG_GUESSES - guesses.length);

    const [soulName, setSoulName] = useState('');
    const [inputName, setInputName] = useState('');
    const [reincarnationCount, setReincarnationCount] = useState(0);
    const canReset = soulName.trim().length > 0;

    // 🎵 Win condition ต่างจาก character: เพลงมีคำตอบเดียว ไม่ต้องเช็คทุก field == correct
    // แค่ guess ล่าสุด (index 0) ตรงเพลงเป้าหมายเป๊ะก็พอ
    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = guesses.length >= MAX_SONG_GUESSES && !isWin;
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
            updateStats(isWin);
        }
    }, [isGameOver, hasFinalized, isWin, _hasHydrated, finalizeGame]);

    // ── 🛡️ จัดการโครงสร้างสถิติแบบ Object Nesting (เหมือน character เป๊ะ)
    const updateStats = (won: boolean) => {
        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
        const saved = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

        const newStats = {
            currentStreak: won ? saved.currentStreak + 1 : 0,
            maxStreak: won ? Math.max(saved.maxStreak, saved.currentStreak + 1) : saved.maxStreak
        };

        statsData.unlimited = newStats;
        localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));
        setStats(newStats);
    };

    // 🛡️ รอ _hasHydrated (persist rehydrate จาก localStorage) ก่อนอ่าน/เขียนอะไรทั้งนั้น
    useEffect(() => {
        if (!_hasHydrated) return;

        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
        setStats(statsData.unlimited || { currentStreak: 0, maxStreak: 0 });

        const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
        const completed = completedData.unlimited || [];
        setIsGameCompleted(songs.length > 0 && completed.length >= songs.length);

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_REGISTRY) || '{}');
        const registry = registryData.unlimited || { name: "", count: 0 };
        if (registry.name) {
            setSoulName(registry.name);
        }
        setReincarnationCount(registry.count || 0);

        initializeGame();
        setIsReady(true);
    }, [initializeGame, songs.length, _hasHydrated]);

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
        initializeGame(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── 🛡️ ทะเบียนวิญญาณแบบจารึกรวมศูนย์ (แยก registry ของ song ออกจาก character โดยสิ้นเชิง)
    const handleRegisterSoul = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputName.trim()) return;

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_REGISTRY) || '{}');
        const currentRegistry = registryData.unlimited || { name: "", count: 0 };
        const updated = { ...currentRegistry, name: inputName.trim() };

        registryData.unlimited = updated;
        localStorage.setItem(STORAGE_KEYS.SONG_REGISTRY, JSON.stringify(registryData));
        setSoulName(inputName.trim());
    };

    // ── 🛡️ คอมโบ Reset ข้อมูลโดยการเจาะทำลายเฉพาะกิ่งก้านของโหมด song/unlimited เท่านั้น
    const handleHardReset = () => {
        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
        const saved = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
        statsData.unlimited = { currentStreak: 0, maxStreak: saved.maxStreak };
        localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));
        setStats(statsData.unlimited);

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_REGISTRY) || '{}');
        const currentRegistry = registryData.unlimited || { name: "", count: 0 };
        registryData.unlimited = {
            ...currentRegistry,
            count: (currentRegistry.count || 0) + 1
        };
        localStorage.setItem(STORAGE_KEYS.SONG_REGISTRY, JSON.stringify(registryData));
        setReincarnationCount(registryData.unlimited.count);

        hardReset();
    };

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[80%] mx-auto px-4 pb-16">
                {/* mode ยังคง "unlimited" เพราะ /song อยู่ใต้มิติ unlimited เดิม แค่คนละประเภทเกม */}
                <ModeBadge mode="unlimited" onClick={() => setIsModeSelectorOpen(true)} />
                <SubHeader title={BL_MODES_METADATA.song.title} subtitle={BL_MODES_METADATA.song.statusLine} />

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
                        maxGuesses={MAX_SONG_GUESSES}
                        isGameOver={isGameOver}
                    />
                )}

                {(guesses.length > 0 && !showSummary) && (
                    <>
                        <Divider />
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                            {([
                                ['correct', '#0d2918', '#1a5530', '#4de880', 'Correct'],
                                // 🛡️ นำสถานะ partial ออกจากตรงนี้ เพื่อให้สอดคล้องกับระบบเสียงReiatsu
                                ['wrong', '#590e0e', '#a64747', '#3a2828', 'Wrong'],
                            ] as const).map(([key, bg, border, fg, label]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                    <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ background: bg, border: `1px solid ${border}` }} />
                                    <span className="text-[10px] tracking-wide text-[#d1a9a9]">{label}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {showSummary ? (
                    <SongSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="unlimited" stats={stats} />
                ) : !isReady ? (
                    <SoulSyncLoader />
                ) : target ? (
                    <div className="w-full overflow-x-auto">
                        <SongGuessTable guesses={guesses} />
                    </div>
                ) : isGameCompleted ? (
                    <Central46ConfidentialArchive
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
                        <p className="text-xs uppercase tracking-[0.2em] text-[#5a5a78] animate-bounce">
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