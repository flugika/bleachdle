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
import { getTodayStr } from '@/src/lib/utils/format';

const isValidGuessEntry = defaultIsValidGuessEntry<BleachSong>;

interface SongDateMetadata {
    date?: string;
    scheduledDate?: string;
}

interface ExtendedDailySongGameState extends Omit<DailySongGameState, 'initializeGame' | 'setTarget'> {
    scheduledDate: string | null;
    setTarget: (target: BleachSong, scheduledDate?: string) => void;
    initializeGame: (target?: BleachSong, segmentId?: string, scheduledDate?: string) => void;
}

export const useSongGame = create<ExtendedDailySongGameState>()(
    persist(
        (set, get) => ({
            target: null,
            targetSegmentId: null,
            scheduledDate: null,
            guesses: [],
            stats: { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target, scheduledDate) => set({
                target,
                scheduledDate: scheduledDate || getTodayStr()
            }),

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

            initializeGame: (target, segmentId, scheduledDate) => {
                if (!target || !segmentId) return;
                const currentSegmentId = get().targetSegmentId;
                const dateStr = scheduledDate || getTodayStr();

                if (currentSegmentId === segmentId) {
                    set({ scheduledDate: dateStr });
                    return;
                }

                set({ target, targetSegmentId: segmentId, scheduledDate: dateStr, guesses: [], hasFinalized: false });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized, guesses, scheduledDate } = get();
                if (!target || hasFinalized) return;

                const targetWithDate = target as BleachSong & SongDateMetadata;
                const targetDate =
                    scheduledDate ||
                    targetWithDate.date ||
                    targetWithDate.scheduledDate ||
                    getTodayStr();

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');

                if (isWin) {
                    const history = completedData.daily || [];
                    completedData.daily = [...new Set([...history, targetDate])];
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

                recordDailyStat('song', isWin, guesses.length, targetDate).catch(() => { });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false, scheduledDate: null });
            },
        }),
        {
            name: 'daily',
            storage: nestedJSONStorage(STORAGE_KEYS.SONG_PROGRESS),
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({
                    guess: { id: guess.id } as BleachSong,
                    status,
                    isNew: false
                })),
                target: state.target ? { id: state.target.id } as BleachSong : null,
                targetSegmentId: state.targetSegmentId,
                scheduledDate: state.scheduledDate,
                hasFinalized: state.hasFinalized,
            }),
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
                        state.scheduledDate = null;
                    }

                    state._hasHydrated = true;
                }
            },
        }
    )
);