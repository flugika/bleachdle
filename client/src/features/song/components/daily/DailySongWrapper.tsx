// src/features/song/components/daily/DailySongWrapper.tsx
"use client";

import { useEffect, useState } from 'react';
import { SongGuessTable } from '@/src/features/song/components/shared/SongGuessTable';
import { useSongGame } from '@/src/features/song/hooks/daily/useSongGame';
import { getSongs } from '@/src/lib/utils/song';
import { SongSummaryGuess } from '@/src/features/song/components/shared/SongSummaryGuess';
import { SongHowToPlayModal } from '@/src/features/song/components/shared/SongHowToPlayModal';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { BleachSong } from '@/src/entities/song/schema';
import { SongControlPanel } from '@/src/shared/ui/control-panel/SongControlPanel';
import { ModeBadge } from '@/src/shared/ui/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import SoulSyncLoader from '@/src/shared/ui/loader/SoulSyncLoader';
import { STORAGE_KEYS } from '@/src/const/localStorage';

interface DailySongWrapperProps {
    initialTarget: BleachSong;
    initialSegmentId: string; 
}

export default function DailySongWrapper({ initialTarget, initialSegmentId }: DailySongWrapperProps) {
    // 🛡️ TODO: เพิ่ม key `song: { daily: boolean; unlimited: boolean }` ใน feature.flags.ts
    // ถ้ายังไม่มี ให้ลบ optional chaining (?.) ออกแล้วใส่ FEATURE_FLAGS.daily.song ตรงๆ
    if (!FEATURE_FLAGS.daily?.song) {
        return <Sealed />;
    }

    const { navigate, state, reportReady } = useSenkaimon(); // 👈 pattern เดียวกับ DailyCharacterWrapper เป๊ะ

    const gameStore = useSongGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hasFinalized, _hasHydrated } = gameStore;
    const songs = getSongs(); // 👈 ใช้แค่ทำ autocomplete list ของ search bar เท่านั้น ไม่ใช่แหล่งสุ่ม target

    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            initializeGame(initialTarget, initialSegmentId);

            if (process.env.NODE_ENV !== 'production') {
                console.log('target:', useSongGame.getState().target);
            }
        }
    }, [initialTarget, _hasHydrated]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({ currentStreak: 0, maxStreak: 0 });
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

    // 🎵 Win condition เหมือน unlimited/song: เพลงมีคำตอบเดียว แค่มี guess ไหน
    // status === 'correct' ก็ถือว่าชนะ (ไม่ต้องเช็คว่าเป็น guess ล่าสุดเหมือน character)
    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = isSurrendered || (hasFinalized && !isWin);
    const isGameOver = isWin || isLoss;

    // ── 🛡️ จัดการโครงสร้างสถิติแบบ Object Nesting (เหมือน character daily เป๊ะ)
    const updateStats = (won: boolean) => {
        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
        const saved = statsData.daily || { currentStreak: 0, maxStreak: 0 };

        const newStats = {
            currentStreak: won ? saved.currentStreak + 1 : 0,
            maxStreak: won ? Math.max(saved.maxStreak, saved.currentStreak + 1) : saved.maxStreak
        };

        statsData.daily = newStats;
        localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));
        setStats(newStats);
    };

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    // โหลดและซิงค์ข้อมูลฝั่ง Client หลัง hydrate เสร็จ
    useEffect(() => {
        if (!_hasHydrated) return;
        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
        setStats(statsData.daily || { currentStreak: 0, maxStreak: 0 });

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
        if (!_hasHydrated) return;

        if (isGameOver) {
            // มาเจอเกมที่จบไปแล้ว (F5) → เปิด modal สรุปทันที ไม่ต้องรอ delay
            if (hasFinalized) {
                setIsModalOpen(true);
                return;
            }

            // จังหวะปกติ: ยอมแพ้สดๆ = เปิดทันที / ทายถูกสดๆ = หน่วง 2.5s ให้เห็นตารางแวบก่อน
            const targetDelay = isSurrendered ? 0 : 2500;
            const timer = setTimeout(() => {
                if (!hasFinalized) {
                    finalizeGame(isWin);
                    updateStats(isWin);
                }
                setIsModalOpen(true);
            }, targetDelay);

            return () => clearTimeout(timer);
        }
    }, [isGameOver, isWin, finalizeGame, hasFinalized, _hasHydrated, isSurrendered]);

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

        // คำนวณทันทีตอน mount ก่อน 1 ครั้ง กัน timeLeft ว่างเปล่าค้างจนกว่า setInterval จะยิงครั้งแรก
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
                <SubHeader title="REIATSU RESONANCE" description="System // Scanning for Song Signature" />

                {!isModalOpen && (
                    // ⚠️ ASSUMPTION: SongControlPanel ต้องรองรับ mode="daily" แล้ว "ปิด" max-guess
                    // cap เองภายใน (ไม่โชว์ remainingGuesses, ไม่ disable search bar ตามจำนวนเดา)
                    // เหมือนที่ CharacterControlPanel ทำให้ character daily อยู่แล้ว — ถ้า SongControlPanel
                    // ปัจจุบันยัง hardcode ใช้ remainingGuesses/maxGuesses เสมอ ต้องเพิ่ม branch
                    // `mode === 'daily'` ให้ข้ามการเช็คนั้นไปด้วย ไม่งั้น UI จะไปโชว์ "0 guesses left"
                    // หรือ disable ปุ่มทายผิดจังหวะ
                    <SongControlPanel
                        mode="daily"
                        target={target}
                        songs={songs}
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
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                            {([
                                ['correct', '#0d2918', '#1a5530', '#4de880', 'Correct'],
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

                {isModalOpen ? (
                    <SongSummaryGuess isOpen={isModalOpen} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="daily" stats={stats} />
                ) : !isReady ? (
                    <SoulSyncLoader subLabel="Scanning for Song Signature" />
                ) : target ? (
                    <div className="w-full overflow-x-auto">
                        <SongGuessTable guesses={guesses} />
                    </div>
                ) : (
                    <div className="mt-40 flex flex-col items-center justify-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#5a5a78] animate-bounce">
                            Opening Senkaimon...
                        </p>
                    </div>
                )}
            </main>

            <SongHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="daily" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}