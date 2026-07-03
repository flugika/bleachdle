// src/features/character/hooks/unlimited/useCharacterGame.ts
import { create } from 'zustand';
import { Character } from '@/src/entities/character/schema';
import { compareCharacters } from '@/src/lib/game-engine/compare';
import { ComparisonOutcome } from '@/src/features/character/types';
import { getCharacterById, getCharacters } from '@/src/lib/utils/character';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MAX_CHARACTER_GUESSES } from '@/src/const/guess';

interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
}

interface CharacterGameState {
    target: Character | null;
    guesses: GuessEntry[];
    addGuess: (guessId: string) => void;
    setTarget: (target: Character) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;                    // 👈 เพิ่ม (เดิม unlimited ไม่มี ต่างจาก daily)
    setHasHydrated: (state: boolean) => void; // 👈 เพิ่ม
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
                const isGameOver = state.guesses.length >= MAX_CHARACTER_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(guessId);
                if (!guessedCharacter) return state;

                const result = compareCharacters(guessedCharacter, state.target);
                const newEntry = { guess: guessedCharacter, result, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            // 🛡️ ROOT-CAUSE FIX:
            // เดิมเช็ค `target && guesses.length > 0` — target ที่เพิ่งสุ่มสดๆ guesses ยังเป็น []
            // เสมอ ทำให้ทุกครั้งที่ initializeGame() โดนเรียกซ้ำ (StrictMode double-invoke ตอน dev,
            // component remount ตอนสลับหน้าผ่าน Senkaimon transition, ฯลฯ) guard นี้ผ่านไม่ทัน
            // แล้วสุ่ม target ใหม่ทับของเดิมทันที ตอนนี้เช็คแค่ "มี target แล้วหรือยัง" ก็พอ
            // ไม่สนใจจำนวน guesses เพราะ target ที่ตั้งแล้วคือ "init เสร็จแล้ว" ไม่ว่าจะทายไปกี่ครั้ง
            //
            // 🛡️ HYDRATION GUARD:
            // กัน race condition ระหว่าง persist rehydrate (async จาก localStorage) กับ effect
            // ฝั่ง component ที่อาจยิงก่อน/หลัง hydrate เสร็จคนละรอบ ทำให้สุ่มซ้อนกัน 2 ครั้ง
            initializeGame: (force = false) => {
                const { target, _hasHydrated } = get();

                if (!_hasHydrated) return;
                if (!force && target) return;

                const allCharacters = getCharacters();

                const completedData = JSON.parse(localStorage.getItem('bleachdle-character-completed') || '{}');
                const completedIds = completedData.unlimited || [];

                const remainingCharacters = allCharacters.filter(c => !completedIds.includes(c.id));

                if (remainingCharacters.length === 0) {
                    set({ target: null, guesses: [], hasFinalized: false });
                } else {
                    set({
                        target: remainingCharacters[Math.floor(Math.random() * remainingCharacters.length)],
                        guesses: [],
                        hasFinalized: false
                    });
                }
            },
            finalizeGame: (isWin) => {
                const { target, hasFinalized } = get();

                if (!target || hasFinalized) {
                    return;
                }

                const completedData = JSON.parse(
                    localStorage.getItem("bleachdle-character-completed") || "{}"
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
                    "bleachdle-character-completed",
                    JSON.stringify(completedData)
                );

                set({
                    hasFinalized: true,
                });
            },
            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false });
            },
            hardReset: () => {
                const progressData = JSON.parse(localStorage.getItem('bleachdle-character-progress') || '{}');
                delete progressData.unlimited;
                localStorage.setItem('bleachdle-character-progress', JSON.stringify(progressData));

                const completedData = JSON.parse(localStorage.getItem('bleachdle-character-completed') || '{}');
                completedData.unlimited = [];
                localStorage.setItem('bleachdle-character-completed', JSON.stringify(completedData));

                set({ target: null, guesses: [], hasFinalized: false });

                setTimeout(() => {
                    get().initializeGame(true);
                }, 0);
            },
        }),
        {
            name: 'unlimited',
            storage: createJSONStorage(() => ({
                getItem: (name) => {
                    const data = JSON.parse(localStorage.getItem('bleachdle-character-progress') || '{}');
                    return data[name] ? JSON.stringify(data[name]) : null;
                },
                setItem: (name, value) => {
                    const data = JSON.parse(localStorage.getItem('bleachdle-character-progress') || '{}');
                    data[name] = JSON.parse(value);
                    localStorage.setItem('bleachdle-character-progress', JSON.stringify(data));
                },
                removeItem: (name) => {
                    const data = JSON.parse(localStorage.getItem('bleachdle-character-progress') || '{}');
                    delete data[name];
                    localStorage.setItem('bleachdle-character-progress', JSON.stringify(data));
                }
            })),
            partialize: (state) => ({
                guesses: state.guesses,
                target: state.target,
                hasFinalized: state.hasFinalized,
            }),
            // 👇 หัวใจของ fix: บอก store ว่า rehydrate เสร็จแล้วจริงๆ (เหมือน daily store)
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);