import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { Stats } from '@/src/lib/guessGame/types';
import { SyncEngine } from '@/src/lib/sync/syncEngine';
import { unlimitedRoundKey } from '@/src/lib/sync/roundKey';
import { syncProgressImmediately } from '@/src/lib/sync/syncProgressHelper';
import { hydrateGuessEntries } from '@/src/lib/sync/hydrateGuessEntries';
import { fetchActiveRemoteProgress } from '@/src/lib/sync/fetchActiveRemoteProgress';
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
    /**
     * 🆕 opts.skipRemoteCheck — ใช้จาก hardReset() เท่านั้น เพื่อข้าม
     * remote-progress lookup ตอน force สุ่มข้อใหม่ เพราะ hardReset แปลว่า
     * "เริ่มใหม่หมด" ตรงเจตนา ไม่ควรดึงรอบเก่าที่ค้างบน server กลับมา
     */
    initializeGame: (force?: boolean, opts?: { skipRemoteCheck?: boolean }) => Promise<void>;
    finalizeGame: (isWin: boolean) => Promise<void>;
    resetGame: () => void;
    hardReset: () => void;
    resetStreakKeepMax: () => void;
    applyRemoteProgress: (remoteTargetId: string, remoteGuesses: unknown[]) => void;
    applyRemoteStats: (remoteStats: Stats | null) => void;
}

export function createUnlimitedGuessGameStore<
    TItem,
    TCharacter extends { id: string },
    TTarget extends { id: string; character_id: string }
