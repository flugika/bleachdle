import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCharacterById } from '@/src/features/character/character';
import { getSilhouettes, attachCharacter } from '@/src/features/silhouette/silhouette';
import { SilhouetteGameController, SilhouetteGuessEntry, SilhouetteTarget } from '@/src/features/silhouette/types';
import { MAX_UNLIMITED_SILHOUETTE_GUESSES } from '@/src/const/guess';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { nestedJSONStorage } from '@/src/lib/store/createNestedStorage';
import { isValidGuessEntry } from '@/src/features/quote/validGuessEntry'; // reuse guard เดิม (guess/status shape เหมือน quote เป๊ะ)
import { Stats } from '@/src/shared/types/guessGame';

export const useSilhouetteGame = create<SilhouetteGameController>()(
    persist(
        (set, get) => ({
            target: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            setTarget: (target) => set({ target }),

            stats: { currentStreak: 0, maxStreak: 0 },
            loadStats: () => {
                if (typeof window === 'undefined') return;
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
                set({ stats: saved });
            },

            addGuess: (characterId: string) => set((state) => {
                const isGameOver = state.guesses.length >= MAX_UNLIMITED_SILHOUETTE_GUESSES;
                if (!state.target || isGameOver) return state;

                const guessedCharacter = getCharacterById(characterId);
                if (!guessedCharacter) return state;

                const alreadyGuessed = state.guesses.some(g => g.guess.id === guessedCharacter.id);
                if (alreadyGuessed) return state;

                const status = guessedCharacter.id === state.target.character_id ? 'correct' : 'wrong';
                const newEntry: SilhouetteGuessEntry = { guess: guessedCharacter, status, isNew: true };
                const prevGuesses = state.guesses.map(g => ({ ...g, isNew: false }));

                return { guesses: [newEntry, ...prevGuesses] };
            }),

            initializeGame: (force = false) => {
                const { target, _hasHydrated } = get();
                if (!_hasHydrated) return;
                if (!force && target) return;

                const allSilhouettes = getSilhouettes();

                // 🛡️ ตอนนี้ dataset อาจยังไม่ครบทุกตัวละคร (asset ยังทยอยเพิ่ม) — สุ่มจากเฉพาะ
                // ตัวที่มี silhouette entry จริง ต่างจาก search bar ที่โชว์ full roster ตามที่ตกลงกัน
                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
                const completedIds: string[] = completedData.unlimited || [];

                const remaining = allSilhouettes.filter(s => !completedIds.includes(s.character_id));

                if (remaining.length === 0) {
                    set({ target: null, guesses: [], hasFinalized: false });
                    return;
                }

                const randomSilhouette = remaining[Math.floor(Math.random() * remaining.length)];
                const nextTarget: SilhouetteTarget | undefined = attachCharacter(randomSilhouette);

                if (!nextTarget) {
                    console.error(`[useSilhouetteGame] silhouette references missing character_id "${randomSilhouette.character_id}". Skipping.`);
                    set({ target: null, guesses: [], hasFinalized: false });
                    return;
                }

                set({ target: nextTarget, guesses: [], hasFinalized: false });
            },

            finalizeGame: (isWin) => {
                const { target, hasFinalized } = get();
                if (!target || hasFinalized) return;

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
                if (isWin) {
                    const current: string[] = completedData.unlimited || [];
                    completedData.unlimited = [...new Set([...current, target.character_id])];
                } else {
                    completedData.unlimited = [];
                }
                localStorage.setItem(STORAGE_KEYS.SILHOUETTE_COMPLETED, JSON.stringify(completedData));

                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_STATS) || '{}');
                const savedStats: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
                const newStats: Stats = {
                    currentStreak: isWin ? savedStats.currentStreak + 1 : 0,
                    maxStreak: isWin ? Math.max(savedStats.maxStreak, savedStats.currentStreak + 1) : savedStats.maxStreak,
                };
                statsData.unlimited = newStats;
                localStorage.setItem(STORAGE_KEYS.SILHOUETTE_STATS, JSON.stringify(statsData));

                set({ hasFinalized: true, stats: newStats });
            },

            resetGame: () => set({ target: null, guesses: [], hasFinalized: false }),

            hardReset: () => {
                const progressData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_PROGRESS) || '{}');
                delete progressData.unlimited;
                localStorage.setItem(STORAGE_KEYS.SILHOUETTE_PROGRESS, JSON.stringify(progressData));

                const completedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
                completedData.unlimited = [];
                localStorage.setItem(STORAGE_KEYS.SILHOUETTE_COMPLETED, JSON.stringify(completedData));

                set({ target: null, guesses: [], hasFinalized: false });
                setTimeout(() => get().initializeGame(true), 0);
            },

            resetStreakKeepMax: () => {
                const statsData = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_STATS) || '{}');
                const saved: Stats = statsData.unlimited || { currentStreak: 0, maxStreak: 0 };
                const resetStats: Stats = { currentStreak: 0, maxStreak: saved.maxStreak };
                statsData.unlimited = resetStats;
                localStorage.setItem(STORAGE_KEYS.SILHOUETTE_STATS, JSON.stringify(statsData));
                set({ stats: resetStats });
            },
        }),
        {
            name: 'unlimited',
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