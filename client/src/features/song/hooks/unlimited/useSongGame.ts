import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { compareBinaryGuess } from '@/src/lib/guessGame/compareBinaryGuess';
import { defaultIsValidGuessEntry } from '@/src/lib/guessGame/types';
import { getAllSongSegments, getSongById } from '@/src/features/song/song';
import { SongGameController, SongGuessEntry } from '@/src/features/song/types';
import { SyncEngine } from '@/src/lib/sync/syncEngine';
import { unlimitedRoundKey } from '@/src/lib/sync/roundKey';
import { MAX_UNLIMITED_SONG_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { Stats } from '@/src/lib/guessGame/types';
import { BleachSong } from '@/src/entities/song/schema';
import { syncProgressImmediately } from '@/src/lib/sync/syncProgressHelper';
import { hydrateGuessEntries } from '@/src/lib/sync/hydrateGuessEntries';
import { fetchActiveRemoteProgress } from '@/src/lib/sync/fetchActiveRemoteProgress';

const isValidGuessEntry = defaultIsValidGuessEntry<BleachSong>;

export const useSongGame = create<SongGameController>()(
    persist(
        (set, get) => ({
            target: null,
            targetSegmentId: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => {
                set({ target });
            },

            stats: { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} };
                set({ stats: saved });
            },

            addGuess: async (songId: string) => {
                let shouldFlushImmediately = false;
                let syncTargetId: string | null = null;
                let syncGuesses: SongGuessEntry[] = [];

                set((state) => {
                    const isGameOver = state.guesses.length >= MAX_UNLIMITED_SONG_GUESSES;
                    if (!state.target || isGameOver) return state;

                    const guessedSong = getSongById(songId);
                    if (!guessedSong) return state;

                    const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedSong.id);
                    if (alreadyGuessed) return state;

                    const status = compareBinaryGuess(guessedSong, state.target.id);
                    const newEntry: SongGuessEntry = { guess: guessedSong, status, isNew: true };
                    const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));
                    const allGuesses = [newEntry, ...prevGuesses];

                    const isNowGameOver = status === 'correct' || allGuesses.length >= MAX_UNLIMITED_SONG_GUESSES;

                    if (isNowGameOver) {
                        shouldFlushImmediately = true;
                        syncTargetId = state.target.id;
                        syncGuesses = allGuesses;
                    } else {
                        SyncEngine.getInstance().queueProgress({
                            gameMode: 'song',
                            gameType: 'unlimited',
                            guesses: allGuesses,
                            targetId: state.target?.id ?? null,
                        });
                    }

                    return { guesses: allGuesses };
                });

                if (shouldFlushImmediately && syncTargetId) {
                    await syncProgressImmediately('song', 'unlimited', syncTargetId, syncGuesses);
                }
            },

            initializeGame: async (force = false, opts: { skipRemoteCheck?: boolean } = {}) => {
                const { target, _hasHydrated } = get();

                if (!_hasHydrated) return;

                if (!force && target) {
                    return;
                }

                // 🆕 กัน 2 เครื่องสุ่มเพลงพร้อมกันได้คนละเพลง
                if (!opts.skipRemoteCheck) {
                    const remote = await fetchActiveRemoteProgress('song', 'unlimited');

                    if (remote?.target_id) {
                        const remoteTarget = getSongById(remote.target_id);
                        if (remoteTarget) {
                            const hydrated = hydrateGuessEntries<BleachSong, SongGuessEntry>(remote.guesses, getSongById);
                            const remoteIsWin = hydrated.some((g) => g.status === 'correct');
                            const remoteIsOver = remoteIsWin || hydrated.length >= MAX_UNLIMITED_SONG_GUESSES;

                            if (!remoteIsOver) {
                                set({ target: remoteTarget, guesses: hydrated, hasFinalized: false });
                                return;
                            }
                        }
                    }
                }

                const allSegments = getAllSongSegments();
                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
                const completedSongIds: string[] = completedData.unlimited || [];

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

                        await syncProgressImmediately('song', 'unlimited', parentSong.id, []);
                    }
                }
            },

            finalizeGame: async (isWin) => {
                const { target, targetSegmentId, hasFinalized, guesses } = get();
                if (!target || !targetSegmentId || hasFinalized) return;

                // 🆕 push final guesses ทันที — แทนที่ flushProgressNow เดิม ให้
                // สอดคล้องกับ mode อื่นและไม่พึ่งพา timing ของ debounce queue
                await syncProgressImmediately('song', 'unlimited', target.id, guesses);

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');

                if (isWin) {
                    const currentUnlimited: string[] = completedData.unlimited || [];
                    completedData.unlimited = [...new Set([...currentUnlimited, target.id])];
                } else {
                    completedData.unlimited = [];
                }

                localStorage.setItem(STORAGE_KEYS.SONG_COMPLETED, JSON.stringify(completedData));

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const savedStats: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} };

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

                statsData.unlimited = newStats;
                localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));

                set({
                    hasFinalized: true,
                    stats: newStats,
                });

                SyncEngine.getInstance()
                    .submitResult('song', 'unlimited', unlimitedRoundKey(target.id), isWin, guesses.length)
                    .catch(() => { });
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
                    get().initializeGame(true, { skipRemoteCheck: true });
                }, 0);
            },
            resetStreakKeepMax: () => {
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} };

                const resetStats: Stats = { ...saved, currentStreak: 0, maxStreak: saved.maxStreak };

                statsData.unlimited = resetStats;
                localStorage.setItem(STORAGE_KEYS.SONG_STATS, JSON.stringify(statsData));

                set({ stats: resetStats });
            },

            applyRemoteProgress: (remoteTargetId, remoteGuesses) => {
                const target = getSongById(remoteTargetId);
                if (!target) return;
                const hydrated = hydrateGuessEntries<BleachSong, SongGuessEntry>(remoteGuesses, getSongById);
                const remoteIsWin = hydrated.some(g => g.status === 'correct');
                const remoteIsOver = remoteIsWin || hydrated.length >= MAX_UNLIMITED_SONG_GUESSES;
                set({ target, guesses: hydrated, hasFinalized: remoteIsOver });
            },

            applyRemoteStats: (remoteStats: Stats | null) => {
                if (!remoteStats) return;
                set({ stats: remoteStats });
            },
        }),
        {
            name: 'unlimited',
            storage: nestedJSONStorage(STORAGE_KEYS.SONG_PROGRESS),
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
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (state.target?.id) {
                        state.target = getSongById(state.target.id) || null;
                    }

                    if (Array.isArray(state.guesses)) {
                        state.guesses = hydrateGuessEntries<BleachSong, SongGuessEntry>(
                            state.guesses,
                            getSongById
                        );
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