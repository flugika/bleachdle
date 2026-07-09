// src/features/silhouette/hooks/daily/useSilhouetteGame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSilhouetteStatus } from '@/src/features/silhouette/compareSilhouette';
import { getCharacterById } from '@/src/features/character/character';
import { SilhouetteGameController, SilhouetteGuessEntry, SilhouetteTarget } from '@/src/features/silhouette/types';
import { MAX_DAILY_SILHOUETTE_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { recordDailyStat } from '@/src/services/statsClient';
// 🛡️ reuse guard เดิมจาก quote (guess/status shape เหมือนกันเป๊ะ) — ฝั่ง unlimited silhouette ก็ reuse ตัวนี้อยู่แล้ว
import { isValidGuessEntry } from '@/src/features/quote/validGuessEntry';
import { Stats } from '@/src/shared/types/guessGame';
import { getTodayStr } from '@/src/lib/utils/format';

/**
 * 🗓️ daily silhouette store — โครงหน้าตา**เหมือน unlimited เป๊ะ** (implement SilhouetteGameController
 * เต็มรูปแบบ) เพราะ SilhouetteControlPanel ตัวจริงไม่มี prop `mode` แยก มันรับแค่
 * `{ target, characters, remainingGuesses, stats, game: SilhouetteGameController, isGameOver }`
 * เท่ากับ component เดียวถูกใช้ซ้ำทั้ง daily/unlimited — ต่างกันแค่ "target มาจากไหน":
 *   - unlimited: initializeGame() สุ่มจาก pool เอง
 *   - daily: target ผูกกับ server (getDailySilhouette) เสมอ ผ่าน setTarget()
 *
 * 🎯 เพดาน MAX_DAILY_SILHOUETTE_GUESSES ใช้เป็นเงื่อนไขแพ้จริง เหมือน unlimited (ไม่ใช่แค่ safety cap
 * แบบที่ quote ทำ) — ไม่งั้น streak ของ daily จะไม่มี stake อะไรเลยตามที่คุยกัน
 */
export const useSilhouetteGame = create<SilhouetteGameController>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            // 🗓️ ต่างจาก unlimited ตรงนี้จุดเดียว: setTarget ต้อง "รู้เอง" ว่า target ใหม่เป็นวันเดิม
            // (id ตรงกัน → แค่ sync reference ไม่แตะ guesses) หรือวันใหม่ (id ต่าง → เริ่มรอบสะอาด)
            // เพราะ interface ไม่มี initializeGame(target) แบบที่ quote daily ใช้ ต้อง reconcile ในนี้แทน
            setTarget: (target) => set((state) => {
                if (state.target && state.target.id === target.id) {
                    return { target };
                }
                return { target, guesses: [], hasFinalized: false };
            }),

            stats: { currentStreak: 0, maxStreak: 0 },
            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_STATS) || '{}');
                const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };
                set({ stats: saved });
            },

            addGuess: (characterId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_DAILY_SILHOUETTE_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(characterId);
                if (!guessedCharacter) return state;

                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedCharacter.id);
                if (alreadyGuessed) return state;

                const status = getSilhouetteStatus(guessedCharacter, state.target.character_id);
                const newEntry: SilhouetteGuessEntry = { guess: guessedCharacter, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            // ⚠️ daily ไม่มี "สุ่มตัวใหม่" ให้ initializeGame ทำแบบ unlimited (target ผูกกับ server
            // ผ่าน setTarget เท่านั้น) — เก็บ method นี้ไว้แค่ให้ตรง type ของ SilhouetteGameController
            // และกันพังถ้ามีจุดไหนเผลอเรียก ไม่ได้มี logic สุ่มอะไรจริงจัง
            initializeGame: (force = false) => {
                const { target, _hasHydrated } = get();
                if (!_hasHydrated) return;
                if (!target) return; // ยังไม่ได้ target จาก server (setTarget) เลย ไม่มีอะไรให้ init
                if (!force) return;
                // force=true: เคลียร์ guesses รอบนี้ (เผื่อ debug/QA) โดยไม่แตะ target — ต่างจาก
                // unlimited ที่ force=true แปลว่า "เอา target ใหม่" ซึ่งไม่มี concept นี้ในโหมด daily
                set({ guesses: [], hasFinalized: false });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized, guesses } = get();
                if (!target || hasFinalized) return;

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
                const today = getTodayStr();

                if (isWin) {
                    const history = completedData.daily || [];
                    completedData.daily = [...new Set([...history, today])];
                } else {
                    completedData.daily = [];
                }
                localStorage.setItem(STORAGE_KEYS.SILHOUETTE_COMPLETED, JSON.stringify(completedData));

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_STATS) || '{}');
                const savedStats: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };
                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1) : savedStats.maxStreak,
                };
                statsData.daily = newStats;
                localStorage.setItem(STORAGE_KEYS.SILHOUETTE_STATS, JSON.stringify(statsData));

                set({ hasFinalized: true, stats: newStats });

                recordDailyStat('silhouette', isWin, guesses.length).catch(() => { });
            },

            resetGame: () => set({ target: null, guesses: [], hasFinalized: false }),

            // ⚠️ DESIGN CALL ที่ต้อง confirm กับ product: unlimited ตี hardReset = "reroll target ใหม่
            // ทันที" แต่ daily มี target ตายตัว 1 ตัว/วัน reroll ไม่มีความหมาย เลยตีความ hardReset ของ
            // daily เป็น "ยอมแพ้ streak ปัจจุบัน" (เท่ากับเรียก resetStreakKeepMax) แทน
            // 🚨 ผลข้างเคียงที่ต้องเช็ค: ถ้า SilhouetteControlPanel โชว์ UI reincarnation/soul-name
            // (เหมือนหน้า unlimited) ปุ่มนั้นจะไม่มีความหมายในบริบท daily — แนะนำเพิ่ม `mode` prop ให้
            // component นั้นซ่อน UI ส่วนนี้ตอน mode==="daily" ไปเลย ผมไม่มีซอร์สไฟล์นั้นเลยแก้ให้ไม่ได้ตรงนี้
            hardReset: () => {
                get().resetStreakKeepMax();
            },

            resetStreakKeepMax: () => {
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_STATS) || '{}');
                const saved: Stats = statsData.daily || { currentStreak: 0, maxStreak: 0 };
                const resetStats: Stats = { currentStreak: 0, maxStreak: saved.maxStreak };
                statsData.daily = resetStats;
                localStorage.setItem(STORAGE_KEYS.SILHOUETTE_STATS, JSON.stringify(statsData));
                set({ stats: resetStats });
            },
        }),
        {
            name: 'daily',
            storage: nestedJSONStorage(STORAGE_KEYS.SILHOUETTE_PROGRESS),
            partialize: (state) => ({
                guesses: state.guesses.map(({ guess, status }) => ({ guess, status, isNew: false })),
                target: state.target,
                hasFinalized: state.hasFinalized,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const hasCorruptedGuesses = !Array.isArray(state.guesses) || state.guesses.some(g => !isValidGuessEntry(g));
                    const hasStaleTargetShape = state.target != null && !(state.target as Partial<SilhouetteTarget>).character;

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