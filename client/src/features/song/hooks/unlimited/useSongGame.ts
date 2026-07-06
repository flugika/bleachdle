// src/features/song/hooks/unlimited/useSongGame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSongStatus } from '@/src/features/song/compareSong';
import { getAllSongSegments, getSongById } from '@/src/features/song/song';
import { SongGameController, SongGuessEntry } from '@/src/features/song/types';
import { MAX_SONG_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { isValidGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/shared/types/guessGame';

export const useSongGame = create<SongGameController>()(
    persist(
        (set, get) => ({
            target: null,
            targetSegmentId: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            stats: { currentStreak: 0, maxStreak: 0 }, // 🆕
            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
                set({ stats: saved });
            },

            addGuess: (songId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_SONG_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedSong = getSongById(songId);
                if (!guessedSong) return state;

                // 🛡️ กันเดาเพลงซ้ำ (เผื่อ UI ฝั่งเรียกมาซ้ำโดยไม่ผ่าน guessedIds guard ของ SongSearchBar)
                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedSong.id);
                if (alreadyGuessed) return state;

                const status = getSongStatus(guessedSong, state.target);
                const newEntry: SongGuessEntry = { guess: guessedSong, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            // 🛡️ ROOT-CAUSE FIX เดียวกับ useCharacterGame: เช็คแค่ "มี target แล้วหรือยัง" ไม่สนจำนวน
            // guesses กัน StrictMode double-invoke / component remount ตอนสลับหน้าผ่าน Senkaimon
            // สุ่ม target ใหม่ทับของเดิมซ้อนกัน + HYDRATION GUARD กัน race กับ persist rehydrate (async)
            initializeGame: (force = false) => {
                const { target, _hasHydrated } = get();

                if (!_hasHydrated) return;
                if (!force && target) return;

                const allSegments = getAllSongSegments();

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');

                // 🧠 เปลี่ยนชื่อตัวแปรให้สื่อความหมาย: ตอนนี้เราจะเก็บเป็น "ID ของเพลงหลัก" ที่ผ่านแล้ว
                const completedSongIds: string[] = completedData.unlimited || [];

                // 🛡️ FIX: เช็ค s.song_id แทน s.id เพื่อไม่ให้เซกเมนต์อื่นของเพลงเดิมหลุดเข้ามาได้อีก
                const remainingSegments = allSegments.filter(s => !completedSongIds.includes(s.song_id));

                if (remainingSegments.length === 0) {
                    set({ target: null, targetSegmentId: null, guesses: [], hasFinalized: false });
                } else {
                    const randomSegment = remainingSegments[Math.floor(Math.random() * remainingSegments.length)];
                    const parentSong = getSongById(randomSegment.song_id);

                    if (parentSong) {
                        set({
                            target: parentSong,
                            targetSegmentId: randomSegment.id,
                            guesses: [],
                            hasFinalized: false
                        });
                    }
                }
            },

            finalizeGame: (isWin) => {
                const { target, targetSegmentId, hasFinalized } = get();
                if (!target || !targetSegmentId || hasFinalized) return;

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');

                if (isWin) {
                    const currentUnlimited: string[] = completedData.unlimited || [];
                    // 🧠 FIX: บันทึก target.id (Song ID) ลงไปแทน เพื่อบอกว่า "เพลงนี้ทั้งเพลงเล่นผ่านแล้วนะ"
                    completedData.unlimited = [...new Set([...currentUnlimited, target.id])];
                } else {
                    completedData.unlimited = [];
                }

                localStorage.setItem(STORAGE_KEYS.SONG_COMPLETED, JSON.stringify(completedData));
                // 🆕 ย้าย logic ของ updateStats เดิม (ที่เคยอยู่ในคอมโพเนนต์) เข้ามาตรงนี้
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const savedStats: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin
                        ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1)
                        : savedStats.maxStreak,
                };

                statsData.unlimited = newStats;
                localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));

                set({
                    hasFinalized: true,
                    stats: newStats, // 🆕
                });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false });
            },

            hardReset: () => {
                const progressData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_PROGRESS) || '{}');
                delete progressData.unlimited;
                localStorage.setItem(STORAGE_KEYS.SONG_PROGRESS, JSON.stringify(progressData));

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
                completedData.unlimited = [];
                localStorage.setItem(STORAGE_KEYS.SONG_COMPLETED, JSON.stringify(completedData));

                set({ target: null, guesses: [], hasFinalized: false });

                setTimeout(() => {
                    get().initializeGame(true);
                }, 0);
            },
            resetStreakKeepMax: () => {
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

                const resetStats: Stats = { currentStreak: 0, maxStreak: saved.maxStreak };

                statsData.unlimited = resetStats;
                localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));

                set({ stats: resetStats });
            },
        }),
        {
            name: 'unlimited',
            // 🗄️ เก็บใน key ของตัวเอง STORAGE_KEYS.SONG_PROGRESS แยกจาก character โดยสิ้นเชิง
            // แต่ยังคง nest 'unlimited' / (ต่อไป) 'daily' ไว้ข้างในแบบเดียวกับ character-progress
            storage: nestedJSONStorage(STORAGE_KEYS.SONG_PROGRESS),
            // ✅ ใหม่ — isNew เป็น ephemeral UI flag เท่านั้น ไม่ควรมีค่าจริงข้าม session
            // force false เสมอตอน persist กัน "ทายสดๆ" false-positive หลัง F5
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
                targetSegmentId: state.targetSegmentId,
                hasFinalized: state.hasFinalized,
            }),
            // 👇 หัวใจของ fix: บอก store ว่า rehydrate เสร็จแล้วจริงๆ (เหมือน character store)
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // 🛡️ ตรวจ guesses ทุกตัว ถ้าเจอ shape ไม่ตรง schema ปัจจุบัน (จากข้อมูล legacy)
                    // ให้ล้างทิ้งทั้งรอบแทนที่จะปล่อยให้ isWin คำนวณผิดแบบเงียบๆ
                    const hasCorruptedData = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidGuessEntry(g));

                    if (hasCorruptedData) {
                        state.guesses = [];
                        state.target = null;
                        state.hasFinalized = false;
                    }

                    state.setHasHydrated(true);
                }
            },
        }
    )
);