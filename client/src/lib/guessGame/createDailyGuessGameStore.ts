// src/shared/lib/guessGame/createDailyGuessGameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { recordDailyStat } from '@/src/services/statsClient';
import { Stats } from '@/src/lib/guessGame/types';
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
    revealedCharacter: TCharacter | null;
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

// 🆕 สร้าง Interface รองรับ Metadata ด้านวันที่แบบปลอดภัย เพื่อใช้แทน explicit any
interface DailyTargetDateMetadata {
    date?: string;
    scheduled_date?: string;
    scheduledDate?: string;
}

export function createDailyGuessGameStore<
    TCharacter extends { id: string },
    TTarget extends { id: string; character_id: string },
    TExtra extends Record<string, number> = Record<string, never>
>(
    config: GuessGameConfig<TCharacter, TTarget> & {
        derivedCounters?: (DerivedCounterConfig<TCharacter> & { key: keyof TExtra & string })[];
    }
) {
    const compareGuess = config.compareGuess ?? ((guess: TCharacter, target: TTarget) => compareBinaryGuess(guess, target.character_id));
    const resolveAnswerId = config.resolveAnswerId ?? ((target: TTarget) => target.character_id);
    const isValidGuessEntry = config.isValidGuessEntry ?? defaultIsValidGuessEntry<TCharacter>;
    const hasValidTargetShape = config.hasValidTargetShape ?? defaultHasValidTargetShape;

    const derivedCounters = config.derivedCounters ?? [];
    const initialExtra = () =>
        Object.fromEntries(derivedCounters.map((d) => [d.key, d.initial])) as Record<string, number>;

    type State = DailyGuessGameState<TCharacter, TTarget> & TExtra;
    const getCounter = (state: State, key: string) => state[key as keyof State] as number;

    return create<State>()(
        persist(
            (set, get) => ({
                target: null,
                revealedCharacter: null,
                guesses: [],
                hasFinalized: false,
                _hasHydrated: false,

                setHasHydrated: (state: boolean) => set({ _hasHydrated: state } as unknown as Partial<State>),
                ...initialExtra(),

                setTarget: (target: TTarget) => set((state: State) => {
                    if (state.target && state.target.id === target.id) {
                        return { target } as unknown as Partial<State>;
                    }
                    return { target, guesses: [], hasFinalized: false, ...initialExtra() } as unknown as Partial<State>;
                }),

                stats: { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
                loadStats: () => {
                    if (typeof window === 'undefined') return;
                    const statsData = JSON.parse(localStorage.getItem(config.storageKeys.stats) || '{}');
                    const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} };
                    set({ stats: saved } as unknown as Partial<State>);
                },

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

                finalizeGame: (isWin: boolean) => {
                    const { target, hasFinalized, guesses } = get();
                    if (!target || hasFinalized) return;

                    // 🎯 Enterprise Fix: ผสมโครงสร้าง Type แบบเฉพาะเจาะจง ปิดจุดเตือน Lint ถาวร
                    const targetWithDate = target as TTarget & DailyTargetDateMetadata;
                    const targetDate = 
                        targetWithDate.date || 
                        targetWithDate.scheduled_date || 
                        targetWithDate.scheduledDate || 
                        getTodayStr();

                    const completedData = JSON.parse(localStorage.getItem(config.storageKeys.completed) || '{}');
                    completedData.daily = isWin
                        ? [...new Set([...(completedData.daily || []), targetDate])]
                        : [];
                    localStorage.setItem(config.storageKeys.completed, JSON.stringify(completedData));

                    const statsData = JSON.parse(localStorage.getItem(config.storageKeys.stats) || '{}');
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
                    localStorage.setItem(config.storageKeys.stats, JSON.stringify(statsData));

                    const extraFinal = Object.fromEntries(derivedCounters.map((d) => [d.key, d.finalizeValue]));
                    const revealedCharacter = config.getCharacterById(resolveAnswerId(target)) ?? null;

                    set({ hasFinalized: true, stats: newStats, revealedCharacter, ...extraFinal } as unknown as Partial<State>);
                    
                    // 🆕 ส่ง targetDate แนบไปเคลียร์หลังบ้านด้วย
                    recordDailyStat(config.gameKey, isWin, guesses.length, targetDate).catch(() => { });
                },

                resetGame: () => set({ target: null, revealedCharacter: null, guesses: [], hasFinalized: false, ...initialExtra() } as unknown as Partial<State>),
            } as unknown as State),
            {
                name: 'daily',
                storage: nestedJSONStorage(config.storageKeys.progress),
                partialize: (state) => ({
                    guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                    target: state.target,
                    revealedCharacter: state.revealedCharacter,
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

                    const extra = state as unknown as Record<string, number>;

                    if (hasCorruptedGuesses || hasStaleTargetShape) {
                        state.guesses = [];
                        state.target = null;
                        state.hasFinalized = false;
                        derivedCounters.forEach((d) => { extra[d.key] = d.initial; });
                    } else if (hasInvalidExtra) {
                        derivedCounters.forEach((d) => { extra[d.key] = d.initial; });
                    }
                    state.setHasHydrated(true);
                },
            }
        )
    );
}