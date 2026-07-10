// src/shared/lib/guessGame/createDailyGuessGameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { recordDailyStat } from '@/src/services/statsClient';
import { Stats } from '@/src/shared/types/guessGame';
import { getTodayStr } from '@/src/lib/utils/format';
import {
    GuessEntry,
    GuessGameConfig,
    defaultIsValidGuessEntry,
    defaultHasValidTargetShape,
    DerivedCounterConfig,
} from './types';
import { compareBinaryGuess } from './compareBinaryGuess';

export interface DailyGuessGameState<TCharacter, TTarget> {
    target: TTarget | null;
    guesses: GuessEntry<TCharacter>[];
    stats: Stats;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    loadStats: () => void;
    addGuess: (characterId: string) => void;
    setTarget: (target: TTarget) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
}

export function createDailyGuessGameStore<
    TCharacter extends { id: string },
    TTarget extends { id: string; character_id: string; character: TCharacter },
    TExtra extends Record<string, number> = {}
>(
    config: GuessGameConfig<TCharacter, TTarget> & {
        derivedCounters?: (DerivedCounterConfig<TCharacter> & { key: keyof TExtra & string })[];
    }
) {
    const compareGuess = config.compareGuess ?? ((guess: TCharacter, target: TTarget) => compareBinaryGuess(guess, target.character_id));
    const isValidGuessEntry = config.isValidGuessEntry ?? defaultIsValidGuessEntry<TCharacter>;
    const hasValidTargetShape = config.hasValidTargetShape ?? defaultHasValidTargetShape;

    const derivedCounters = config.derivedCounters ?? [];
    const initialExtra = () =>
        Object.fromEntries(derivedCounters.map((d) => [d.key, d.initial])) as Record<string, number>;

    // 🔧 FIX: use `unknown` index signature, not `number` — a `number` index signature
    // forces every property on the intersected type (including functions like setTarget)
    // to also be assignable to `number`, which is impossible. `unknown` accepts anything,
    // and we cast to number only where we actually read/write a counter value.
    type State = DailyGuessGameState<TCharacter, TTarget> & TExtra;
    const getCounter = (state: State, key: string) => state[key as keyof State] as number;

    return create<State>()(
        persist(
            (set, get) => ({
                target: null,
                guesses: [],
                hasFinalized: false,
                _hasHydrated: false,

                // 🔧 FIX: ใส่ Type ให้พารามิเตอร์อย่างชัดเจน
                setHasHydrated: (state: boolean) => set({ _hasHydrated: state } as unknown as Partial<State>),
                ...initialExtra(),

                // 🔧 FIX: ใส่ Type ให้ target และ state
                setTarget: (target: TTarget) => set((state: State) => {
                    if (state.target && state.target.id === target.id) {
                        return { target } as unknown as Partial<State>;
                    }
                    return { target, guesses: [], hasFinalized: false, ...initialExtra() } as unknown as Partial<State>;
                }),

                stats: { currentStreak: 0, maxStreak: 0 },
                loadStats: () => {
                    if (typeof window === 'undefined') return;
                    const statsData = JSON.parse(localStorage.getItem(config.storageKeys.stats) || '{}');
                    const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };
                    set({ stats: saved } as unknown as Partial<State>);
                },

                // 🔧 FIX: ใส่ Type ให้ characterId และ state
                addGuess: (characterId: string) => set((state: State) => {
                    const isGameOver = state.guesses.length >= config.maxGuesses('daily');
                    if (!state.target || isGameOver) return state;

                    const guessedCharacter = config.getCharacterById(characterId);
                    if (!guessedCharacter) return state;

                    const alreadyGuessed = state.guesses.some((g) => g.guess.id === guessedCharacter.id);
                    if (alreadyGuessed) return state;

                    const status = compareGuess(guessedCharacter, state.target);
                    const newEntry: GuessEntry<TCharacter> = { guess: guessedCharacter, status, isNew: true };
                    const prevGuesses = state.guesses.map((g) => ({ ...g, isNew: false }));
                    const allGuesses = [newEntry, ...prevGuesses];

                    const extraUpdates = Object.fromEntries(
                        derivedCounters.map((d) => [d.key, d.compute(allGuesses)])
                    );

                    return { guesses: allGuesses, ...extraUpdates } as unknown as Partial<State>;
                }),

                finalizeGame: (isWin: boolean) => { // 🔧 FIX: ใส่ Type ให้ isWin
                    // ... โค้ดส่วนนี้เหมือนเดิม ...
                    const { target, hasFinalized, guesses } = get();
                    if (!target || hasFinalized) return;

                    const today = getTodayStr();
                    const completedData = JSON.parse(localStorage.getItem(config.storageKeys.completed) || '{}');
                    completedData.daily = isWin
                        ? [...new Set([...(completedData.daily || []), today])]
                        : [];
                    localStorage.setItem(config.storageKeys.completed, JSON.stringify(completedData));

                    const statsData = JSON.parse(localStorage.getItem(config.storageKeys.stats) || '{}');
                    const savedStats: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };
                    const newStats: Stats = {
                        currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                        maxStreak: isWin ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1) : savedStats.maxStreak,
                    };
                    statsData.daily = newStats;
                    localStorage.setItem(config.storageKeys.stats, JSON.stringify(statsData));

                    const extraFinal = Object.fromEntries(derivedCounters.map((d) => [d.key, d.finalizeValue]));

                    set({ hasFinalized: true, stats: newStats, ...extraFinal } as unknown as Partial<State>);
                    recordDailyStat(config.gameKey, isWin, guesses.length).catch(() => { });
                },

                resetGame: () => set({ target: null, guesses: [], hasFinalized: false, ...initialExtra() } as unknown as Partial<State>),
            } as unknown as State),
            {
                name: 'daily',
                storage: nestedJSONStorage(config.storageKeys.progress),
                partialize: (state) => ({
                    guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                    target: state.target,
                    hasFinalized: state.hasFinalized,
                    ...Object.fromEntries(derivedCounters.map((d) => [d.key, getCounter(state, d.key)])),
                }),
                onRehydrateStorage: () => (state) => {
                    if (!state) return;
                    const hasCorruptedGuesses = !Array.isArray(state.guesses) || state.guesses.some((g) => !isValidGuessEntry(g));
                    const hasStaleTargetShape = state.target != null && !hasValidTargetShape(state.target);

                    const hasInvalidExtra = derivedCounters.some((d) => {
                        const val = getCounter(state, d.key);
                        return typeof val !== 'number' || !d.isValidRange(val);
                    });

                    if (hasCorruptedGuesses || hasStaleTargetShape) {
                        state.guesses = [];
                        state.target = null;
                        state.hasFinalized = false;
                        // 🔧 FIX: เปลี่ยนเป็น (state as any) เพื่อเลี่ยงข้อจำกัดการเขียนทับค่าของ Generic Type
                        derivedCounters.forEach((d) => { (state as any)[d.key] = d.initial; });
                    } else if (hasInvalidExtra) {
                        // 🔧 FIX: เหมือนด้านบน
                        derivedCounters.forEach((d) => { (state as any)[d.key] = d.initial; });
                    }
                    state.setHasHydrated(true);
                },
            }
        )
    );
}