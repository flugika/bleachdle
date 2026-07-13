// src/features/song/hooks/daily/useSongGame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { compareBinaryGuess } from '@/src/lib/guessGame/compareBinaryGuess';
import { defaultIsValidGuessEntry } from '@/src/lib/guessGame/types';
import { getSongById } from '@/src/features/song/song';
import { recordDailyStat } from '@/src/services/statsClient';
import { SongGuessEntry, DailySongGameState } from '@/src/features/song/types';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { Stats } from '@/src/lib/guessGame/types';
import { MAX_DAILY_SONG_GUESSES } from '@/src/const/guess';
import { BleachSong } from '@/src/entities/song/schema';

const isValidGuessEntry = defaultIsValidGuessEntry<BleachSong>;

export const useSongGame = create<DailySongGameState>()(
    persist(
        (set, get) => ({
            target: null,
            targetSegmentId: null,
            guesses: [],
            stats: { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} };
                set({ stats: saved });
            },

            addGuess: (songId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_DAILY_SONG_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedSong = getSongById(songId);
                if (!guessedSong) return state;

                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedSong.id);
                if (alreadyGuessed) return state;

                const status = compareBinaryGuess(guessedSong, state.target.id);
                const newEntry: SongGuessEntry = { guess: guessedSong, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            initializeGame: (target, segmentId) => {
                if (!target || !segmentId) return;
                const currentSegmentId = get().targetSegmentId;
                if (currentSegmentId === segmentId) return;

                set({ target, targetSegmentId: segmentId, guesses: [], hasFinalized: false });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized, guesses } = get();
                if (!target || hasFinalized) return;

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
                const today = new Date().toISOString().split('T')[0];

                if (isWin) {
                    const history = completedData.daily || [];
                    completedData.daily = [...new Set([...history, today])];
                } else {
                    completedData.daily = [];
                }

                localStorage.setItem(STORAGE_KEYS.SONG_COMPLETED, JSON.stringify(completedData));

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const savedStats: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} };

                const playedCount = savedStats.playedCount + (isWin ? 1 : 0);
                const passedCount = savedStats.passedCount + (isWin ? 0 : 1);

                const guessDistribution = { ...savedStats.guessDistribution };
                if (isWin) {
                    const bucket = guesses.length >= 6 ? '6' : String(guesses.length);
                    guessDistribution[bucket] = (guessDistribution[bucket] || 0) + 1;
                }

                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1) : savedStats.maxStreak,
                    playedCount,
                    passedCount,
                    guessDistribution,
                };

                statsData.daily = newStats;
                localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));

                set({ hasFinalized: true, stats: newStats });
                recordDailyStat('song', isWin, guesses.length).catch(() => { });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false });
            },
        }),
        {
            name: 'daily',
            storage: nestedJSONStorage(STORAGE_KEYS.SONG_PROGRESS),
            // ✂️ ซ่อนข้อมูลโดยการเก็บแค่ ID ดิบ ๆ ลง LocalStorage
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ 
                    guess: { id: guess.id } as BleachSong, 
                    status, 
                    isNew: false 
                })),
                target: state.target ? { id: state.target.id } as BleachSong : null,
                targetSegmentId: state.targetSegmentId,
                hasFinalized: state.hasFinalized,
            }),
            // 🔄 ดึงข้อมูลตัวเต็มกลับคืนมาผ่านฟังก์ชันค้นหา ID 
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (state.target?.id) {
                        state.target = getSongById(state.target.id) || null;
                    }

                    if (Array.isArray(state.guesses)) {
                        state.guesses = state.guesses.map(g => {
                            if (g.guess?.id) {
                                const fullSong = getSongById(g.guess.id);
                                return fullSong ? { ...g, guess: fullSong } : g;
                            }
                            return g;
                        });
                    }

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