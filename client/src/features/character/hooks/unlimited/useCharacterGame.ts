import { create } from 'zustand';
import { Character } from '@/src/entities/character/schema';
import { compareCharacters } from '@/src/lib/game-engine/compare';
import { ComparisonOutcome } from '@/src/features/character/types';
import { getCharacterById, getCharacters } from '@/src/lib/utils/character';
import { persist, createJSONStorage } from 'zustand/middleware';

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
}

export const useCharacterGame = create<CharacterGameState>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            setTarget: (target) => set({ target }),
            hasFinalized: false,
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
            initializeGame: (force = false) => {
                const { target, guesses } = get();
                if (!force && target && guesses.length > 0) return;

                const allCharacters = getCharacters();

                // ── 🛡️ ดึงจากคีย์หลักก้อนเดียว แล้วแกะเฉพาะฟิลด์ unlimited
                const completedData = JSON.parse(localStorage.getItem('bleachdle-character-completed') || '{}');
                const completedIds = completedData.unlimited || [];

                const remainingCharacters = allCharacters.filter(c => !completedIds.includes(c.id));

                if (remainingCharacters.length === 0) {
                    set({ target: null, guesses: [], hasFinalized: false, });
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
                // ── 🛡️ เคลียร์ความคืบหน้า Zustand กระดานนี้ในออบเจกต์รวม (ไม่ให้กระทบ daily)
                const progressData = JSON.parse(localStorage.getItem('bleachdle-character-progress') || '{}');
                delete progressData.unlimited;
                localStorage.setItem('bleachdle-character-progress', JSON.stringify(progressData));

                // ── 🛡️ ล้างรายชื่อตัวละครที่เคลียร์เฉพาะฝั่ง unlimited
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
            // ใช้ชื่อ Property ย่อยเป็นชื่อ Name
            name: 'unlimited',
            // ── 🌟 INTERCEPTOR: บังคับให้ Zustand ยัด State เข้าไปอยู่ใน Object ย่อยของคีย์หลักก้อนเดียว ──
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
        }
    )
);