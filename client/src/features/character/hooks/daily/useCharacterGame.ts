// src/features/character/hooks/daily/useCharacterGame.ts
import { create } from 'zustand';
import { Character } from '@/src/entities/character/schema';
import { compareCharacters } from '@/src/lib/game-engine/compare';
import { ComparisonOutcome } from '@/src/features/character/types';
import { getCharacterById, getCharacters } from '@/src/lib/utils/character';
import { persist, createJSONStorage } from 'zustand/middleware';
import { recordDailyStat } from '@/src/services/statsClient';
import { STORAGE_KEYS } from '@/src/const/localStorage'

interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
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
                const isGameOver = state.guesses.length >= 10;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(guessId);
                if (!guessedCharacter) return state;

                const result = compareCharacters(guessedCharacter, state.target);
                const newEntry = { guess: guessedCharacter, result, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

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
            storage: createJSONStorage(() => ({
                getItem: (name) => {
                    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_PROGRESS) || '{}');
                    return data[name] ? JSON.stringify(data[name]) : null;
                },
                setItem: (name, value) => {
                    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_PROGRESS) || '{}');
                    data[name] = JSON.parse(value);
                    localStorage.setItem(STORAGE_KEYS.CHARACTER_PROGRESS, JSON.stringify(data));
                },
                removeItem: (name) => {
                    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHARACTER_PROGRESS) || '{}');
                    delete data[name];
                    localStorage.setItem(STORAGE_KEYS.CHARACTER_PROGRESS, JSON.stringify(data));
                }
            })),
            partialize: (state) => ({
                guesses: state.guesses,
                target: state.target,
                hasFinalized: state.hasFinalized,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);