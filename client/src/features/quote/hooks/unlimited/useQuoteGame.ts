// src/features/quote/hooks/unlimited/useQuoteGame.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getQuoteStatus } from '@/src/features/quote/compareQuote';
import { getCharacterById } from '@/src/features/character/character'; // ⚠️ ปรับ path ให้ตรงของจริงถ้าไม่ตรงนี้
import { getQuotes } from '@/src/features/quote/quote';
import { QuoteGameController, QuoteGuessEntry } from '@/src/features/quote/types';
import { MAX_QUOTE_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';

// 🛡️ Type guard กันข้อมูล legacy/corrupted เหมือน useSongGame
function isValidGuessEntry(entry: unknown): entry is QuoteGuessEntry {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'status' in entry &&
        ((entry as QuoteGuessEntry).status === 'correct' || (entry as QuoteGuessEntry).status === 'wrong') &&
        'guess' in entry &&
        typeof (entry as QuoteGuessEntry).guess === 'object'
    );
}

export const useQuoteGame = create<QuoteGameController>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            addGuess: (characterId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_QUOTE_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(characterId);
                if (!guessedCharacter) return state;

                // 🛡️ กันเดาตัวละครซ้ำ
                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedCharacter.id);
                if (alreadyGuessed) return state;

                const status = getQuoteStatus(guessedCharacter, state.target.character_id);
                const newEntry: QuoteGuessEntry = { guess: guessedCharacter, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            // 🛡️ เหมือน useSongGame เป๊ะ: แค่เช็คว่ามี target อยู่แล้วหรือยัง
            // ไม่ต้องมี segment เพราะ quote แต่ละอันคือ quiz item เดี่ยวๆ อยู่แล้ว
            initializeGame: (force = false) => {
                const { target, _hasHydrated } = get();

                if (!_hasHydrated) return;
                if (!force && target) return;

                const allQuotes = getQuotes();

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_COMPLETED) || '{}');
                const completedIds: string[] = completedData.unlimited || [];

                const remainingQuotes = allQuotes.filter(q => !completedIds.includes(q.id));

                if (remainingQuotes.length === 0) {
                    set({ target: null, guesses: [], hasFinalized: false });
                } else {
                    const randomQuote = remainingQuotes[Math.floor(Math.random() * remainingQuotes.length)];
                    set({ target: randomQuote, guesses: [], hasFinalized: false });
                }
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized } = get();
                if (!target || hasFinalized) return;

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_COMPLETED) || '{}');

                if (isWin) {
                    const currentUnlimited: string[] = completedData.unlimited || [];
                    completedData.unlimited = [...new Set([...currentUnlimited, target.id])];
                } else {
                    completedData.unlimited = [];
                }

                localStorage.setItem(STORAGE_KEYS.QOUTE_COMPLETED, JSON.stringify(completedData));
                set({ hasFinalized: true });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false });
            },

            hardReset: () => {
                const progressData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_PROGRESS) || '{}');
                delete progressData.unlimited;
                localStorage.setItem(STORAGE_KEYS.QOUTE_PROGRESS, JSON.stringify(progressData));

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_COMPLETED) || '{}');
                completedData.unlimited = [];
                localStorage.setItem(STORAGE_KEYS.QOUTE_COMPLETED, JSON.stringify(completedData));

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
                    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_PROGRESS) || '{}');
                    return data[name] ? JSON.stringify(data[name]) : null;
                },
                setItem: (name, value) => {
                    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_PROGRESS) || '{}');
                    data[name] = JSON.parse(value);
                    localStorage.setItem(STORAGE_KEYS.QOUTE_PROGRESS, JSON.stringify(data));
                },
                removeItem: (name) => {
                    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_PROGRESS) || '{}');
                    delete data[name];
                    localStorage.setItem(STORAGE_KEYS.QOUTE_PROGRESS, JSON.stringify(data));
                }
            })),
            // ✅ isNew เป็น ephemeral UI flag เท่านั้น
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
                hasFinalized: state.hasFinalized,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const hasCorruptedData = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidGuessEntry(g));

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