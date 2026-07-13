// src/shared/lib/guessGame/createUnlimitedGuessGameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { Stats } from '@/src/lib/guessGame/types';
import {
    GuessEntry,
    UnlimitedGuessGameConfig,
    defaultIsValidGuessEntry,
    defaultHasValidTargetShape,
} from './types';
import { compareBinaryGuess } from './compareBinaryGuess';

export interface UnlimitedGuessGameState<TCharacter, TTarget> {
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
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    resetStreakKeepMax: () => void;
}

export function createUnlimitedGuessGameStore<
    TItem,
    TCharacter extends { id: string },
    // 🔧 FIX: ตัด `character: TCharacter` ออกจาก constraint — ไม่มี logic ในไฟล์นี้
    // ที่อ่าน target.character ตรง ๆ เลย (compare ใช้ target.character_id ผ่าน
    // compareBinaryGuess) การบังคับ field นี้ไว้เฉย ๆ ทำให้โหมดที่ "สิ่งที่ทาย" ไม่ใช่
    // Character (เช่น Release ที่ทายด้วยตัว release เอง) ต้องยัด field character ปลอม
    // เข้าไปให้ตรง type ทั้งที่ความหมายผิด (เห็น .character แต่ได้ release ไม่ใช่ตัวละคร)
    TTarget extends { id: string; character_id: string }
