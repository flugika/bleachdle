// src/features/silhouette/components/daily/__tests__/DailySilhouetteWrapper.test.tsx
// pnpm --prefix client test src/features/silhouette/components/daily/__tests__/DailySilhouetteWrapper.test.tsx
//
// Senior review notes (read before touching this file):
//
//   1. Real flow under test: `DailySilhouetteWrapper` → `useSilhouetteGame`
//      (daily store, built by the REAL `createDailyGuessGameStore` — no
//      `revealedCount` derived counter here, unlike Emoji; Silhouette's
//      reveal is a pure function of `guesses.length` computed inside
//      `SilhouetteImage`/`getRevealedCellIndices`, not store state) →
//      `<SilhouetteControlPanel />` (REAL component, source provided) →
//      `<SearchBar />` (REAL component, source provided). Same rationale as
//      the Emoji daily test: these two are never stubbed because the whole
//      point of this suite is to exercise the actual store <-> panel <->
//      search-bar wiring.
//
//   2. `SilhouetteImage` has REAL source, but its internals do async
//      `new window.Image()` loading (`onload`/`onerror` races) purely for
//      a loading-shimmer UX layer that has nothing to do with game logic,
//      plus it reads `getRevealedCellIndices` which depends on
//      `silhouette-cells.json` fixture data we don't have here. Stubbing it
//      avoids both an unnecessary flake source and a fixture we can't
//      fabricate faithfully. The stub renders `{guessCount} WRONG GUESSES`
//      directly from the REAL `guessCount` prop `SilhouetteControlPanel`
//      passes in (`game.guesses.length`), so a regression in the real
//      addGuess/compareBinaryGuess wiring still fails this test — we're
//      just not re-testing the grid-cell math (that belongs in a unit test
//      of `silhouette.ts` directly, not a component integration test).
//
//   3. `SilhouetteSummaryGuess` has REAL source this round (along with its
//      entire `shared/ui/summary/*` subtree: SummaryCardShell, SummaryHeader,
//      TierBadgeCard, NarrativeFlavorText, StreakStatsGrid,
//      SummaryActionButton, IdentificationHistoryPanel). However it also
//      pulls in `useCharacterTier` (badge-tier hook, internals NOT
//      provided) and `DailyResetTimer` (NOT provided). Rather than stub the
//      whole summary component (which would hide real regressions in the
//      shared summary subtree we DO have), we stub only those two leaf
//      dependencies:
//        - `useCharacterTier` → fixed tier object so `TierBadgeCard` /
//          `NarrativeFlavorText` render deterministically.
//        - `DailyResetTimer` → null (daily-only countdown chrome).
//      This means the REAL `SilhouetteSummaryGuess` renders, and we assert
//      on its REAL hardcoded subtitle strings ("VISUAL SPECTRUM TRACED
//      SUCCESSFULLY" / "TARGET IDENTITY DISRUPTED", confirmed straight out
//      of the provided source) and the REAL `SummaryActionButton` — which,
//      per its own source, renders NOTHING in daily mode (`mode !==
//      'unlimited' → return null`). That "no restart CTA in daily" behavior
//      is itself asserted below since it's real, provided, testable logic.
//
//   4. `SilhouetteGuessTable` has REAL source this round too (framer-motion
//      driven dossier cards). It renders `id={`silhouette-row-${entry.guess.id}`}`,
//      which is the exact id `SearchBar`'s `rowIdPrefix="silhouette-row"`
//      scroll/shake logic depends on — kept real specifically to prove that
//      wiring end-to-end. `next/image` and `framer-motion` are assumed
//      already globally mocked/shimmed by the project's vitest setup (same
//      assumption the Emoji suite made about `next/image` inside
//      `EmojiTestimonyDisplay`/`SearchBar`).
//
//   5. `MAX_DAILY_SILHOUETTE_GUESSES` is not defined in any provided source
//      file. ASSUMED to be 8 for this test file (flagged at the mock below,
//      same disclaimer pattern as Emoji's assumed `MAX_DAILY_EMOJI_GUESSES`).
//      If the real constant differs, the loss-path test's guess count must
//      match it exactly or that test will hang waiting for `isGameOver`.
//
//   6. `createDailyGuessGameStore`, `compareBinaryGuess`, and
//      `getRevealedCellIndices`-adjacent logic (indirectly, via the real
//      `guesses` array) are used FOR REAL — that's the logic this suite
//      exists to protect. Only I/O boundaries (character lookups, stats
//      recording, layout chrome, the two leaf deps named in note 3) are
//      mocked.
//
//   7. FEATURE_FLAGS.daily.silhouette is assumed `true` for these tests.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DailySilhouetteWrapper from '@/src/features/silhouette/components/daily/DailySilhouetteWrapper';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { Character } from '@/src/entities/character/schema';
import { SilhouetteTargetHidden } from '@/src/features/silhouette/types';
import { useSilhouetteGame } from '../../../hooks/daily/useSilhouetteGame';

