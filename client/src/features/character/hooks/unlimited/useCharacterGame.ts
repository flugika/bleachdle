import { create } from 'zustand';
import { Character } from '@/src/entities/character/schema';
import { compareCharacter } from '@/src/features/character/compareCharacter';
import { ComparisonOutcome } from '@/src/features/character/types';
import { getCharacterById, getCharacters } from '@/src/features/character/character';
import { persist } from 'zustand/middleware';
import { SyncEngine } from '@/src/lib/sync/syncEngine';
import { unlimitedRoundKey } from '@/src/lib/sync/roundKey';
import { MAX_UNLIMITED_CHARACTER_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { isValidCharacterGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/lib/guessGame/types';
import { syncProgressImmediately } from '@/src/lib/sync/syncProgressHelper';
import { hydrateGuessEntries } from '@/src/lib/sync/hydrateGuessEntries';
import { fetchActiveRemoteProgress } from '@/src/lib/sync/fetchActiveRemoteProgress';

interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
    isNew: boolean;
}

interface CharacterGameState {
    targetId: string | null;
    target: Character | null;
    guesses: GuessEntry[];
    stats: Stats;
    addGuess: (guessId: string) => void;
    setTarget: (target: Character) => void;
    initializeGame: (force?: boolean, opts?: { skipRemoteCheck?: boolean }) => Promise<void>;
    finalizeGame: (isWin: boolean) => void;
    loadStats: () => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetStreakKeepMax: () => void;
    applyRemoteProgress: (remoteTargetId: string, remoteGuesses: unknown[]) => void;
    applyRemoteStats: (remoteStats: Stats | null) => void;
}

export const useCharacterGame = create<CharacterGameState>()(
    persist(
        (set, get) => ({
            targetId: null,
            target: null,
            guesses: [],
            stats: { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => {
                set({ target, targetId: target.id });
            },

            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} };
                set({ stats: saved });
            },

            addGuess: (guessId: string) => {
                set((state) => {
                    const isGameOver = state.guesses.length >= MAX_UNLIMITED_CHARACTER_GUESSES;
                    if (!state.target || isGameOver) return state;

                    const guessedCharacter = getCharacterById(guessId);
                    if (!guessedCharacter) return state;

                    const result = compareCharacter(guessedCharacter, state.target);

                    const newEntry: GuessEntry = { guess: guessedCharacter, result, isNew: true };
                    const prevGuesses: GuessEntry[] = state.guesses.map(g => ({ ...g, isNew: false }));
                    const allGuesses = [newEntry, ...prevGuesses];

                    SyncEngine.getInstance().queueProgress({
                        gameMode: 'character',
                        gameType: 'unlimited',
                        guesses: allGuesses,
                        targetId: state.target?.id ?? null,
                    });

                    return { guesses: allGuesses };
                });
            },

            initializeGame: async (force = false, opts = {}) => {
                const { targetId, _hasHydrated } = get();
                if (!_hasHydrated) return;

                if (!force && targetId) {
                    return;
                }

                // 🆕 กัน 2 เครื่องสุ่มตัวละครพร้อมกันได้คนละตัว
                if (!opts.skipRemoteCheck) {
                    const remote = await fetchActiveRemoteProgress('character', 'unlimited');

                    if (remote?.target_id) {
                        const remoteTarget = getCharacterById(remote.target_id);
                        if (remoteTarget) {
                            const hydrated = hydrateGuessEntries<Character, GuessEntry>(remote.guesses, getCharacterById);
                            const remoteIsWin = hydrated.some((g) => g.guess.id === remoteTarget.id);
                            const remoteIsOver = remoteIsWin || hydrated.length >= MAX_UNLIMITED_CHARACTER_GUESSES;

                            if (!remoteIsOver) {
                                set({ target: remoteTarget, targetId: remoteTarget.id, guesses: hydrated, hasFinalized: false });
                                return;
                            }
                        }
                    }
                }

                const allCharacters = getCharacters();
                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || '{}');
                const completedIds = completedData.unlimited || [];
                const remainingCharacters = allCharacters.filter(c => !completedIds.includes(c.id));

                if (remainingCharacters.length === 0) {
                    set({ target: null, targetId: null, guesses: [], hasFinalized: false });
                } else {
                    const picked = remainingCharacters[Math.floor(Math.random() * remainingCharacters.length)];
                    set({ target: picked, targetId: picked.id, guesses: [], hasFinalized: false });
                    await syncProgressImmediately('character', 'unlimited', picked.id, []);
                }
            },

            finalizeGame: async (isWin) => {
                const { target, hasFinalized, guesses } = get();

                if (!target || hasFinalized) return;

                // 🆕 push final guesses ทันที ไม่รอ debounce
                await syncProgressImmediately('character', 'unlimited', target.id, guesses);

                const completedData = JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || "{}"
                );

                if (isWin) {
                    const currentUnlimited = completedData.unlimited || [];
                    completedData.unlimited = [
                        ...new Set([...currentUnlimited, target.id]),
                    ];
                } else {
                    completedData.unlimited = [];
                }

                localStorage.setItem(
                    STORAGE_KEYS.CHARACTER_COMPLETED,
                    JSON.stringify(completedData)
                );

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
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
                localStorage.setItem(STORAGE_KEYS.CHARACTER_STATS, JSON.stringify(statsData));

                set({
                    hasFinalized: true,
                    stats: newStats,
                });

                SyncEngine.getInstance()
                    .submitResult('character', 'unlimited', unlimitedRoundKey(target.id), isWin, guesses.length)
                    .catch(() => { });
            },

            resetGame: () => {
                set({ targetId: null, target: null, guesses: [], hasFinalized: false });
            },

            hardReset: () => {
                const progressData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_PROGRESS) || '{}');
                delete progressData.unlimited;
                localStorage.setItem(STORAGE_KEYS.CHARACTER_PROGRESS, JSON.stringify(progressData));

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || '{}');
                completedData.unlimited = [];
                localStorage.setItem(STORAGE_KEYS.CHARACTER_COMPLETED, JSON.stringify(completedData));

                set({ targetId: null, target: null, guesses: [], hasFinalized: false });

                setTimeout(() => {
                    get().initializeGame(true, { skipRemoteCheck: true });
                }, 0);
            },

            resetStreakKeepMax: () => {
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
                const saved: Stats = statsData.unlimited || {
                    currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {},
                };
                const resetStats: Stats = { ...saved, currentStreak: 0, maxStreak: saved.maxStreak };
                statsData.unlimited = resetStats;
                localStorage.setItem(STORAGE_KEYS.CHARACTER_STATS, JSON.stringify(statsData));
                set({ stats: resetStats });
            },

            applyRemoteProgress: (remoteTargetId, remoteGuesses) => {
                const target = getCharacterById(remoteTargetId);
                if (!target) return;
                const hydrated = hydrateGuessEntries<Character, GuessEntry>(remoteGuesses, getCharacterById);
                const remoteIsWin = hydrated.some((g) => g.guess.id === target.id);
                const remoteIsOver = remoteIsWin || hydrated.length >= MAX_UNLIMITED_CHARACTER_GUESSES;
                set({ target, targetId: target.id, guesses: hydrated, hasFinalized: remoteIsOver });
            },

            applyRemoteStats: (remoteStats: Stats | null) => {
                if (!remoteStats) return;
                set({ stats: remoteStats });
            },
        }),
        {
            name: 'unlimited',
            storage: nestedJSONStorage(STORAGE_KEYS.CHARACTER_PROGRESS),
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, result }) => ({
                    guess: { id: guess.id } as Character,
                    result,
                    isNew: false,
                })),
                targetId: state.targetId,
                hasFinalized: state.hasFinalized,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (Array.isArray(state.guesses)) {
                        state.guesses = hydrateGuessEntries<Character, GuessEntry>(
                            state.guesses,
                            getCharacterById
                        );
                    }

                    const hasCorruptedData = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidCharacterGuessEntry(g));

                    if (hasCorruptedData) {
                        state.guesses = [];
                        state.target = null;
                        state.targetId = null;
                        state.hasFinalized = false;
                    } else if (state.targetId) {
                        state.target = getCharacterById(state.targetId) ?? null;
                    }

                    state._hasHydrated = true;
                }
            },
        },
    )
);