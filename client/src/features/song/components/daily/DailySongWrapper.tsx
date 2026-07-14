// src/features/song/components/daily/DailySongWrapper.tsx
"use client";

import { useEffect, useState } from 'react';
import { SongGuessTable } from '@/src/features/song/components/shared/SongGuessTable';
import { useSongGame } from '@/src/features/song/hooks/daily/useSongGame';
import { getSongs } from '@/src/features/song/song';
import { SongSummaryGuess } from '@/src/features/song/components/shared/SongSummaryGuess';
import { SongHowToPlayModal } from '@/src/features/song/components/shared/SongHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { BleachSong } from '@/src/entities/song/schema';
import { SongControlPanel } from '@/src/shared/ui/control-panel/SongControlPanel';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { BL_MODES_METADATA } from '@/src/config/mode';
import { MAX_DAILY_SONG_GUESSES } from '@/src/const/guess';
import { DailyHubModalFooter } from '@/src/shared/ui/daily-hub/DailyHubModalFooter';
import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { logFullTarget } from '@/src/lib/debug/logFullTarget';
import { Legend } from '@/src/shared/ui/Legend';

interface DailySongWrapperProps {
    initialTarget: BleachSong;
    initialSegmentId: string;
}

export default function DailySongWrapper({ initialTarget, initialSegmentId }: DailySongWrapperProps) {
    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useSongGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hasFinalized, _hasHydrated, stats, loadStats } = gameStore;
    const songs = getSongs();

    const { markModePlayed } = useDailyHub();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            initializeGame(initialTarget, initialSegmentId);

            logFullTarget(target);
    }
        // 🔧 อ่านค่า `target` ก่อนหน้า (ยังไม่ถูก initializeGame อัปเดต) โดยตั้งใจ
        // เพื่อ log เทียบค่าเก่ากับ initialTarget ใหม่ — ถ้าใส่ target/initializeGame
        // เข้า deps จะ loop เพราะ initializeGame เปลี่ยน target เอง แล้ว effect
        // จะ trigger ซ้ำจากการเปลี่ยนแปลงของตัวมันเอง
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTarget, _hasHydrated]);

    // 🆕 นำสเตตและเงื่อนไขแบบ Silhouette มาใช้งานควบคุมแทนตำแหน่งเดิม
    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);

    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const isSynced = target !== null && initialTarget !== null && target.id === initialTarget.id;

    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    // 🆕 รีเซ็ตตัวแปรเมื่อเป้าหมายประจำวันเปลี่ยนกลุ่มไอดี 
    useEffect(() => {
        setManuallyClosed(false);
        setRevealDelayDone(false);
    }, [target?.id]);

    const remainingGuesses = Math.max(0, MAX_DAILY_SONG_GUESSES - guesses.length);
    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = guesses.length >= MAX_DAILY_SONG_GUESSES && !isWin;
    const isGameOver = isWin || isLoss;

    // 🆕 เปลี่ยนแปลงมาใช้ Single Source of Truth ผ่านตัวแปร showSummary ตรงๆ
    const showSummary = _hasHydrated && isReady && isGameOver && !manuallyClosed && revealDelayDone;

    const latestGuess = guesses[0];
    const isFreshFinish = Boolean(latestGuess?.isNew && isGameOver);

    // 🆕 ระบบดีเลย์เปิดเผยตั๋วสรุปผลแอนิเมชันตามรูปแบบ Silhouette (ชนะ 1600ms / แพ้ 900ms)
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

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        setIsModeSelectorOpen(false);
        navigate(targetMode);
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        loadStats();
        initializeGame();
        setIsReady(true);
    }, [initializeGame, songs.length, _hasHydrated, loadStats]);

    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    // 🆕 บันทึกสถิติลงคลังข้อมูลทันทีเมื่อจบเกม (ไม่ต้องหน่วงเวลาฝั่ง Data เพื่อความแม่นยำ)
    useEffect(() => {
        if (!_hasHydrated || !isSynced) return;
        if (isGameOver && !hasFinalized) {
            finalizeGame(isWin);
            markModePlayed('song', isWin);
        }
    }, [isGameOver, hasFinalized, isWin, _hasHydrated, isSynced, finalizeGame, markModePlayed]);

    const handleCloseModal = () => {
        setManuallyClosed(true);
        resetGame();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // 🆕 การเลื่อนหน้าจอถูกพึ่งพากับสถานะของ showSummary สมบูรณ์แบบ
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

    if (!FEATURE_FLAGS.daily?.song) {
        return <Sealed />;
    }

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header />

            <main className="max-w-[80%] mx-auto px-4 pb-24">
                <ModeBadge mode="daily" onClick={() => setIsModeSelectorOpen(true)} />
                <div id="game-sub-header">
                    <SubHeader title={BL_MODES_METADATA.song.title} subtitle={BL_MODES_METADATA.song.statusLine} />
                </div>

                {!showSummary && (
                    <SongControlPanel
                        mode="daily"
                        target={target}
                        songs={songs}
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
                        <Legend variant="simple" />
                    </>
                )}

                {showSummary ? (
                    <>
                        <SongSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="daily" stats={stats} />
                        <DailyHubModalFooter activeMode="song" />
                    </>
                ) : target && isSynced ? (
                    <div className="w-full overflow-x-auto">
                        <SongGuessTable guesses={guesses} />
                    </div>
                ) : (
                    <div className="mt-40 flex flex-col items-center justify-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#777796] animate-bounce">
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