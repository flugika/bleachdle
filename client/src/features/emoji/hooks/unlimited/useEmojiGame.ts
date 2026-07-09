// src/features/emoji/hooks/unlimited/useEmojiGame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getEmojiStatus } from '@/src/features/emoji/compareEmoji';
import { getCharacterById } from '@/src/features/character/character'; // ⚠️ ปรับ path ให้ตรงของจริงถ้าไม่ตรงนี้
import { getEmojiSets, attachCharacter } from '@/src/features/emoji/emoji';
import { EmojiGameController, EmojiGuessEntry, EmojiTarget } from '@/src/features/emoji/types';
import { MAX_UNLIMITED_EMOJI_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { isValidGuessEntry } from '../../validGuessEntry';
import { Stats } from '@/src/shared/types/guessGame';

// 🔓 ทุกๆ 2 ครั้งที่เดาผิด ให้เฉลย emoji เพิ่มอีก 1 ตัว (เริ่มต้นเปิดมาแล้ว 1 ตัวเสมอ)
const WRONG_GUESSES_PER_REVEAL = 2;
const TOTAL_EMOJI_COUNT = 4;
const INITIAL_REVEALED_EMOJI = 1;

function computeRevealedCount(wrongGuessCount: number): number {
    const revealed = INITIAL_REVEALED_EMOJI + Math.floor(wrongGuessCount / WRONG_GUESSES_PER_REVEAL);
    return Math.min(TOTAL_EMOJI_COUNT, revealed);
}

export const useEmojiGame = create<EmojiGameController>()(
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
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
                set({ stats: saved });
            },

            addGuess: (characterId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_UNLIMITED_EMOJI_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(characterId);
                if (!guessedCharacter) return state;

                // 🛡️ กันเดาตัวละครซ้ำ
                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedCharacter.id);
                if (alreadyGuessed) return state;

                const status = getEmojiStatus(guessedCharacter, state.target.character_id);
                const newEntry: EmojiGuessEntry = { guess: guessedCharacter, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                // 🔓 นับจำนวนที่เดาผิดทั้งหมด (รวม guess ล่าสุด) แล้วคำนวณว่าควรเปิด emoji กี่ตัวแล้ว
                const wrongGuessCount = [newEntry, ...prevGuesses].filter(g => g.status === 'wrong').length;
                const revealedCount = computeRevealedCount(wrongGuessCount);

                return { guesses: [newEntry, ...prevGuesses], revealedCount };
            }),

            // 🛡️ เหมือน useQuoteGame เป๊ะ: แค่เช็คว่ามี target อยู่แล้วหรือยัง
            initializeGame: (force = false) => {
                const { target, _hasHydrated } = get();

                if (!_hasHydrated) return;
                if (!force && target) return;

                const allSets = getEmojiSets();

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_COMPLETED) || '{}');
                const completedIds: string[] = completedData.unlimited || [];

                const remainingSets = allSets.filter(s => !completedIds.includes(s.id));

                if (remainingSets.length === 0) {
                    set({ target: null, guesses: [], hasFinalized: false, revealedCount: INITIAL_REVEALED_EMOJI });
                    return;
                }

                const randomSet = remainingSets[Math.floor(Math.random() * remainingSets.length)];

                // 🔗 แนบ character เต็มๆ เข้ากับ target แทนที่จะเก็บแค่ character_id
                const nextTarget: EmojiTarget | undefined = attachCharacter(randomSet);

                // 🛡️ กัน crash ถ้า set.character_id ชี้ไปหาตัวละครที่ไม่มีอยู่จริงใน dataset
                if (!nextTarget) {
                    console.error(
                        `[useEmojiGame] EmojiSet ${randomSet.id} references missing character_id "${randomSet.character_id}". Skipping this round.`
                    );
                    set({ target: null, guesses: [], hasFinalized: false, revealedCount: INITIAL_REVEALED_EMOJI });
                    return;
                }

                // 🔓 รอบใหม่ทุกครั้ง เปิดแค่ emoji ตัวแรกเสมอ
                set({ target: nextTarget, guesses: [], hasFinalized: false, revealedCount: INITIAL_REVEALED_EMOJI });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized } = get();
                if (!target || hasFinalized) return;

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_COMPLETED) || '{}');

                if (isWin) {
                    const currentUnlimited: string[] = completedData.unlimited || [];
                    completedData.unlimited = [...new Set([...currentUnlimited, target.id])];
                } else {
                    completedData.unlimited = [];
                }

                localStorage.setItem(STORAGE_KEYS.EMOJI_COMPLETED, JSON.stringify(completedData));

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_STATS) || '{}');
                const savedStats: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin
                        ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1)
                        : savedStats.maxStreak,
                };

                statsData.unlimited = newStats;
                localStorage.setItem(STORAGE_KEYS.EMOJI_STATS, JSON.stringify(statsData));

                // 🔓 จบเกม (แพ้หรือชนะ) ถือว่าเฉลยครบทุกตัวเสมอ ไม่ว่าผู้เล่นจะไปเดาผิดพอให้เปิดครบ
                // ธรรมชาติหรือไม่ก็ตาม — ฝั่ง UI (EmojiTestimonyDisplay) ก็อ่าน isSolved ควบคู่กันอยู่แล้ว
                set({
                    hasFinalized: true,
                    stats: newStats,
                    revealedCount: TOTAL_EMOJI_COUNT,
                });
            },

            resetGame: () => {
                set({ target: null, guesses: [], hasFinalized: false, revealedCount: INITIAL_REVEALED_EMOJI });
            },

            hardReset: () => {
                const progressData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_PROGRESS) || '{}');
                delete progressData.unlimited;
                localStorage.setItem(STORAGE_KEYS.EMOJI_PROGRESS, JSON.stringify(progressData));

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_COMPLETED) || '{}');
                completedData.unlimited = [];
                localStorage.setItem(STORAGE_KEYS.EMOJI_COMPLETED, JSON.stringify(completedData));

                set({ target: null, guesses: [], hasFinalized: false, revealedCount: INITIAL_REVEALED_EMOJI });

                setTimeout(() => {
                    get().initializeGame(true);
                }, 0);
            },

            resetStreakKeepMax: () => {
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };

                const resetStats: Stats = { currentStreak: 0, maxStreak: saved.maxStreak };

                statsData.unlimited = resetStats;
                localStorage.setItem(STORAGE_KEYS.EMOJI_STATS, JSON.stringify(statsData));

                set({ stats: resetStats });
            },
        }),
        {
            name: 'unlimited',
            storage: nestedJSONStorage(STORAGE_KEYS.EMOJI_PROGRESS),
            // ✅ isNew เป็น ephemeral UI flag เท่านั้น ไม่ต้อง persist เป็น true ข้ามรอบ
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
                hasFinalized: state.hasFinalized,
                revealedCount: state.revealedCount, // 🆕 persist ด้วย กันเปิดครบแล้ว refresh กลับไปล็อกใหม่
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const hasCorruptedGuesses = !Array.isArray(state.guesses) ||
                        state.guesses.some(g => !isValidGuessEntry(g));

                    // 🛡️ target ที่ persist ไว้จาก build ก่อนหน้า (ก่อนมี .character แนบมา)
                    // ถือว่า corrupted เหมือนกัน กัน component พังตอนอ่าน target.character.name
                    const hasStaleTargetShape =
                        state.target != null && !(state.target as Partial<EmojiTarget>).character;

                    // 🛡️ revealedCount เพี้ยน (undefined จาก build เก่า, หรือหลุดช่วง 1-4) → รีเซ็ตกลับ 1
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
