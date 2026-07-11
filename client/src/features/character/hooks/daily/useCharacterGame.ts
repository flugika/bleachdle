// src/features/character/hooks/daily/useCharacterGame.ts
import { create } from 'zustand';
import { Character } from '@/src/entities/character/schema';
import { compareCharacter } from '@/src/features/character/compareCharacter';
import { ComparisonOutcome } from '@/src/features/character/types';
import { getCharacterById } from '@/src/features/character/character';
import { persist } from 'zustand/middleware';
import { recordDailyStat } from '@/src/services/statsClient';
import { STORAGE_KEYS } from '@/src/const/localStorage'
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { MAX_DAILY_CHARACTER_GUESSES } from '@/src/const/guess';
import { isValidCharacterGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/lib/guessGame/types';

interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
    isNew: boolean;
}

interface CharacterGameState {
    target: Character | null;
    guesses: GuessEntry[];
    stats: Stats; // 🆕
    addGuess: (guessId: string) => void;
    setTarget: (target: Character) => void;
    initializeGame: (target?: Character) => void;
    finalizeGame: (isWin: boolean) => void;
    loadStats: () => void; // 🆕
    resetGame: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useCharacterGame = create<CharacterGameState>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            stats: { currentStreak: 0, maxStreak: 0, playedCount: 0, passedCount: 0, guessDistribution: {} }, // 🆕
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            // 🆕 ย้ายมาจาก component: อ่าน STORAGE_KEYS.CHARACTER_STATS เข้า store
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
                if (!guessedCharacter) return state;

                const result = compareCharacter(guessedCharacter, state.target);

                const newEntry: GuessEntry = { guess: guessedCharacter, result, isNew: true };
                const prevGuesses: GuessEntry[] = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            initializeGame: (target) => {
                if (!target) return;

                const currentTarget = get().target;

                if (currentTarget && currentTarget.id === target.id) {
                    if (currentTarget !== target) {
                        set({ target });
                    }
                    return;
                }

                set({ target, guesses: [], hasFinalized: false });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized, guesses } = get();
                if (!target || hasFinalized) return;

                // ── completedData: กันซ้ำด้วยวันที่ ──
                const completedData = JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || "{}"
                );
                const today = new Date().toISOString().split('T')[0];

                if (isWin) {
                    const history = completedData.daily || [];
                    completedData.daily = [...new Set([...history, today])];
                } else {
                    completedData.daily = []; // กัน array โตไม่จบระหว่าง win streak ยาว
                }

                localStorage.setItem(
                    STORAGE_KEYS.CHARACTER_COMPLETED,
                    JSON.stringify(completedData)
                );

                // ── 🆕 stats: ย้าย logic จาก updateStats เดิมเข้ามาตรงนี้ ──
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

                set({ hasFinalized: true, stats: newStats }); // 🆕 อัปเดต stats พร้อมกันในนี้เลย

                recordDailyStat('character', isWin, guesses.length).catch(() => { });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false });
            },
        }),
        {
            name: 'daily',
            storage: nestedJSONStorage(STORAGE_KEYS.CHARACTER_PROGRESS),
            partialize: (state) => ({
                guesses: state.guesses,
                target: state.target,
                hasFinalized: state.hasFinalized,
                // ❌ ไม่ใส่ stats — stats เก็บแยกที่ STORAGE_KEYS.CHARACTER_STATS อยู่แล้ว
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const hasCorruptedData = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidCharacterGuessEntry(g));

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