// ── Fixtures ────────────────────────────────────────────────────────────────
const ICHIGO: Character = {
    id: 'ichigo', name: 'Ichigo Kurosaki', gender: 'Male',
    race: ['Shinigami', 'Hollow', 'Human'], affiliation: 'Independent',
    height_cm: 181, age: 19, eye_color: 'Brown', hair_color: 'Orange',
    first_appearance_chapter: 'Agent of the Shinigami', weapon: ['Weaponized'],
    release: ['Shikai', 'Bankai'], primary_ability: ['Physical'], image: 'ichigo.webp',
} as unknown as Character;
const RUKIA: Character = {
    id: 'rukia', name: 'Rukia Kuchiki', gender: 'Female',
    race: ['Shinigami'], affiliation: 'Gotei 13',
    height_cm: 144, age: 150, eye_color: 'Violet', hair_color: 'Black',
    first_appearance_chapter: 'Agent of the Shinigami', weapon: ['Weaponized'],
    release: ['Shikai'], primary_ability: ['Physical'], image: 'rukia.webp',
} as unknown as Character;
const ISHIDA: Character = {
    id: 'ishida', name: 'Uryu Ishida', gender: 'Male',
    race: ['Quincy'], affiliation: 'Independent',
    height_cm: 177, age: 17, eye_color: 'Blue', hair_color: 'Black',
    first_appearance_chapter: 'Agent of the Shinigami', weapon: ['Weaponized'],
    release: ['Vollstandig'], primary_ability: ['Kido'], image: 'ishida.webp',
} as unknown as Character;
const ORIHIME: Character = {
    id: 'orihime', name: 'Orihime Inoue', gender: 'Female',
    race: ['Human'], affiliation: 'Independent',
    height_cm: 160, age: 16, eye_color: 'Grey', hair_color: 'Orange',
    first_appearance_chapter: 'Agent of the Shinigami', weapon: ['Weaponized'],
    release: [], primary_ability: ['Healing'], image: 'orihime.webp',
} as unknown as Character;
const CHAD: Character = {
    id: 'chad', name: 'Yasutora Sado', gender: 'Male',
    race: ['Human'], affiliation: 'Independent',
    height_cm: 192, age: 19, eye_color: 'Brown', hair_color: 'Brown',
    first_appearance_chapter: 'Agent of the Shinigami', weapon: [],
    release: [], primary_ability: ['Physical'], image: 'chad.webp',
} as unknown as Character;
const RENJI: Character = {
    id: 'renji', name: 'Renji Abarai', gender: 'Male',
    race: ['Shinigami'], affiliation: 'Gotei 13',
    height_cm: 188, age: 27, eye_color: 'Brown', hair_color: 'Red',
    first_appearance_chapter: 'Soul Society Arc', weapon: ['Weaponized'],
    release: ['Shikai', 'Bankai'], primary_ability: ['Physical'], image: 'renji.webp',
} as unknown as Character;
const URYU_2: Character = {
    id: 'ishida-2', name: 'Sosuke Aizen', gender: 'Male',
    race: ['Shinigami'], affiliation: 'Espada',
    height_cm: 186, age: 200, eye_color: 'Brown', hair_color: 'Brown',
    first_appearance_chapter: 'Soul Society Arc', weapon: ['Weaponized'],
    release: ['Shikai'], primary_ability: ['Kido'], image: 'aizen.webp',
} as unknown as Character;
const KISUKE: Character = {
    id: 'kisuke', name: 'Kisuke Urahara', gender: 'Male',
    race: ['Shinigami'], affiliation: 'Independent',
    height_cm: 177, age: 200, eye_color: 'Grey', hair_color: 'Blonde',
    first_appearance_chapter: 'Soul Society Arc', weapon: ['Weaponized'],
    release: ['Shikai', 'Bankai'], primary_ability: ['Kido'], image: 'kisuke.webp',
} as unknown as Character;
const YORUICHI: Character = {
    id: 'yoruichi', name: 'Yoruichi Shihoin', gender: 'Female',
    race: ['Shinigami'], affiliation: 'Independent',
    height_cm: 167, age: 200, eye_color: 'Amber', hair_color: 'Purple',
    first_appearance_chapter: 'Soul Society Arc', weapon: [],
    release: [], primary_ability: ['Physical'], image: 'yoruichi.webp',
} as unknown as Character;
const ALL: Character[] = [ICHIGO, RUKIA, ISHIDA, ORIHIME, CHAD, RENJI, URYU_2, KISUKE, YORUICHI];