>(config: UnlimitedGuessGameConfig<TItem, TCharacter, TTarget>) {
    const compareGuess = config.compareGuess ?? ((guess: TCharacter, target: TTarget) => compareBinaryGuess(guess, target.character_id));
    const resolveAnswerId = config.resolveAnswerId ?? ((target: TTarget) => target.character_id);
    const isValidGuessEntry = config.isValidGuessEntry ?? defaultIsValidGuessEntry<TCharacter>;
    const hasValidTargetShape = config.hasValidTargetShape ?? defaultHasValidTargetShape;

    const derivedCounters = config.derivedCounters ?? [];
    const initialExtra = () =>
        Object.fromEntries(derivedCounters.map((d) => [d.key, d.initial])) as Record<string, number>;

    const resolveTargetById = (id: string): TTarget | undefined => {
        for (const item of config.getAllItems()) {
            const target = config.attachCharacter(item);
            if (target && target.id === id) return target;
        }
        return undefined;
    };

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
                setTarget: async (target) => {
                    set({ target } as Partial<State>);
                    if (target && !get().hasFinalized) {
                        await syncProgressImmediately(config.gameKey, 'unlimited', target.id, get().guesses);
                    }
                },
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

                addGuess: (characterId) => {
                    set((state) => {
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
                        SyncEngine.getInstance().queueProgress({
                            gameMode: config.gameKey,
                            gameType: 'unlimited',
                            guesses: allGuesses,
                            targetId: state.target?.id ?? null,
                        });

                        return { guesses: allGuesses, ...extraUpdates } as Partial<State>;
                    });
                },

                initializeGame: async (force = false, opts = {}) => {
                    const { target, _hasHydrated } = get();
                    if (!_hasHydrated) return;

                    if (!force && target) {
                        return;
                    }

                    // 🆕 กัน 2 เครื่องสุ่มข้อพร้อมกันได้คนละข้อ — เช็ค remote ก่อน
                    // สุ่มใหม่เสมอ (เว้นแต่ hardReset สั่ง skip) bounded ด้วย timeout
                    // ในตัว fetchActiveRemoteProgress เอง ไม่บล็อกไม่จำกัดเวลา
                    if (!opts.skipRemoteCheck) {
                        const remote = await fetchActiveRemoteProgress(config.gameKey, 'unlimited');

                        if (remote?.target_id) {
                            const remoteTarget = resolveTargetById(remote.target_id);
                            if (remoteTarget) {
                                const hydrated = hydrateGuessEntries<TCharacter, GuessEntry<TCharacter>>(
                                    remote.guesses,
                                    config.getCharacterById
                                );
                                const answerId = resolveAnswerId(remoteTarget);
                                const remoteIsWin = hydrated.some((g) => g.guess.id === answerId);
                                const remoteIsOver = remoteIsWin || hydrated.length >= config.maxGuesses('unlimited');

                                if (!remoteIsOver) {
                                    const extraUpdates = Object.fromEntries(
                                        derivedCounters.map((d) => [d.key, d.compute(hydrated)])
                                    );
                                    set({
                                        target: remoteTarget,
                                        guesses: hydrated,
                                        hasFinalized: false,
                                        ...extraUpdates,
                                    } as Partial<State>);
                                    return;
                                }
                            }
                        }
                    }

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
                        set({ target: null, guesses: [], hasFinalized: false, ...initialExtra() } as Partial<State>);
                        return;
                    }

                    set({ target: nextTarget, guesses: [], hasFinalized: false, ...initialExtra() } as Partial<State>);

                    await syncProgressImmediately(config.gameKey, 'unlimited', nextTarget.id, []);
                },

                finalizeGame: async (isWin) => {
                    const { target, hasFinalized, guesses } = get();
                    if (!target || hasFinalized) return;

                    // 🆕 push final guesses ทันที ไม่รอ debounce — เหตุผลเดียวกับ daily
                    await syncProgressImmediately(config.gameKey, 'unlimited', target.id, guesses);

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
                    localStorage.setItem(config.storageKeys.stats, JSON.stringify(statsData));

                    const extraFinal = Object.fromEntries(derivedCounters.map((d) => [d.key, d.finalizeValue]));
                    const revealedCharacter = config.getCharacterById(resolveAnswerId(target)) ?? null;

                    set({ hasFinalized: true, stats: newStats, revealedCharacter, ...extraFinal } as unknown as Partial<State>);

                    SyncEngine.getInstance()
                        .submitResult(config.gameKey, 'unlimited', unlimitedRoundKey(target.id), isWin, guesses.length)
                        .catch(() => { });
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
                    // 🆕 skipRemoteCheck: true — hardReset ต้องเริ่มใหม่จริงๆ ไม่ดึง
                    // รอบเก่าที่ค้างบน server กลับมาแทน
                    setTimeout(() => { get().initializeGame(true, { skipRemoteCheck: true }); }, 0);
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

                applyRemoteProgress: (remoteTargetId, remoteGuesses) => {
                    const target = resolveTargetById(remoteTargetId);
                    if (!target) return;

                    const hydrated = hydrateGuessEntries<TCharacter, GuessEntry<TCharacter>>(
                        remoteGuesses,
                        config.getCharacterById
                    );

                    const answerId = resolveAnswerId(target);
                    const remoteIsWin = hydrated.some((g) => g.guess.id === answerId);
                    const remoteIsOver = remoteIsWin || hydrated.length >= config.maxGuesses('unlimited');

                    // 🆕 ถ้ารอบที่ sync มาจบไปแล้ว ต้องเฉลย revealedCharacter เหมือนที่
                    // finalizeGame ทำ — เพราะ hasFinalized: true ตรงนี้จะไม่มี finalizeGame
                    // มาเรียกซ้ำอีกแล้ว (wrapper เช็ค !hasFinalized ก่อน) ถ้าไม่ตั้งเอง
                    // revealedCharacter จะค้าง null ทำให้ Summary การ์ดไม่โชว์รูป/ชื่อจริง
                    const revealedCharacter = remoteIsOver
                        ? config.getCharacterById(answerId) ?? null
                        : null;

                    set({
                        target,
                        guesses: hydrated,
                        hasFinalized: remoteIsOver,
                        revealedCharacter,
                        ...initialExtra(),
                    } as Partial<State>);
                },

                applyRemoteStats: (remoteStats: Stats | null) => {
                    if (!remoteStats) return;
                    set({ stats: remoteStats } as Partial<State>);
                },
            }),
            {
                name: 'unlimited',
                storage: nestedJSONStorage(config.storageKeys.progress),
                partialize: (state) => ({
                    guesses: state.guesses.map(({ guess, status }) => ({ guess: { id: guess.id }, status, isNew: false })),
                    target: state.target,
                    revealedCharacter: state.revealedCharacter,
                    hasFinalized: state.hasFinalized,
                    ...Object.fromEntries(derivedCounters.map((d) => [d.key, getCounter(state, d.key)])),
                }),
                onRehydrateStorage: () => (state) => {
                    if (!state) return;

                    if (Array.isArray(state.guesses)) {
                        state.guesses = hydrateGuessEntries<TCharacter, GuessEntry<TCharacter>>(
                            state.guesses,
                            config.getCharacterById
                        );
                    }

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
                        derivedCounters.forEach((d) => { (state as State)[d.key] = d.initial; });
                    } else if (hasInvalidExtra) {
                        derivedCounters.forEach((d) => { (state as State)[d.key] = d.initial; });
                    }
                    state.setHasHydrated(true);
                },
            }
        )
    );
}