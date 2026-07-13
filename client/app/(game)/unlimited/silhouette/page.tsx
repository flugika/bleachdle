// app/unlimited/silhouette/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { SilhouetteGuessTable } from '@/src/features/silhouette/components/shared/SilhouetteGuessTable';
import { SilhouetteControlPanel } from '@/src/shared/ui/control-panel/SilhouetteControlPanel';
import { useSilhouetteGame } from '@/src/features/silhouette/hooks/unlimited/useSilhouetteGame';
import { getSilhouettes } from '@/src/features/silhouette/silhouette';
// ⚠️ เช็คชื่อ/ตำแหน่งฟังก์ชันจริง — SilhouetteControlPanel ต้องการ "full roster" ไม่ filter
// (ต่างจาก getSilhouetteSearchCharacters ที่ใช้ตอนสุ่ม target เท่านั้น)
import { getCharacters } from '@/src/features/character/character';

// ⚠️ TODO: ยังไม่มีไฟล์นี้จริง — ต้องสร้าง SilhouetteSummaryGuess
// โครงสร้าง props ควรเทียบเท่า QuoteSummaryGuess แต่เปลี่ยน target เป็น SilhouetteTarget
// (ขอเนื้อหาไฟล์ QuoteSummaryGuess.tsx เพิ่มเพื่อ copy โครงให้ตรง 100%)
import { SilhouetteSummaryGuess } from '@/src/features/silhouette/components/shared/SilhouetteSummaryGuess';

// ⚠️ TODO: ยังไม่มีไฟล์นี้จริง — ต้องสร้าง SilhouetteHowToPlayModal
// (copy โครงจาก QuoteHowToPlayModal.tsx แล้วเปลี่ยน example card เป็น SilhouetteImage แทน QuoteGuessCard)
import { SilhouetteHowToPlayModal } from '@/src/features/silhouette/components/shared/SilhouetteHowToPlayModal';

import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import Central46ConfidentialArchive from '@/src/shared/ui/Central46ConfidentialArchive';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import { ModeSelectorModal } from '@/src/shared/ui/game-selector/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { MAX_UNLIMITED_SILHOUETTE_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BL_MODES_METADATA } from '@/src/config/mode';
import { logFullTarget } from '@/src/lib/debug/logFullTarget';

export default function UnlimitedSilhouetteGame() {
    // ⚠️ TODO: เพิ่ม key `silhouette: { daily: boolean; unlimited: boolean }` ใน feature.flags.ts
    if (!FEATURE_FLAGS.unlimited?.silhouette) {
        return <Sealed />;
    }

    const { navigate, state, reportReady } = useSenkaimon();

    const gameStore = useSilhouetteGame();
    const { target, revealedCharacter, guesses, initializeGame, finalizeGame, resetGame, hardReset, hasFinalized, _hasHydrated, resetStreakKeepMax, stats, loadStats } = gameStore;
    const silhouettes = getSilhouettes();
    const characters = getCharacters(); // full roster ตามที่ SilhouetteControlPanel ต้องการ

    const [manuallyClosed, setManuallyClosed] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [isGameCompleted, setIsGameCompleted] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    const [revealDelayDone, setRevealDelayDone] = useState(false);
    const [finalRoundGuesses, setFinalRoundGuesses] = useState<typeof guesses>([]);

    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    useEffect(() => {
        setManuallyClosed(false);
        logFullTarget(target);
        setRevealDelayDone(false);
    }, [target]);

    const remainingGuesses = Math.max(0, MAX_UNLIMITED_SILHOUETTE_GUESSES - guesses.length);

    // ⚠️ ระบบ soul-name / reincarnation ก็อปมาจาก quote เพื่อ reuse Central46ConfidentialArchive
    // ต้องเพิ่ม STORAGE_KEYS.SOUL_REGISTRY ก่อนถึงจะทำงานได้จริง
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
    }, [isGameOver, hasFinalized, isWin, _hasHydrated, finalizeGame]);

    useEffect(() => {
        if (!_hasHydrated) return;

        loadStats();

        const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
        const completed: string[] = completedData.unlimited || [];
        // ⚠️ completedIds เก็บเป็น character_id (dedupe แล้ว) แต่ silhouettes.length คือจำนวน "entries" ดิบ
        // ถ้าในอนาคตมี 1 ตัวละคร หลาย silhouette entry เงื่อนไขนี้จะไม่ตรงกันอีกต่อไป
        // ต้อง normalize ทั้งสองฝั่งเป็น unique character_id ก่อนเทียบ
        const uniqueCharacterIds = new Set(silhouettes.map(s => s.character_id));
        setIsGameCompleted(uniqueCharacterIds.size > 0 && completed.length >= uniqueCharacterIds.size);

        const registryData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || '{}');
        const registry = registryData.silhouette || { name: "", count: 0 };
        if (registry.name) {
            setSoulName(registry.name);
        }
        setReincarnationCount(registry.count || 0);

        initializeGame();
        setIsReady(true);
    }, [initializeGame, silhouettes.length, _hasHydrated, loadStats]);

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
    }, [target, silhouettes.length, isReady]);

    const handleCloseModal = () => {
        setManuallyClosed(true);
        resetGame();
        initializeGame(true);
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

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#13131c] via-[#0a0a0e] to-[#050507]">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            {/* 🌌 คุมระดับ Max-Width ของ Main ให้เท่ากับ Quote และเพิ่มมิติการจัดวาง */}
            <main className="max-w-[80%] mx-auto px-4 pb-24">
                <ModeBadge mode="unlimited" onClick={() => setIsModeSelectorOpen(true)} />
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

                    {/* 📊 โซนแสดงรายงานตารางสรุป / ตารางเดาผล */}
                    <div className="w-full mt-2">
                        {showSummary ? (
                            <SilhouetteSummaryGuess isOpen={showSummary} onClose={handleCloseModal} guesses={guesses} target={target} revealedCharacter={revealedCharacter} isWin={isWin} mode="unlimited" stats={stats} />
                        ) : target ? (
                            /* นำแรปเปอร์ขยายจอตัวเดิม (w-full overflow-x-auto) ออก 
                               เนื่องจากตัว SilhouetteGuessTable ด้านในถูกออกแบบใหม่ให้จบในตัวแบบพรีเมียมแล้ว */
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