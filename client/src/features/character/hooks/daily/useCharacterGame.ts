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
import { MAX_CHARACTER_GUESSES } from '@/src/const/guess';
import { isValidCharacterGuessEntry } from '../../validGuessEntry';

interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
    isNew: boolean;
}

interface CharacterGameState {
    target: Character | null;
    guesses: GuessEntry[];
    addGuess: (guessId: string) => void;
    setTarget: (target: Character) => void;
    initializeGame: (target?: Character) => void;
    finalizeGame: (isWin: boolean) => void;
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
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            addGuess: (guessId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_CHARACTER_GUESSES; // หรือ 10 ในกรณี daily
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
                    // 🛡️ FIX: เดิม set({ target }) แบบไม่มีเงื่อนไข ทำให้ zustand สร้าง state
                    // object ใหม่ (top-level) ทุกครั้ง แม้ reference ของ target จะเหมือนเดิมเป๊ะ
                    // ผลคือ component re-render เปล่าๆ ทุกครั้งที่ effect ถูกยิงซ้ำ (เช่น React 18
                    // StrictMode double-invoke ตอน dev) — ตอนนี้ set() เฉพาะตอน reference เปลี่ยนจริง
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

                const completedData = JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED) || "{}"
                );

                if (isWin) {
                    const currentDaily = completedData.daily || [];
                    completedData.daily = [...new Set([...currentDaily, target.id])];
                } else {
                    completedData.daily = [];
                }

                localStorage.setItem(
                    STORAGE_KEYS.CHARACTER_COMPLETED,
                    JSON.stringify(completedData)
                );

                set({ hasFinalized: true });

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
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // 🛡️ ตรวจ guesses ทุกตัว ถ้าเจอโครงสร้างไม่ตรง (legacy/corrupted) ให้ล้างรอบนั้นทิ้งทันที
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