"use client";

import { useEffect, useState } from 'react';
import { SilhouetteGuessTable } from '@/src/features/silhouette/components/shared/SilhouetteGuessTable';
import { SilhouetteSummaryGuess } from '@/src/features/silhouette/components/shared/SilhouetteSummaryGuess';
import { SilhouetteControlPanel } from '@/src/shared/ui/control-panel/SilhouetteControlPanel';
import { useSilhouetteGame } from '@/src/features/silhouette/hooks/daily/useSilhouetteGame';
import { getCharacters } from '@/src/features/character/character';
import { SilhouetteHowToPlayModal } from '../shared/SilhouetteHowToPlayModal';
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { SilhouetteTargetHidden } from '@/src/features/silhouette/types';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_DAILY_SILHOUETTE_GUESSES } from '@/src/const/guess';
import { BL_MODES_METADATA } from '@/src/config/mode';
// 📅 Daily Hub: แถบ progress รวมทุกโหมด daily + CTA เล่นต่อ
import { DailyHubModalFooter } from '@/src/shared/ui/daily-hub/DailyHubModalFooter';
import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { logFullTarget } from '@/src/lib/debug/logFullTarget';

/**
 * ⚠️ ต่างจาก DailyQuoteWrapper ตรงที่ SilhouetteControlPanel ตัวจริง**ไม่มี** prop `mode`/`timeLeft`/
 * `onSurrender` — มันรับแค่ { target, characters, remainingGuesses, stats, game, isGameOver } เหมือน
 * ที่หน้า unlimited ใช้เป๊ะ ดังนั้น component เดียวกันถูก reuse ทั้ง 2 โหมดตรง ๆ โดยไม่มีการสลับ copy
 * ภายใน — เราเลยวาง <DailyResetTimer /> แยกไว้ข้างนอก panel เอง แทนที่จะฝากให้ panel จัดการ
 *
 * 🎯 win/loss ใช้ pattern เดียวกับหน้า unlimited (remaining-guesses cap เป็นเงื่อนไขแพ้จริง)
 * ไม่ใช่ pattern ของ quote daily (unlimited attempts + surrender) — เพื่อให้ streak มี stake จริง
 */
