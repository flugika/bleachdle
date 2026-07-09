// src/features/emoji/hooks/daily/useEmojiGame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getEmojiStatus } from '@/src/features/emoji/compareEmoji';
import { getCharacterById } from '@/src/features/character/character';
import { EmojiGuessEntry, EmojiTarget } from '@/src/features/emoji/types';
import { MAX_DAILY_EMOJI_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { recordDailyStat } from '@/src/services/statsClient';
import { isValidGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/shared/types/guessGame';

// 🔓 เหมือนฝั่ง unlimited เป๊ะ — แยกค่าคงที่ไว้ในไฟล์นี้เพราะ daily/unlimited เป็นคนละ store
// (ถ้าอยากลดซ้ำ ย้ายไป src/features/emoji/emoji.ts เป็น shared const ได้ในรอบ refactor ถัดไป)
const WRONG_GUESSES_PER_REVEAL = 2;
const TOTAL_EMOJI_COUNT = 4;
const INITIAL_REVEALED_EMOJI = 1;

function computeRevealedCount(wrongGuessCount: number): number {
    const revealed = INITIAL_REVEALED_EMOJI + Math.floor(wrongGuessCount / WRONG_GUESSES_PER_REVEAL);
    return Math.min(TOTAL_EMOJI_COUNT, revealed);
}

interface EmojiDailyGameState {
    target: EmojiTarget | null;
    guesses: EmojiGuessEntry[];
    revealedCount: number; // 🆕
    stats: Stats;
    loadStats: () => void;
    addGuess: (characterId: string) => void;
    setTarget: (target: EmojiTarget) => void;
    initializeGame: (target?: EmojiTarget | null) => void;
    finalizeGame: (isWin: boolean) => void;
    resetGame: () => void;
    hasFinalized: boolean;
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useEmojiGame = create<EmojiDailyGameState>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            setTarget: (target) => set({ target }),

            revealedCount: INITIAL_REVEALED_EMOJI, // 🆕

            stats: { currentStreak: 0, maxStreak: 0 },
            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_STATS) || '{}');
                const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };
                set({ stats: saved });
            },

            addGuess: (characterId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_DAILY_EMOJI_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(characterId);
                if (!guessedCharacter) return state;

                // 🛡️ กันเดาตัวละครซ้ำ
                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedCharacter.id);
                if (alreadyGuessed) return state;

                const status = getEmojiStatus(guessedCharacter, state.target.character_id);
                const newEntry: EmojiGuessEntry = { guess: guessedCharacter, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                // 🔓 นับผิดทั้งหมด (รวมล่าสุด) แล้วคำนวณว่าเปิด emoji ไปกี่ตัวแล้ว
                const wrongGuessCount = [newEntry, ...prevGuesses].filter(g => g.status === 'wrong').length;
                const revealedCount = computeRevealedCount(wrongGuessCount);

                return { guesses: [newEntry, ...prevGuesses], revealedCount };
            }),

            // 🛡️ เหมือน useQuoteGame (daily) เป๊ะ: target มาจาก server (getDailyEmoji)
            // id ตรงกัน = วันเดียวกัน → sync reference เฉยๆ ไม่ล้าง guesses/revealedCount
            // id ต่าง = วันใหม่ → reset ทุกอย่างรวม revealedCount กลับ 1
            initializeGame: (target) => {
                if (!target) return;

                const currentTarget = get().target;

                if (currentTarget && currentTarget.id === target.id) {
                    if (currentTarget !== target) {
                        set({ target });
                    }
                    return;
                }

                set({ target, guesses: [], hasFinalized: false, revealedCount: INITIAL_REVEALED_EMOJI });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized, guesses } = get();
                if (!target || hasFinalized) return;

                const completedData = JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.EMOJI_COMPLETED) || "{}"
                );
                const today = new Date().toISOString().split('T')[0];

                if (isWin) {
                    const history = completedData.daily || [];
                    completedData.daily = [...new Set([...history, today])];
                } else {
                    completedData.daily = [];
                }

                localStorage.setItem(
                    STORAGE_KEYS.EMOJI_COMPLETED,
                    JSON.stringify(completedData)
                );

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_STATS) || '{}');
                const savedStats: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };

                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin
                        ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1)
                        : savedStats.maxStreak,
                };

                statsData.daily = newStats;
                localStorage.setItem(STORAGE_KEYS.EMOJI_STATS, JSON.stringify(statsData));

                // 🔓 จบเกม (แพ้/ชนะ) เฉลยครบทุกตัวเสมอ เหมือนฝั่ง unlimited
                set({ hasFinalized: true, stats: newStats, revealedCount: TOTAL_EMOJI_COUNT });

                recordDailyStat('emoji', isWin, guesses.length).catch(() => { });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false, revealedCount: INITIAL_REVEALED_EMOJI });
            },
        }),
        {
            name: 'daily',
            storage: nestedJSONStorage(STORAGE_KEYS.EMOJI_PROGRESS),
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
                hasFinalized: state.hasFinalized,
                revealedCount: state.revealedCount, // 🆕
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const hasCorruptedGuesses = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidGuessEntry(g));

                    const hasStaleTargetShape =
                        state.target != null && !(state.target as Partial<EmojiTarget>).character;

                    const hasInvalidRevealCount =
                        typeof state.revealedCount !== 'number' ||
                        state.revealedCount < INITIAL_REVEALED_EMOJI ||
                        state.revealedCount > TOTAL_EMOJI_COUNT;

                    if (hasCorruptedGuesses || hasStaleTargetShape) {
                        state.guesses = [];
                        state.target = null;
                        state.hasFinalized = false;
                        state.revealedCount = INITIAL_REVEALED_EMOJI;
                    } else if (hasInvalidRevealCount) {
                        state.revealedCount = INITIAL_REVEALED_EMOJI;
                    }

                    state.setHasHydrated(true);
                }
            },
        }
    )
);