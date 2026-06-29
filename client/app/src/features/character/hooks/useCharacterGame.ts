import { create } from 'zustand';
import { Character } from '@/src/entities/character/schema';
import { compareCharacters } from '@/src/lib/game-engine/compare';
import { ComparisonOutcome } from '@/src/features/character/types';
import { getCharacterById, getCharacters } from '@/src/lib/utils/character';
import { persist } from 'zustand/middleware';

interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
}

interface CharacterGameState {
    target: Character | null;
    guesses: GuessEntry[];
    addGuess: (guess: string) => void;
    setTarget: (target: Character) => void;
    initializeGame: (force?: boolean) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hardReset: () => void;
}

export const useCharacterGame = create<CharacterGameState>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            setTarget: (target) => set({ target }),
            addGuess: (guessId: string) => set((state) => {
                const isGameOver = state.guesses.length >= 10;
                if (!state.target || isGameOver) return state;

                // 1. หาข้อมูล Character ตัวเต็มจาก ID
                const guessedCharacter = getCharacterById(guessId);
                if (!guessedCharacter) return state;

                // 2. เรียกใช้ compareCharacters (Logic เดิมที่คุณทำไว้)
                const result = compareCharacters(guessedCharacter, state.target);

                // 3. เก็บลง State
                const newEntry = { guess: guessedCharacter, result, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),
            initializeGame: (force = false) => {
                const { target, guesses } = get();

                // ถ้าไม่ได้สั่ง force และมีเกมที่เล่นค้างอยู่ ให้หยุดทำงาน
                if (!force && target && guesses.length > 0) return;

                const allCharacters = getCharacters();
                const completedIds = JSON.parse(localStorage.getItem('bleachdle-character-completed') || '[]');
                const remainingCharacters = allCharacters.filter(c => !completedIds.includes(c.id));

                if (remainingCharacters.length === 0) {
                    set({ target: null, guesses: [] });
                } else {
                    set({
                        target: remainingCharacters[Math.floor(Math.random() * remainingCharacters.length)],
                        guesses: [] // รีเซ็ตกระดาน
                    });
                }
            },
            finalizeGame: (isWin: boolean) => {
                const { target } = get();
                if (!target) return;

                if (isWin) {
                    // บันทึก ID ที่ชนะ (เฉพาะเคสชนะ)
                    const completed = JSON.parse(localStorage.getItem('bleachdle-character-completed') || '[]');
                    localStorage.setItem('bleachdle-character-completed', JSON.stringify([...new Set([...completed, target.id])]));
                } else {
                    localStorage.removeItem('bleachdle-character-completed');
                }
            },
            resetGame: () => {
                set({ target: null, guesses: [] });
            },
            hardReset: () => {
                // 1. เคลียร์ LocalStorage ให้เกลี้ยง
                localStorage.removeItem('bleachdle-character-progress');
                localStorage.removeItem('bleachdle-character-completed');

                // 2. เคลียร์ State
                set({ target: null, guesses: [] });

                // 3. เริ่มเกมใหม่แบบบังคับ (Force)
                // ใช้ setTimeout เพื่อให้แน่ใจว่า state โดน clear แล้วค่อยสุ่มใหม่
                setTimeout(() => {
                    get().initializeGame(true);
                }, 0);
            },
        }),
        {
            name: 'bleachdle-character-progress',
            partialize: (state) => ({
                guesses: state.guesses,
                target: state.target
            }),
        }
    )
);