export default function DailySilhouetteWrapper({ initialTarget }: { initialTarget: SilhouetteTargetHidden | null }) {
    if (!FEATURE_FLAGS.daily?.silhouette) {
        return <Sealed />;
    }

    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useSilhouetteGame();
    const { target, revealedCharacter, guesses, setTarget, finalizeGame, hasFinalized, _hasHydrated, stats, loadStats } = gameStore;
    const characters = getCharacters();
    const isSynced = target !== null && initialTarget !== null && target.id === initialTarget.id;

    // 📅 Daily Hub: markModePlayed('silhouette', won) ถูกเรียกตอนเกมจบจริงเท่านั้น (ดู effect ด้านล่าง)
    const { markModePlayed } = useDailyHub();

    // 🗓️ target ของ daily มาจาก server เสมอ — setTarget เวอร์ชัน daily (ดู useSilhouetteGame.ts)
    // เช็ค id เองว่าเป็นวันเดิม (sync เฉย ๆ) หรือวันใหม่ (เริ่มรอบสะอาด) ไม่ต้องมี force flag แบบ unlimited
    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            setTarget(initialTarget);

            logFullTarget(target);
        }
    }, [initialTarget, _hasHydrated]);

    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    // 🔄 วันใหม่มาแล้ว (target id เปลี่ยน) — เคลียร์ local UI state ที่ผูกกับรอบเก่า
    useEffect(() => {
        setManuallyClosed(false);
        setRevealDelayDone(false);
    }, [target?.id]);

    // 🎯 remaining-attempts cap กลับมาใช้เหมือน unlimited: ให้ streak มี stake จริง
    const remainingGuesses = Math.max(0, MAX_DAILY_SILHOUETTE_GUESSES - guesses.length);
    const isWin = guesses.some(g => g.status === 'correct');
    const isLoss = guesses.length >= MAX_DAILY_SILHOUETTE_GUESSES && !isWin;
    const isGameOver = isWin || isLoss;
    const showSummary = _hasHydrated && isReady && isGameOver && !manuallyClosed && revealDelayDone;

    const latestGuess = guesses[0];
    const isFreshFinish = Boolean(latestGuess?.isNew && isGameOver);

    // ⏳ ดีเลย์เล็กน้อยก่อนเปิด summary ตอนเพิ่งจบสด ๆ (เท่าหน้า unlimited) เพื่อให้เอฟเฟกต์
    // ทาย-ถูก/ทาย-ผิดใน SilhouetteGuessTable เล่นจบก่อนสลับไปหน้าสรุป
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
        setIsReady(true);
    }, [_hasHydrated, loadStats]);

    useEffect(() => {
        loadStats(); // โหลด stats จาก localStorage เข้า store ครั้งเดียวตอน mount
    }, [loadStats]);

    // 🚪 แจ้ง NavigationContext กลับไปตอน "isReady" เป็น true จริงๆ (หลัง rehydrate เสร็จ)
    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    // 🏁 finalize แค่ครั้งเดียวต่อวัน (guard ด้วย hasFinalized + isSynced กัน finalize ก่อน
    // reconcile target จาก server เสร็จ)
    useEffect(() => {
        if (!_hasHydrated || !isSynced) return;
        if (isGameOver && !hasFinalized) {
            finalizeGame(isWin);
            markModePlayed('silhouette', isWin);
        }
    }, [isGameOver, hasFinalized, isWin, _hasHydrated, isSynced, finalizeGame, markModePlayed]);

    const handleCloseModal = () => {
        // 🔒 daily มี target ตายตัว 1 ตัว/วัน — ปิด modal แค่กลับไปดู log การเดา ไม่ reset ไปสุ่มตัวใหม่
        // (ต่างจาก unlimited ที่ resetGame() + initializeGame(true) เพื่อเอาตัวใหม่ทันที)
        setManuallyClosed(true);
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

            <main className="max-w-[80%] mx-auto px-4 pb-24">
                <ModeBadge mode="daily" onClick={() => setIsModeSelectorOpen(true)} />
                <SubHeader title={BL_MODES_METADATA.silhouette.title} subtitle={BL_MODES_METADATA.silhouette.statusLine} />

                {!showSummary && (
                    <div className="w-full max-w-xl mx-auto mt-4">
                        <SilhouetteControlPanel
                            mode="daily"
                            target={target}
                            characters={characters}
                            remainingGuesses={remainingGuesses}
                            stats={stats}
                            game={gameStore}
                            isGameOver={isGameOver}
                            timeLeft={timeLeft}
                        />
                    </div>
                )}

                {(guesses.length > 0 && !showSummary) && (
                    <div className="w-full max-w-xl mx-auto">
                        <Divider />
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 py-1 mb-2">
                            {([
                                ['correct', '#0d2918', '#1a5530', '#4de880', 'Correct Match'],
                                ['wrong', '#590e0e', '#a64747', '#e8b4b4', 'Incorrect'],
                            ] as const).map(([key, bg, border, fg, label]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <span className="inline-block w-[10px] h-[10px] shrink-0" style={{ background: bg, border: `1px solid ${border}` }} />
                                    <span className="text-[11px] font-mono tracking-wider opacity-60">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="w-full mt-2">
                    {showSummary ? (
                        <>
                            <SilhouetteSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} revealedCharacter={revealedCharacter} isWin={isWin} mode="daily" stats={stats} />
                            {/* 📅 Daily Hub: CTA "เล่นต่อ" ต่อท้ายการ์ดสรุปผล */}
                            <DailyHubModalFooter activeMode="silhouette" />
                        </>
                    ) : target && isSynced ? (
                        <SilhouetteGuessTable guesses={guesses} />
                    ) : (
                        <div className="mt-32 flex flex-col items-center justify-center">
                            <p className="text-xs uppercase tracking-[0.25em] font-mono text-[#777796] animate-pulse">
                                Opening Senkaimon...
                            </p>
                        </div>
                    )}
                </div>
            </main>

            <SilhouetteHowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="daily" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}