>(config: UnlimitedGuessGameConfig<TItem, TCharacter, TTarget>) {
    const compareGuess = config.compareGuess ?? ((guess: TCharacter, target: TTarget) => compareBinaryGuess(guess, target.character_id));
    const resolveAnswerId = config.resolveAnswerId ?? ((target: TTarget) => target.character_id);
    const isValidGuessEntry = config.isValidGuessEntry ?? defaultIsValidGuessEntry<TCharacter>;
    const hasValidTargetShape = config.hasValidTargetShape ?? defaultHasValidTargetShape;

    // 🆕 เหมือน daily factory
    const derivedCounters = config.derivedCounters ?? [];
    const initialExtra = () =>
        Object.fromEntries(derivedCounters.map((d) => [d.key, d.initial])) as Record<string, number>;

    type State = UnlimitedGuessGameState<TCharacter, TTarget> & Record<string, unknown>;
    const getCounter = (state: State, key: string) => state[key] as number;

    return create<State>()(
        persist(
            (set, get) => ({
                target: null,
                revealedCharacter: null,
                guesses: [],
                hasFinalized: false,
                _hasHydrated: false,
                setHasHydrated: (state) => set({ _hasHydrated: state } as Partial<State>),
                setTarget: (target) => set({ target } as Partial<State>),
                ...initialExtra(),

                stats: { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} },
                loadStats: () => {
                    if (typeof window === 'undefined') return;
                    const statsData = JSON.parse(localStorage.getItem(config.storageKeys.stats) || '{}');
                    const saved: Stats = statsData.unlimited || {
                        currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {},
                    };
                    set({ stats: saved } as Partial<State>);
                },

                addGuess: (characterId) => set((state) => {
                    const isGameOver = state.guesses.length >= config.maxGuesses('unlimited');
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

                    return { guesses: allGuesses, ...extraUpdates } as Partial<State>;
                }),

                initializeGame: (force = false) => {
                    const { target, _hasHydrated } = get();
                    if (!_hasHydrated) return;
                    if (!force && target) return;

                    const allItems = config.getAllItems();
                    const completedData = JSON.parse(localStorage.getItem(config.storageKeys.completed) || '{}');
                    const completedKeys: string[] = completedData.unlimited || [];

                    const remaining = allItems.filter((item) => !completedKeys.includes(config.getItemCompletionKey(item)));

                    if (remaining.length === 0) {
                        set({ target: null, guesses: [], hasFinalized: false, ...initialExtra() } as Partial<State>);
                        return;
                    }

                    const randomItem = remaining[Math.floor(Math.random() * remaining.length)];
                    const nextTarget = config.attachCharacter(randomItem);

                    if (!nextTarget) {
                        console.error(`[${config.gameKey}] item references a missing character. Skipping.`);
                        set({ target: null, guesses: [], hasFinalized: false, ...initialExtra() } as Partial<State>);
                        return;
                    }

                    set({ target: nextTarget, guesses: [], hasFinalized: false, ...initialExtra() } as Partial<State>);
                },

                finalizeGame: (isWin) => {
                    const { target, hasFinalized, guesses } = get();
                    if (!target || hasFinalized) return;

                    const completedData = JSON.parse(localStorage.getItem(config.storageKeys.completed) || '{}');
                    const key = config.getCompletionKey(target);
                    completedData.unlimited = isWin
                        ? [...new Set([...(completedData.unlimited || []), key])]
                        : [];
                    localStorage.setItem(config.storageKeys.completed, JSON.stringify(completedData));

                    const statsData = JSON.parse(localStorage.getItem(config.storageKeys.stats) || '{}');
                    const savedStats: Stats = statsData.unlimited || {
                        currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {},
                    };

                    // 🆕 อัปเดต played/passed count
                    const playedCount = savedStats.playedCount + (isWin ? 1 : 0);
                    const passedCount = savedStats.passedCount + (isWin ? 0 : 1);

                    // 🆕 อัปเดต guess distribution เฉพาะตอนชนะ (ตอบถูก)
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
                    localStorage.setItem(config.storageKeys.stats, JSON.stringify(statsData));

                    const extraFinal = Object.fromEntries(derivedCounters.map((d) => [d.key, d.finalizeValue]));
                    // 🩹 FIX: เดิม hardcode `target.character_id` — ใช้ได้กับ Quote (guess เป็น
                    // Character, character_id คือคำตอบ) แต่ Release "คำตอบ" คือ target.id เอง
                    // (release เอง) ไม่ใช่ character_id (id เจ้าของท่า) ทำให้ getReleaseById
                    // หาไม่เจอ → revealedCharacter เป็น null เสมอ ไม่ว่าจะตอบถูกหรือผิด
                    const revealedCharacter = config.getCharacterById(resolveAnswerId(target)) ?? null;

                    set({ hasFinalized: true, stats: newStats, revealedCharacter, ...extraFinal } as unknown as Partial<State>);
                },
                resetGame: () => set({ target: null, revealedCharacter: null, guesses: [], hasFinalized: false, ...initialExtra() } as unknown as Partial<State>),

                hardReset: () => {
                    const progressData = JSON.parse(localStorage.getItem(config.storageKeys.progress) || '{}');
                    delete progressData.unlimited;
                    localStorage.setItem(config.storageKeys.progress, JSON.stringify(progressData));

                    const completedData = JSON.parse(localStorage.getItem(config.storageKeys.completed) || '{}');
                    completedData.unlimited = [];
                    localStorage.setItem(config.storageKeys.completed, JSON.stringify(completedData));

                    set({ target: null, guesses: [], hasFinalized: false, ...initialExtra() } as Partial<State>);
                    setTimeout(() => get().initializeGame(true), 0);
                },

                resetStreakKeepMax: () => {
                    const statsData = JSON.parse(localStorage.getItem(config.storageKeys.stats) || '{}');
                    const saved: Stats = statsData.unlimited || {
                        currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {},
                    };
                    const resetStats: Stats = { ...saved, currentStreak: 0, maxStreak: saved.maxStreak };
                    statsData.unlimited = resetStats;
                    localStorage.setItem(config.storageKeys.stats, JSON.stringify(statsData));
                    set({ stats: resetStats } as Partial<State>);
                },
            }),
            {
                name: 'unlimited',
                storage: nestedJSONStorage(config.storageKeys.progress),
                partialize: (state) => ({
                    guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                    target: state.target,
                    revealedCharacter: state.revealedCharacter,
                    hasFinalized: state.hasFinalized,
                    // 🔧 ใช้ getCounter แทน (state as State)[d.key] ตรงๆ
                    ...Object.fromEntries(derivedCounters.map((d) => [d.key, getCounter(state, d.key)])),
                }),
                onRehydrateStorage: () => (state) => {
                    if (!state) return;
                    const hasCorruptedGuesses = !Array.isArray(state.guesses) || state.guesses.some((g) => !isValidGuessEntry(g));
                    const hasStaleTargetShape = state.target != null && !hasValidTargetShape(state.target);

                    // 🔧 ใช้ getCounter แทน (state as State)[d.key] ตรงๆ
                    const hasInvalidExtra = derivedCounters.some((d) => {
                        const val = getCounter(state, d.key);
                        return typeof val !== 'number' || !d.isValidRange(val);
                    });

                    if (hasCorruptedGuesses || hasStaleTargetShape) {
                        state.guesses = [];
                        state.target = null;
                        state.hasFinalized = false;
                        derivedCounters.forEach((d) => { (state as State)[d.key] = d.initial; }); // ← นี่คือ "เขียน" ค่า ไม่ใช่ "อ่าน" เลยไม่ผ่าน getCounter
                    } else if (hasInvalidExtra) {
                        derivedCounters.forEach((d) => { (state as State)[d.key] = d.initial; });
                    }
                    state.setHasHydrated(true);
                },
            }
        )
    );
}