"use client";

import { useEffect, useState } from 'react';
import { Header } from '@/src/shared/layout/Header';
import { Divider } from '@/src/shared/layout/Divider';
import { SubHeader } from '@/src/shared/layout/SubHeader';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import { ModeBadge } from '@/src/shared/ui/ModeBadge';
import { HowToPlayModal } from '@/src/features/character/components/shared/HowToPlayModal';
import { ModeSelectorModal } from '@/src/shared/ui/ModeSelectorModal';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';

// 🎵 TODO: เปลี่ยนเป็น schema จริงของเพลง (ตอนนี้ยังไม่มี hook/store — ใช้ type คร่าวๆ กันไว้ก่อน)
// import { Song } from '@/src/entities/song/schema';
// import { getSongs } from '@/src/lib/utils/song';

export default function UnlimitedSongGame() {
    // 🛡️ TODO: เพิ่ม `song: { daily: boolean; unlimited: boolean }` ใน feature.flags.ts
    // ถ้ายังไม่มี key นี้ ให้ลบเงื่อนไขนี้ออกชั่วคราว หรือใส่ FEATURE_FLAGS.unlimited.song ให้ตรงจริง
    if (!FEATURE_FLAGS.unlimited?.song) {
        return <Sealed />;
    }

    const { navigate, state } = useSenkaimon(); // 👈 ใช้ระบบเซนไกมงเดิม คุม transition ระหว่างสลับมิติ

    // 🎵 TODO: ย้าย state พวกนี้ไปอยู่ใน useSongGame() store (zustand) แบบเดียวกับ useCharacterGame
    // ตอนนี้ mock ไว้คร่าวๆ ให้ layout render ได้ก่อน ยังไม่ผูก game logic จริง
    const [isReady, setIsReady] = useState(false);
    const [guesses, setGuesses] = useState<any[]>([]); // TODO: type ให้ตรงกับ SongGuess
    const [target, setTarget] = useState<any | null>(null); // TODO: type ให้ตรงกับ Song
    const [stats, setStats] = useState({ currentStreak: 0, maxStreak: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);

    // 🛡️ ปิด modal เลือกโหมดทันทีที่ประตูเซนไกมงเริ่ม "closing" (ตาม pattern เดิมของหน้า character)
    useEffect(() => {
        if (state === "closing") {
            setIsModeSelectorOpen(false);
        }
    }, [state]);

    // 🎵 TODO: แทนที่ด้วย initializeGame() ของ useSongGame store จริง
    useEffect(() => {
        setIsReady(true);
    }, []);

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
                <SubHeader title="MELODIC REIATSU SCAN" description="System // Scanning for Song Signature" />

                {/* 🎵 TODO: ใส่ search/input สำหรับทายเพลง แทน SearchBar ของ character */}
                {!isModalOpen && (
                    <div className="flex justify-center">
                        {/* <SongSearchBar songs={songs} disabled={!target} game={songGameStore} /> */}
                        <p className="text-xs uppercase tracking-[0.2em] text-[#5a5a78] mt-6">
                            🎵 Song search input — coming soon
                        </p>
                    </div>
                )}

                {guesses.length > 0 && <Divider />}

                {/* 🎵 TODO: สลับเป็น SongGuessTable เมื่อมี component จริง */}
                {!isModalOpen && (
                    isReady && target ? (
                        <div className="w-full overflow-x-auto">
                            {/* <SongGuessTable guesses={guesses} /> */}
                            <p className="text-center text-xs text-[#5a5a78] mt-10">
                                🎵 Song guess table — coming soon
                            </p>
                        </div>
                    ) : !isReady ? (
                        <div className="mt-40 flex flex-col items-center justify-center animate-pulse">
                            <span className="text-4xl text-[#c8a96e] animate-spin mb-4">卍</span>
                            <p className="text-xs uppercase tracking-[0.2em] text-[#5a5a78]">
                                Synchronizing Soul Spiritual Energy...
                            </p>
                        </div>
                    ) : (
                        <div className="mt-40 flex flex-col items-center justify-center">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#5a5a78] animate-bounce">
                                Opening Senkaimon...
                            </p>
                        </div>
                    )
                )}
            </main>

            <HowToPlayModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} mode="unlimited" />
            <ModeSelectorModal
                isOpen={isModeSelectorOpen}
                onClose={() => setIsModeSelectorOpen(false)}
                onSelectMode={handleSwitchDimension}
            />
        </div>
    );
}