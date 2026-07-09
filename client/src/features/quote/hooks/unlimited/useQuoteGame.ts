// src/features/quote/hooks/unlimited/useQuoteGame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getQuoteStatus } from '@/src/features/quote/compareQuote';
import { getCharacterById } from '@/src/features/character/character'; // ⚠️ ปรับ path ให้ตรงของจริงถ้าไม่ตรงนี้
import { getQuotes, attachCharacter } from '@/src/features/quote/quote';
import { QuoteGameController, QuoteGuessEntry, QuoteTarget } from '@/src/features/quote/types';
import { MAX_UNLIMITED_QUOTE_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { isValidGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/shared/types/guessGame';

export const useQuoteGame = create<QuoteGameController>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            stats: { currentStreak: 0, maxStreak: 0 }, // 🆕
            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
                set({ stats: saved });
            },

            addGuess: (characterId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_UNLIMITED_QUOTE_GUESSES;
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
                    return;
                }

                const randomQuote = remainingQuotes[Math.floor(Math.random() * remainingQuotes.length)];

                // 🔗 แนบ character เต็มๆ เข้ากับ target แทนที่จะเก็บแค่ character_id
                // ทำให้ QuoteSummaryGuess / QuoteTestimonyDisplay / race-emblem effect
                // อ่าน target.character ได้เลยโดยไม่ต้อง getCharacterById ซ้ำ
                const nextTarget: QuoteTarget | undefined = attachCharacter(randomQuote);

                // 🛡️ กัน crash ถ้า quote.character_id ชี้ไปหาตัวละครที่ไม่มีอยู่จริงใน dataset
                if (!nextTarget) {
                    console.error(
                        `[useQuoteGame] Quote ${randomQuote.id} references missing character_id "${randomQuote.character_id}". Skipping this round.`
                    );
                    set({ target: null, guesses: [], hasFinalized: false });
                    return;
                }

                set({ target: nextTarget, guesses: [], hasFinalized: false });
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

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_STATS) || '{}');
                const savedStats: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin
                        ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1)
                        : savedStats.maxStreak,
                };

                statsData.unlimited = newStats;
                localStorage.setItem(STORAGE_KEYS.QOUTE_STATS, JSON.stringify(statsData));

                set({
                    hasFinalized: true,
                    stats: newStats, // 🆕
                });
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
            resetStreakKeepMax: () => {
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

                const resetStats: Stats = { currentStreak: 0, maxStreak: saved.maxStreak };

                statsData.unlimited = resetStats;
                localStorage.setItem(STORAGE_KEYS.QOUTE_STATS, JSON.stringify(statsData));

                set({ stats: resetStats });
            },
        }),
        {
            name: 'unlimited',
            storage: nestedJSONStorage(STORAGE_KEYS.QOUTE_PROGRESS),
            // ✅ isNew เป็น ephemeral UI flag เท่านั้น ไม่ต้อง persist เป็น true ข้ามรอบ
            // (ถ้า persist ไว้เป็น true จะเล่น reveal animation ซ้ำทุกครั้งที่ refresh หน้า)
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
                hasFinalized: state.hasFinalized,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const hasCorruptedGuesses = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidGuessEntry(g));

                    // 🛡️ target ที่ persist ไว้จาก build ก่อนหน้า (ก่อนมี .character แนบมา)
                    // ถือว่า corrupted เหมือนกัน กัน component พังตอนอ่าน target.character.name
                    const hasStaleTargetShape =
                        state.target != null && !(state.target as Partial<QuoteTarget>).character;

                    if (hasCorruptedGuesses || hasStaleTargetShape) {
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