"use client";

import { useEffect, useState } from 'react';
import { GuessTable } from '@/src/features/character';
import { useCharacterGame } from '@/src/features/character/hooks/daily/useCharacterGame';
import { getCharacters } from '@/src/lib/utils/character';
import { SummaryGuess } from '@/src/features/character/components/shared/SummaryGuess';
import { HowToPlayModal } from '@/src/features/character/components/shared/HowToPlayModal';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { Character } from '@/src/entities/character/schema';
import { CharacterControlPanel } from '@/src/shared/ui/control-panel/CharacterControlPanel';
import { ModeBadge } from '@/src/shared/ui/ModeBadge';
import { usePathname, useRouter } from 'next/navigation';
import { ModeSelectorModal } from '@/src/shared/ui/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import SoulSyncLoader from '@/src/shared/ui/loader/SoulSyncLoader'
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';

export default function DailyCharacterWrapper({ initialTarget }: { initialTarget: Character | null }) {
    if (!FEATURE_FLAGS.daily.character) {
        return (
            <Sealed />
        )
    }

    const router = useRouter();
    const pathname = usePathname();
    const { navigate, state, reportReady } = useSenkaimon(); // 👈 ดึง state + reportReady มาด้วย ใช้คุม modal ตอน transition และแจ้งความพร้อมกลับไปที่ Senkaimon

    // 🛡️ เดิมเรียก useCharacterGame() 2 ครั้งแยกกัน (ตัวแปร game + destructure ซ้ำ) รวมเป็นจุดเดียว
    const gameStore = useCharacterGame();
    const { target, guesses, initializeGame, finalizeGame, resetGame, hasFinalized, _hasHydrated } = gameStore;
    const characters = getCharacters();

    useEffect(() => {
        if (!_hasHydrated) return;
        if (initialTarget !== null) {
            initializeGame(initialTarget);

            // 🛡️ debug log แบบ deterministic — log ค่า "settled" ที่ set ไปจริงๆ ครั้งเดียว
            // แทนที่จะ subscribe แบบ reactive กับทุก mutation ของ store (ของเดิม log ค่า target
            // ที่ persist ค้างจากเมื่อวานแวบหนึ่งก่อนจะถูกแก้เป็นของวันนี้ เลยเห็น log ผิดสลับถูก)
            if (process.env.NODE_ENV !== 'production') {
                console.log('target:', useCharacterGame.getState().target);
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
    // ผูกกับ state ตรงๆ ไม่พึ่งลำดับการเรียกจาก handleSwitchDimension เพียงจุดเดียว
    // ครอบคลุมทุกทางที่ modal อาจถูกเปิดค้างไว้ระหว่าง transition
    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    const isWin = guesses.length > 0 &&
        (Object.entries(guesses[0].result)
            .filter(([key]) => key !== 'image')
            .every(([_, status]) => status === 'correct')
        );
    const isLoss = isSurrendered || (hasFinalized && !isWin);
    const isGameOver = isWin || isLoss;

    // ── 🛡️ จัดการโครงสร้างสถิติแบบ Object Nesting
    const updateStats = (won: boolean) => {
        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
        const saved = statsData.daily || { currentStreak: 0, maxStreak: 0 };

        const newStats = {
            currentStreak: won ? saved.currentStreak + 1 : 0,
            maxStreak: won ? Math.max(saved.maxStreak, saved.currentStreak + 1) : saved.maxStreak
        };

        statsData.daily = newStats;
        localStorage.setItem(STORAGE_KEYS.CHARACTER_STATS, JSON.stringify(statsData));
        setStats(newStats);
    };

    const handleSwitchDimension = (targetMode: 'daily' | 'unlimited') => {
        // 1. ปิด Modal เลือกโหมด (redundant กับ effect ด้านบนโดยตั้งใจ — ปิดให้ไวที่สุดเท่าที่ทำได้
        //    effect ที่ผูกกับ state คือ safety-net ปิดซ้ำอีกชั้นให้แน่ใจ)
        setIsModeSelectorOpen(false);

        // 2. โยนเป้าหมายให้ระบบเซนไกมงจัดการคำนวณตำแหน่งและสลับมิติให้เองแบบไร้รอยต่อ
        navigate(targetMode);
    };

    // โหลดและซิงค์ข้อมูลฝั่ง Client จากคีย์หลักแบบไม่มีจุดทศนิยมต่อท้าย
    useEffect(() => {
        if (!_hasHydrated) return;
        const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
        setStats(statsData.daily || { currentStreak: 0, maxStreak: 0 });

        initializeGame();
        setIsReady(true);
    }, [initializeGame, characters.length, _hasHydrated]);

    // 🚪 FIX (ประตูเปิดก่อนหน้าพร้อม): แจ้ง NavigationContext กลับไปตอน "isReady" เป็น true จริงๆ
    // (คือหลัง zustand rehydrate + initializeGame() เสร็จสมบูรณ์) แทนที่จะปล่อยให้ระบบ
    // เปิดประตูเองผ่าน READY_FALLBACK_MS (1200ms) ซึ่ง race กับความเร็วเครื่อง/เน็ตของผู้เล่นได้
    // เดิม component นี้ไม่เคยเรียก reportReady() เลย ทำให้ประตูเปิดตามเวลา fallback เสมอ
    // ไม่ว่าหน้าจอจะพร้อมแสดงผลจริงหรือยัง
    useEffect(() => {
        if (isReady) {
            reportReady();
        }
    }, [isReady, reportReady]);

    useEffect(() => {
        if (!_hasHydrated) return;

        if (isGameOver) {
            // 🛡️ คีย์เวิร์ดสำคัญ: หากสเตตัสถูกบันทึกถาวรลง Store เรียบร้อยแล้ว (เกิดจากการ F5)
            // ให้สั่งเปิดเบิกมอดอลสรุปผลทันที 0ms ไร้อาการหน่วงดีเลย์ให้ผู้เล่นเห็นตารางแวบแรก
            if (hasFinalized) {
                setIsModalOpen(true);
                return;
            }

            // จังหวะปกติที่เพิ่งกดปุ่มยอมแพ้สดๆ ร้อนๆ ในหน้านั้น
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
            midnight.setHours(24, 0, 0, 0); // ตั้งเวลาเป็นเที่ยงคืนถัดไป

            const diff = midnight.getTime() - now.getTime();

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // 🛡️ FIX: คำนวณทันทีตอน mount ก่อน 1 ครั้ง — เดิม setInterval ไม่ยิง callback แรกทันที
        // ต้องรอครบ 1000ms ก่อนเสมอ ทำให้ timeLeft ว่างเปล่าค้าง ~1 วินาทีทุกครั้งที่หน้านี้ mount
        // (เห็นชัดตอนสลับมิติเข้ามาใหม่ เพราะ mount ใหม่ทุกครั้ง ไม่ใช่แค่ครั้งแรกที่เข้าเว็บ)
        setTimeLeft(calculateTimeLeft());

        // อัปเดตทุกวินาที
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
                <SubHeader title={BL_MODES_METADATA.character.title} subtitle={BL_MODES_METADATA.character.statusLine} />

                {!isModalOpen && (
                    <CharacterControlPanel
                        mode="daily"
                        target={target}
                        characters={characters}
                        stats={stats}
                        timeLeft={timeLeft}
                        game={gameStore}
                        isGameOver={isGameOver}                // 👈 ส่งสถานะการจบเกมไปเช็คซ่อนปุ่ม
                        onSurrender={() => setIsSurrendered(true)}  // 👈 ส่ง Callback ไปสั่งยอมแพ้
                    />
                )}

                {guesses.length > 0 && (
                    <>
                        <Divider />
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                            {([
                                ['correct', '#0d2918', '#1a5530', '#4de880', 'Correct'],
                                ['partial', '#2a1f00', '#5a4000', '#e8b830', 'Partial'],
                                ['wrong', '#590e0e', '#a64747', '#3a2828', 'Wrong'],
                                ['dir', '#0a0a22', '#3a3a7a', '#7090f0', 'Higher ▲ / Lower ▼'],
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
                    <SummaryGuess isOpen={isModalOpen} onClose={handleCloseModal} guesses={guesses} target={target} isWin={isWin} mode="daily" stats={stats} />
                ) : !isReady ? (
                    <SoulSyncLoader />
                ) : target ? (
                    <div className="w-full overflow-x-auto">
                        <GuessTable guesses={guesses} />
                    </div>
                ) : (
                    <div className="mt-40 flex flex-col items-center justify-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#5a5a78] animate-bounce">
                            Opening Senkaimon...
                        </p>
                    </div>
                )}
            </main>
            <HowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="daily" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}