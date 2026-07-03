// src/features/song/hooks/unlimited/useSongGame.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSongGuessStatus } from '@/src/lib/game-engine/compareSong';
import { getSongById, getSongs } from '@/src/lib/utils/song';
import { SongGameController, SongGuessEntry } from '@/src/features/song/types';
import { MAX_SONG_GUESSES } from '@/src/const/guess';

// 🛡️ Type guard ตรวจสอบว่า guess entry ตรง schema ปัจจุบันจริง กัน corrupted/legacy data
function isValidGuessEntry(entry: unknown): entry is SongGuessEntry {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'status' in entry &&
        (entry as SongGuessEntry).status !== undefined &&
        ((entry as SongGuessEntry).status === 'correct' || (entry as SongGuessEntry).status === 'wrong') &&
        'guess' in entry &&
        typeof (entry as SongGuessEntry).guess === 'object'
    );
}

export const useSongGame = create<SongGameController>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            addGuess: (songId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_SONG_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedSong = getSongById(songId);
                if (!guessedSong) return state;

                // 🛡️ กันเดาเพลงซ้ำ (เผื่อ UI ฝั่งเรียกมาซ้ำโดยไม่ผ่าน guessedIds guard ของ SongSearchBar)
                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedSong.id);
                if (alreadyGuessed) return state;

                const status = getSongGuessStatus(guessedSong, state.target);
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

                const allSongs = getSongs();

                const completedData = JSON.parse(localStorage.getItem('bleachdle-song-completed') || '{}');
                const completedIds: string[] = completedData.unlimited || [];

                const remainingSongs = allSongs.filter(s => !completedIds.includes(s.id));

                if (remainingSongs.length === 0) {
                    set({ target: null, guesses: [], hasFinalized: false });
                } else {
                    set({
                        target: remainingSongs[Math.floor(Math.random() * remainingSongs.length)],
                        guesses: [],
                        hasFinalized: false
                    });
                }
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized } = get();
                if (!target || hasFinalized) return;

                const completedData = JSON.parse(localStorage.getItem('bleachdle-song-completed') || '{}');

                if (isWin) {
                    const currentUnlimited: string[] = completedData.unlimited || [];
                    completedData.unlimited = [...new Set([...currentUnlimited, target.id])];
                } else {
                    // ⚠️ แพ้ = เคลียร์ progress การเก็บครบชุดทิ้งทั้งหมด (เหมือน logic character เป๊ะ)
                    completedData.unlimited = [];
                }

                localStorage.setItem('bleachdle-song-completed', JSON.stringify(completedData));
                set({ hasFinalized: true });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false });
            },

            hardReset: () => {
                const progressData = JSON.parse(localStorage.getItem('bleachdle-song-progress') || '{}');
                delete progressData.unlimited;
                localStorage.setItem('bleachdle-song-progress', JSON.stringify(progressData));

                const completedData = JSON.parse(localStorage.getItem('bleachdle-song-completed') || '{}');
                completedData.unlimited = [];
                localStorage.setItem('bleachdle-song-completed', JSON.stringify(completedData));

                set({ target: null, guesses: [], hasFinalized: false });

                setTimeout(() => {
                    get().initializeGame(true);
                }, 0);
            },
        }),
        {
            name: 'unlimited',
            // 🗄️ เก็บใน key ของตัวเอง 'bleachdle-song-progress' แยกจาก character โดยสิ้นเชิง
            // แต่ยังคง nest 'unlimited' / (ต่อไป) 'daily' ไว้ข้างในแบบเดียวกับ character-progress
            storage: createJSONStorage(() => ({
                getItem: (name) => {
                    const data = JSON.parse(localStorage.getItem('bleachdle-song-progress') || '{}');
                    return data[name] ? JSON.stringify(data[name]) : null;
                },
                setItem: (name, value) => {
                    const data = JSON.parse(localStorage.getItem('bleachdle-song-progress') || '{}');
                    data[name] = JSON.parse(value);
                    localStorage.setItem('bleachdle-song-progress', JSON.stringify(data));
                },
                removeItem: (name) => {
                    const data = JSON.parse(localStorage.getItem('bleachdle-song-progress') || '{}');
                    delete data[name];
                    localStorage.setItem('bleachdle-song-progress', JSON.stringify(data));
                }
            })),
            // ✅ ใหม่ — isNew เป็น ephemeral UI flag เท่านั้น ไม่ควรมีค่าจริงข้าม session
            // force false เสมอตอน persist กัน "ทายสดๆ" false-positive หลัง F5
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
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