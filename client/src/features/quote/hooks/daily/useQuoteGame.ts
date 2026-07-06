// src/features/quote/hooks/daily/useQuoteGame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getQuoteStatus } from '@/src/features/quote/compareQuote';
import { getCharacterById } from '@/src/features/character/character';
import { QuoteGuessEntry, QuoteTarget } from '@/src/features/quote/types';
import { MAX_QUOTE_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { recordDailyStat } from '@/src/services/statsClient';
import { isValidGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/shared/types/guessGame';

interface QuoteDailyGameState {
    target: QuoteTarget | null;
    guesses: QuoteGuessEntry[];
    stats: Stats; // 🆕
    loadStats: () => void; // 🆕
    addGuess: (characterId: string) => void;
    setTarget: (target: QuoteTarget) => void;
    initializeGame: (target?: QuoteTarget | null) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useQuoteGame = create<QuoteDailyGameState>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            stats: { currentStreak: 0, maxStreak: 0 }, // 🆕
            // 🆕 ย้ายมาจาก component: อ่าน STORAGE_KEYS.QOUTE_STATS เข้า store
            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_STATS) || '{}');
                const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };
                set({ stats: saved });
            },

            addGuess: (characterId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_QUOTE_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(characterId);
                if (!guessedCharacter) return state;

                // 🛡️ กันเดาตัวละครซ้ำ — เหมือนฝั่ง unlimited เป๊ะ
                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedCharacter.id);
                if (alreadyGuessed) return state;

                const status = getQuoteStatus(guessedCharacter, state.target.character_id);
                const newEntry: QuoteGuessEntry = { guess: guessedCharacter, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            // 🛡️ เหมือน useCharacterGame (daily) เป๊ะ: target มาจาก server (getDailyQuote)
            // เทียบ id ก่อน ถ้าเป็นวันเดียวกัน (id ตรงกัน) แค่ sync reference โดยไม่ล้าง guesses
            // ถ้าเป็นคนละวัน (id ต่าง) ถึงจะ reset guesses/hasFinalized ใหม่
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

                const completedData = JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.QOUTE_COMPLETED) || "{}"
                );
                const today = new Date().toISOString().split('T')[0];

                if (isWin) {
                    const history = completedData.daily || [];
                    completedData.daily = [...new Set([...history, today])];
                } else {
                    completedData.daily = [];
                }

                localStorage.setItem(
                    STORAGE_KEYS.QOUTE_COMPLETED,
                    JSON.stringify(completedData)
                );

                // ── 🆕 stats: ย้าย logic จาก updateStats เดิมเข้ามาตรงนี้ ──
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.QOUTE_STATS) || '{}');
                const savedStats: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };

                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin
                        ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1)
                        : savedStats.maxStreak,
                };

                statsData.daily = newStats;
                localStorage.setItem(STORAGE_KEYS.QOUTE_STATS, JSON.stringify(statsData));

                set({ hasFinalized: true, stats: newStats }); // 🆕 อัปเดต stats พร้อมกันในนี้เลย

                recordDailyStat('quote', isWin, guesses.length).catch(() => { });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false });
            },
        }),
        {
            name: 'daily',
            storage: nestedJSONStorage(STORAGE_KEYS.QOUTE_PROGRESS),
            // ✅ isNew เป็น ephemeral UI flag เท่านั้น เหมือนฝั่ง unlimited — ไม่ persist เป็น true ข้ามรอบ
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
                hasFinalized: state.hasFinalized,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const hasCorruptedGuesses = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidGuessEntry(g));

                    // 🛡️ target ที่ persist มาจาก build ก่อนหน้า (ก่อนมี .character แนบมา)
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