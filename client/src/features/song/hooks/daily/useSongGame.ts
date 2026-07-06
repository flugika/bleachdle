// src/features/song/hooks/daily/useSongGame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BleachSong } from '@/src/entities/song/schema';
import { getSongStatus } from '@/src/features/song/compareSong';
import { getSongById } from '@/src/features/song/song';
import { recordDailyStat } from '@/src/services/statsClient';
import { SongGuessEntry, DailySongGameState } from '@/src/features/song/types';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { isValidGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/shared/types/guessGame';

export const useSongGame = create<DailySongGameState>()(
    persist(
        (set, get) => ({
            target: null,
            targetSegmentId: null,
            guesses: [],
            stats: { currentStreak: 0, maxStreak: 0 }, // 🆕
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };
                set({ stats: saved });
            },

            // 🎵 ไม่มี max guess ในโหมด daily (ต่างจาก unlimited ที่ cap ด้วย MAX_SONG_GUESSES)
            // ทายได้ไม่จำกัดจนกว่าจะถูก หรือกดยอมแพ้ — ปุ่มยอมแพ้คุมจาก UI (isSurrendered ใน
            // wrapper component) ไม่ใช่จาก store ตรงนี้ ยังคงกันเดาเพลงซ้ำไว้เหมือนเดิม
            addGuess: (songId: string) => set((state) => {
                if (!state.target) return state;

                const guessedSong = getSongById(songId);
                if (!guessedSong) return state;

                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedSong.id);
                if (alreadyGuessed) return state;

                const status = getSongStatus(guessedSong, state.target);
                const newEntry: SongGuessEntry = { guess: guessedSong, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            // 🛡️ pattern เดียวกับ useCharacterGame.ts (daily) เป๊ะ: set เฉพาะตอน target
            // เปลี่ยนจริง (id ไม่ตรงของเดิม) กัน re-render เปล่าตอน effect ยิงซ้ำ (เช่น
            // StrictMode double-invoke ตอน dev) และกัน progress ของวันนี้โดนรีเซ็ตทับ
            // ถ้า initialTarget จาก server เป็น object คนละ reference แต่ id เดียวกัน
            initializeGame: (target, segmentId) => {
                if (!target || !segmentId) return;

                const currentSegmentId = get().targetSegmentId;

                // เช็คว่าถ้าเป็นควิซเดิมของวันนี้ จะได้ไม่โดนรีเซ็ต
                if (currentSegmentId === segmentId) {
                    return;
                }

                set({ target, targetSegmentId: segmentId, guesses: [], hasFinalized: false });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized, guesses } = get();
                if (!target || hasFinalized) return;

                const completedData = JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}'
                );
                const today = new Date().toISOString().split('T')[0];

                if (isWin) {
                    const history = completedData.daily || [];
                    completedData.daily = [...new Set([...history, today])];
                } else {
                    completedData.daily = [];
                }

                localStorage.setItem(
                    STORAGE_KEYS.SONG_COMPLETED,
                    JSON.stringify(completedData)
                );

                // ── 🆕 stats: ย้าย logic จาก updateStats เดิมเข้ามาตรงนี้ ──
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const savedStats: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };

                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin
                        ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1)
                        : savedStats.maxStreak,
                };

                statsData.daily = newStats;
                localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));

                set({ hasFinalized: true, stats: newStats }); // 🆕 อัปเดต stats พร้อมกันในนี้เลย

                recordDailyStat('song', isWin, guesses.length).catch(() => { });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false });
            },
        }),
        {
            name: 'daily',
            // 🗄️ เก็บใน key ของตัวเอง STORAGE_KEYS.SONG_PROGRESS นamespace 'daily' แยกจาก
            // 'unlimited' ที่อยู่ในไฟล์เดียวกัน (โครงสร้างเดียวกับ character-progress เป๊ะ)
            storage: nestedJSONStorage(STORAGE_KEYS.SONG_PROGRESS),
            // isNew เป็น ephemeral UI flag เท่านั้น ไม่ควรมีค่าจริงข้าม session — force false เสมอ
            // ตอน persist กัน "ทายสดๆ" false-positive หลัง F5 (เหมือน unlimited เป๊ะ)
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
                targetSegmentId: state.targetSegmentId,
                hasFinalized: state.hasFinalized,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // 🛡️ ตรวจ guesses ทุกตัว ถ้าเจอ shape ไม่ตรง schema ปัจจุบัน (legacy/corrupted)
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