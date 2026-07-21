import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Character } from '@/src/entities/character/schema';
import { compareCharacter } from '@/src/features/character/compareCharacter';
import { ComparisonOutcome, DailyCharacterResponse } from '@/src/features/character/types';
import { getCharacterById } from '@/src/features/character/character';
import { recordDailyStat } from '@/src/services/statsClient';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { MAX_DAILY_CHARACTER_GUESSES } from '@/src/const/guess';
import { isValidCharacterGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/lib/guessGame/types';
import { getTodayStr } from '@/src/lib/utils/format';

interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
    isNew: boolean;
}

interface CharacterDateMetadata {
    date?: string;
    scheduledDate?: string;
}

interface CharacterGameState {
    targetId: string | null;
    target: DailyCharacterResponse | null;
    scheduledDate: string | null;
    guesses: GuessEntry[];
    stats: Stats;
    addGuess: (guessId: string) => void;
    setTarget: (target: DailyCharacterResponse, scheduledDate?: string) => void;
    initializeGame: (target?: DailyCharacterResponse, scheduledDate?: string) => void;
    finalizeGame: (isWin: boolean) => void;
    loadStats: () => void;
    resetGame: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useCharacterGame = create<CharacterGameState>()(
    persist(
        (set, get) => ({
            targetId: null,
            target: null,
            scheduledDate: null,
            guesses: [],
            stats: { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target, scheduledDate) => set({
                target,
                targetId: target.id,
                scheduledDate: scheduledDate || getTodayStr()
            }),

            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
                const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} };
                set({ stats: saved });
            },

            addGuess: (guessId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_DAILY_CHARACTER_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(guessId);
                const targetCharacter = getCharacterById(state.target.id);
                if (!guessedCharacter || !targetCharacter) return state;

                const result = compareCharacter(guessedCharacter, targetCharacter);

                const newEntry: GuessEntry = { guess: guessedCharacter, result, isNew: true };
                const prevGuesses: GuessEntry[] = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            initializeGame: (target, scheduledDate) => {
                if (!target) return;

                const { targetId } = get();
                const dateStr = scheduledDate || new Date().toISOString().split('T')[0];

                if (targetId && targetId === target.id) {
                    set({ target, scheduledDate: dateStr });
                    return;
                }

                set({ target, targetId: target.id, scheduledDate: dateStr, guesses: [], hasFinalized: false });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized, guesses, scheduledDate } = get();
                if (!target || hasFinalized) return;

                const targetWithDate = target as Character & CharacterDateMetadata;
                const targetDate =
                    scheduledDate ||
                    targetWithDate.date ||
                    targetWithDate.scheduledDate ||
                    getTodayStr();

                const completedData = JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || "{}"
                );

                if (isWin) {
                    const history = completedData.daily || [];
                    completedData.daily = [...new Set([...history, targetDate])];
                } else {
                    completedData.daily = [];
                }

                localStorage.setItem(
                    STORAGE_KEYS.CHARACTER_COMPLETED,
                    JSON.stringify(completedData)
                );

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS) || '{}');
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
                localStorage.setItem(STORAGE_KEYS.CHARACTER_STATS, JSON.stringify(statsData));

                set({ hasFinalized: true, stats: newStats });

                recordDailyStat('character', isWin, guesses.length, targetDate).catch(() => { });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false, scheduledDate: null });
            },
        }),
        {
            name: 'daily',
            storage: nestedJSONStorage(STORAGE_KEYS.CHARACTER_PROGRESS),
            partialize: (state) => ({
                guesses: state.guesses,
                targetId: state.targetId,
                scheduledDate: state.scheduledDate,
                hasFinalized: state.hasFinalized,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const hasCorruptedData = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidCharacterGuessEntry(g));

                    if (hasCorruptedData) {
                        state.guesses = [];
                        state.target = null;
                        state.scheduledDate = null;
                        state.hasFinalized = false;
                    } else if (state.targetId) {
                        state.target = getCharacterById(state.targetId) ?? null;
                    }

                    state._hasHydrated = true;
                }
            },
        }
    )
);