// Target fixture — HIDDEN shape { id, character_id } only, matching
// `SilhouetteTargetHidden` from src/features/silhouette/types.ts. `image`
// is included since `SilhouetteControlPanel` forwards it straight into the
// (stubbed) `SilhouetteImage`.
const ICHIGO_SILHOUETTE: SilhouetteTargetHidden & { image: string } = {
    id: 'silhouette-ichigo', character_id: ICHIGO.id, image: 'ichigo_cutout.webp',
};

vi.mock('@/src/features/character/character', () => ({
    getCharacters: () => ALL,
    getCharacterById: (id: string) => ALL.find((c) => c.id === id),
}));

const recordDailyStat = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/services/statsClient', () => ({
    recordDailyStat: (...args: unknown[]) => recordDailyStat(...args),
}));

// ⚠️ ASSUMED value — not defined in any provided source file. Adjust if the
// real constant in `src/const/guess.ts` differs, or the loss-path test below
// will guess the wrong number of times and never reach `isGameOver`.
vi.mock('@/src/const/guess', () => ({
    MAX_DAILY_SILHOUETTE_GUESSES: 8,
    MAX_UNLIMITED_SILHOUETTE_GUESSES: 12,
    INITIAL_REVEAL_SILHOUETTE: 8,
}));

// Layout/nav chrome — irrelevant to game logic.
vi.mock('@/src/shared/ui/layout/Header', () => ({ Header: () => null }));
vi.mock('@/src/shared/ui/layout/Divider', () => ({ Divider: () => null }));
vi.mock('@/src/shared/ui/layout/SubHeader', () => ({ SubHeader: () => null }));
vi.mock('@/src/shared/ui/Sealed', () => ({ default: () => <div>Sealed</div> }));
vi.mock('@/src/shared/ui/game-selector/ModeBadge', () => ({ ModeBadge: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeSelectorModal', () => ({ ModeSelectorModal: () => null }));
vi.mock('@/src/shared/ui/daily-hub/DailyHubModalFooter', () => ({ DailyHubModalFooter: () => null }));
vi.mock('@/src/shared/ui/Legend', () => ({ Legend: () => null }));
vi.mock('@/src/shared/ui/DailyResetTimer', () => ({ DailyResetTimer: () => null }));
vi.mock('../../shared/SilhouetteHowToPlayModal', () => ({
    SilhouetteHowToPlayModal: () => null,
}));
vi.mock('@/src/shared/ui/context/NavigationContext', () => ({
    useSenkaimon: () => ({ navigate: vi.fn(), state: 'idle', reportReady: vi.fn() }),
}));
vi.mock('@/src/shared/hooks/useDailyHub', () => ({
    useDailyHub: () => ({ markModePlayed: vi.fn() }),
}));
vi.mock('@/src/config/feature.flags', () => ({ FEATURE_FLAGS: { daily: { silhouette: true } } }));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// Badge-tier hook: internals (useBadgeTier) NOT provided — stub to a fixed
// tier so TierBadgeCard/NarrativeFlavorText render deterministically. This
// lets the REAL SilhouetteSummaryGuess + shared summary subtree render.
vi.mock('@/src/shared/hooks/useBadgeTier', () => ({
    useCharacterTier: () => ({
        kanji: '卍', color: '#c8a96e', badge: 'Test Rank', sub: 'TEST-SUB',
        flavor: 'A test flavor line.',
    }),
}));

// SilhouetteImage: REAL source does async window.Image() loading + reads
// silhouette-cells.json fixture data we don't have — stub reproduces just
// the REAL `guessCount` prop (sourced from the REAL store's `guesses.length`)
// so this test can assert on real addGuess wiring without depending on grid
// cell math (that belongs in a silhouette.ts unit test, not here).
vi.mock('../../shared/SilhouetteImage', () => ({
    SilhouetteImage: ({ guessCount }: { guessCount: number }) => (
        <div>{guessCount} WRONG GUESSES</div>
    ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
async function selectCharacter(name: string) {
    const input = screen.getByPlaceholderText('ENTER SOUL NAME...');
    fireEvent.change(input, { target: { value: name } });
    fireEvent.focus(input);

    // SearchBar's dropdown is a portal <ul>/<li> — no testid, select by text.
    const option = await screen.findByText(name);
    fireEvent.mouseDown(option);
}

beforeEach(() => {
    localStorage.clear();
    recordDailyStat.mockClear();

    // 1. Reset the singleton Zustand store state to prevent cross-test leakage
    useSilhouetteGame.getState().resetGame();

    // 2. Mock jsdom-missing window layout/scroll functions
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
});

describe('DailySilhouetteWrapper (daily mode) — real component integration', () => {
    it("renders the search input once hydrated, with today's target wired in", async () => {
        render(<DailySilhouetteWrapper initialTarget={ICHIGO_SILHOUETTE} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER SOUL NAME...')).toBeInTheDocument();
        });

        // Real SilhouetteImage stub should show 0 wrong guesses at round start —
        // proves the REAL `guesses.length` (0) flowed through the REAL store.
        await waitFor(() => {
            expect(screen.getByText('0 WRONG GUESSES')).toBeInTheDocument();
        });
    });

    it('reveals one more grid cell (guessCount+1) per wrong guess, then a correct guess ends the game', async () => {
        render(<DailySilhouetteWrapper initialTarget={ICHIGO_SILHOUETTE} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        // Wrong guess #1
        await selectCharacter('Rukia Kuchiki');
        await waitFor(() => {
            expect(document.getElementById(`silhouette-row-${RUKIA.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('1 WRONG GUESSES')).toBeInTheDocument();

        // Wrong guess #2
        await selectCharacter('Uryu Ishida');
        await waitFor(() => {
            expect(document.getElementById(`silhouette-row-${ISHIDA.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('2 WRONG GUESSES')).toBeInTheDocument();

        // Winning guess: Ichigo (the target, resolved via target.character_id)
        await selectCharacter('Ichigo Kurosaki');

        await waitFor(() => {
            expect(screen.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeInTheDocument();
        }, { timeout: 3500 }); // real 1600ms win reveal-delay setTimeout in DailySilhouetteWrapper

        // Daily mode never renders the "OPEN SENKAIMON" restart CTA — real
        // behavior from SummaryActionButton.tsx (`mode !== 'unlimited' → null`).
        expect(screen.queryByRole('button', { name: /OPEN SENKAIMON/i })).not.toBeInTheDocument();

        await waitFor(() => {
            expect(recordDailyStat).toHaveBeenCalledWith('silhouette', true, 3);
        });
    });

    it('ends the round as a loss once guesses are exhausted, and reveals the answer name in the summary', async () => {
        render(<DailySilhouetteWrapper initialTarget={ICHIGO_SILHOUETTE} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        // ⚠️ Consumes exactly MAX_DAILY_SILHOUETTE_GUESSES (assumed 8) distinct
        // wrong guesses — SearchBar no-ops on re-selecting an already-guessed
        // character, so this must be 8 genuinely different characters, not a
        // repeat, or the round will never reach isGameOver.
        const wrongCharacters = [RUKIA, ISHIDA, ORIHIME, CHAD, RENJI, URYU_2, KISUKE, YORUICHI];
        expect(wrongCharacters).toHaveLength(8);

        for (const wrongCharacter of wrongCharacters) {
            await selectCharacter(wrongCharacter.name);
            await waitFor(() => {
                expect(document.getElementById(`silhouette-row-${wrongCharacter.id}`)).toBeInTheDocument();
            });
        }

        await waitFor(() => {
            expect(screen.getByText('TARGET IDENTITY DISRUPTED')).toBeInTheDocument();
        }, { timeout: 3500 }); // real 900ms loss reveal-delay setTimeout

        // Loss still reveals the true answer's name (see createDailyGuessGameStore's
        // "reveal on both win and loss" fix, `resolveAnswerId` -> getCharacterById).
        // NOTE: SilhouetteSummaryGuess renders the name with a CSS `uppercase`
        // class, but that's a visual transform only — the actual DOM text node
        // keeps its original casing, so assert on "Ichigo Kurosaki", not the
        // visually-rendered "ICHIGO KUROSAKI" (a common false-assertion trap).
        expect(screen.getByText('Ichigo Kurosaki')).toBeInTheDocument();

        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
        expect(completed.daily ?? []).toEqual([]);
    });

    it('persists guesses across remounts via localStorage hydration', async () => {
        const { unmount } = render(<DailySilhouetteWrapper initialTarget={ICHIGO_SILHOUETTE} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        await selectCharacter('Rukia Kuchiki');
        await selectCharacter('Uryu Ishida');
        await waitFor(() => {
            expect(screen.getByText('2 WRONG GUESSES')).toBeInTheDocument();
        });

        unmount();

        render(<DailySilhouetteWrapper initialTarget={ICHIGO_SILHOUETTE} />);
        await waitFor(() => {
            expect(document.getElementById(`silhouette-row-${RUKIA.id}`)).toBeInTheDocument();
            expect(document.getElementById(`silhouette-row-${ISHIDA.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('2 WRONG GUESSES')).toBeInTheDocument();
    });

    it('shows the daily lockout summary immediately when the day is already completed', async () => {
        // Seed a finished game directly into the persisted store shape.
        localStorage.setItem(
            STORAGE_KEYS.SILHOUETTE_PROGRESS,
            JSON.stringify({
                daily: {
                    state: {
                        guesses: [{ guess: ICHIGO, status: 'correct', isNew: false }],
                        target: { id: ICHIGO_SILHOUETTE.id, character_id: ICHIGO_SILHOUETTE.character_id },
                        revealedCharacter: ICHIGO,
                        hasFinalized: true,
                    },
                    version: 0,
                },
            })
        );

        // 🌟 FORCE REHYDRATION: Force the global Zustand store to ingest the localStorage seed
        useSilhouetteGame.persist.rehydrate();

        render(<DailySilhouetteWrapper initialTarget={ICHIGO_SILHOUETTE} />);

        await waitFor(() => {
            expect(screen.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeInTheDocument();
        });

        // Search input should not be present once the game is locked out.
        expect(screen.queryByPlaceholderText('ENTER SOUL NAME...')).not.toBeInTheDocument();
    });
});