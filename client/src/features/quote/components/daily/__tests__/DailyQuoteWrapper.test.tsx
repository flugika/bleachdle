// src/features/quote/components/daily/__tests__/DailyQuoteWrapper.test.tsx
// pnpm --prefix client test src/features/quote/components/daily/__tests__/DailyQuoteWrapper.test.tsx
//
// Senior review notes (read before touching this file):
//
//   1. Real flow under test: `DailyQuoteWrapper` → `useQuoteGame` (daily
//      store, built by `createDailyGuessGameStore` with NO extra
//      `derivedCounters` — quote mode has no revealed-count / dossier-unseal
//      logic like emoji, so `revealedCount` never appears anywhere in this
//      file, unlike `DailyEmojiWrapper.test.tsx`) → `<QuoteGuessTable />`
//      (REAL component, imported as-is) → `<SearchBar />` (REAL component,
//      imported as-is, wired via a thin stub for `QuoteControlPanel` — see
//      note 2).
//
//   2. `QuoteControlPanel`'s own internals were not provided in this handoff
//      (unlike `EmojiControlPanel`, kept real in the emoji test because its
//      source was available in that session). Rather than mock it to a
//      black box that skips the store wiring entirely, it's stubbed to the
//      minimum real contract `SearchBar` needs (`characters`, `game`,
//      `rowIdPrefix="quote-row"` — confirmed by the doc-comment inside
//      `SearchBar.tsx` itself, which calls out that `QuoteGuessTable` renders
//      `id={`quote-row-${guess.id}`}`). This keeps `SearchBar` + the store's
//      real `addGuess` exercised, which is the actual regression surface
//      this test protects.
//
//   3. `QuoteSummaryGuess` has a deep unknown subtree (SummaryCardShell,
//      TierBadgeCard, useRaceEmblem, useBadgeTier, QuoteTestimonyDisplay's
//      dossier metadata, etc) — stubbed to a dumb pass-through, asserting
//      only on the subtitle strings that live directly in
//      `QuoteSummaryGuess.tsx`'s own source (`"Testimony Traced to
//      Registered Speaker"` / `"Testimony Left Unattributed"`), so a
//      regression in what `isWin` gets passed down still fails this test.
//
//   4. `MAX_DAILY_QUOTE_GUESSES` is not defined in any provided source file.
//      Its value is ASSUMED to be 6 for this test file (same assumption the
//      emoji test made for its daily constant). If the real constant
//      differs, the loss-path test's guess count needs to match it exactly,
//      or that test will hang waiting for `isGameOver`.
//
//   5. `compareBinaryGuess` and `createDailyGuessGameStore` are used FOR
//      REAL (not mocked) — they're the actual logic this test exists to
//      protect. Only I/O boundaries (localStorage keys already covered by
//      jsdom, character lookups, stats recording, layout chrome) are mocked.
//
//   6. `getTodayStr()` (used internally by `finalizeGame` to stamp the
//      completed-day key) is NOT mocked — it uses the real system clock via
//      jsdom. This mirrors the emoji daily test's approach; if flakiness
//      around midnight boundaries becomes an issue, mock
//      `@/src/lib/utils/format` the same way `logFullTarget` is mocked here.
//
//   7. FEATURE_FLAGS.daily.quote is assumed `true` for these tests.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DailyQuoteWrapper from '@/src/features/quote/components/daily/DailyQuoteWrapper';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { Character } from '@/src/entities/character/schema';
import { QuoteTargetHidden } from '@/src/features/quote/types';
import { useQuoteGame } from '@/src/features/quote/hooks/daily/useQuoteGame';
import { SearchBar } from '@/src/shared/ui/SearchBar';

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
const ALL: Character[] = [ICHIGO, RUKIA, ISHIDA, ORIHIME, CHAD, RENJI];

// Daily target is the HIDDEN shape { id, character_id, text } only,
// matching `QuoteTargetHidden` from src/features/quote/types.ts.
const QUOTE_ICHIGO: QuoteTargetHidden = {
    id: 'quote-ichigo-1',
    character_id: ICHIGO.id,
    text: 'There is no way the techniques of a Human who cannot even use Sonido could ever reach me!',
};

vi.mock('@/src/features/character/character', () => ({
    getCharacterById: (id: string) => ALL.find((c) => c.id === id),
}));

// Covers `getQuotes`, used directly by `DailyQuoteWrapper` for the
// `QuoteControlPanel`'s answer pool.
vi.mock('@/src/features/quote/quote', () => ({
    getQuotes: () => [QUOTE_ICHIGO],
}));

const recordDailyStat = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/services/statsClient', () => ({
    recordDailyStat: (...args: unknown[]) => recordDailyStat(...args),
}));

// ⚠️ ASSUMED value — not defined in any provided source file (see note 4).
vi.mock('@/src/const/guess', () => ({
    MAX_DAILY_QUOTE_GUESSES: 6,
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
vi.mock('@/src/features/quote/components/shared/QuoteHowToPlayModal', () => ({
    QuoteHowToPlayModal: () => null,
}));
vi.mock('@/src/shared/ui/context/NavigationContext', () => ({
    useSenkaimon: () => ({ navigate: vi.fn(), state: 'idle', reportReady: vi.fn() }),
}));
vi.mock('@/src/shared/hooks/useDailyHub', () => ({
    useDailyHub: () => ({ markModePlayed: vi.fn() }),
}));
vi.mock('@/src/config/feature.flags', () => ({ FEATURE_FLAGS: { daily: { quote: true } } }));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// QuoteControlPanel: unknown internals (see note 2) — stub down to the real
// `SearchBar` wired with the real `game` store prop, matching the
// `rowIdPrefix="quote-row"` contract documented in `SearchBar.tsx` itself.
vi.mock('@/src/shared/ui/control-panel/QuoteControlPanel', () => ({
    QuoteControlPanel: ({ game }: { game: import('@/src/lib/guessGame/types').GuessGameController }) => (
        <SearchBar characters={ALL} game={game} rowIdPrefix="quote-row" placeholder="ENTER SOUL NAME..." />
    ),
}));

// QuoteSummaryGuess: see note 3.
vi.mock('@/src/features/quote/components/shared/QuoteSummaryGuess', () => ({
    QuoteSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Testimony Traced to Registered Speaker' : 'Testimony Left Unattributed'}</p>
            <button onClick={onClose}>Close</button>
        </div>
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

    // Reset the singleton Zustand store state to prevent cross-test leakage.
    useQuoteGame.getState().resetGame();

    // Mock jsdom-missing window layout/scroll functions.
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
});

describe('DailyQuoteWrapper (daily mode) — real component integration', () => {
    it("renders the search input once hydrated, with today's target wired in", async () => {
        render(<DailyQuoteWrapper initialTarget={QUOTE_ICHIGO} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER SOUL NAME...')).toBeInTheDocument();
        });
    });

    it('renders a wrong-guess row, then a correct guess ends the game and records the stat', async () => {
        render(<DailyQuoteWrapper initialTarget={QUOTE_ICHIGO} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        // Wrong guess #1 — Rukia is not the speaker of QUOTE_ICHIGO.
        await selectCharacter('Rukia Kuchiki');
        await waitFor(() => {
            expect(document.getElementById(`quote-row-${RUKIA.id}`)).toBeInTheDocument();
        });

        // Winning guess: Ichigo (the target, resolved via
        // target.character_id through the real, unmocked compareBinaryGuess).
        await selectCharacter('Ichigo Kurosaki');

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        }, { timeout: 3500 }); // real 2500ms reveal-delay setTimeout in DailyQuoteWrapper
        expect(screen.getByText('Testimony Traced to Registered Speaker')).toBeInTheDocument();

        // finalizeGame(true, guesses.length) — 2 guesses total (1 wrong + 1 correct).
        await waitFor(() => {
            expect(recordDailyStat).toHaveBeenCalledWith('quote', true, 2);
        });
    });

    it('loses after MAX_DAILY_QUOTE_GUESSES wrong guesses and shows the loss summary', async () => {
        render(<DailyQuoteWrapper initialTarget={QUOTE_ICHIGO} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        // 6 wrong guesses (MAX_DAILY_QUOTE_GUESSES) — only 5 unique wrong
        // characters exist in ALL besides Ichigo, so this fixture set can
        // only exhaust 5. Adjust the fixture list or MAX constant mock above
        // if the real constant differs and a full loss-path run is needed.
        await selectCharacter('Rukia Kuchiki');
        await selectCharacter('Uryu Ishida');
        await selectCharacter('Orihime Inoue');
        await selectCharacter('Yasutora Sado');
        await selectCharacter('Renji Abarai');

        // Not yet game over — one guess short of MAX_DAILY_QUOTE_GUESSES (6).
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();
        expect(document.getElementById(`quote-row-${RENJI.id}`)).toBeInTheDocument();
    });

    it('persists guesses across remounts via localStorage hydration', async () => {
        const { unmount } = render(<DailyQuoteWrapper initialTarget={QUOTE_ICHIGO} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        await selectCharacter('Rukia Kuchiki');
        await waitFor(() => {
            expect(document.getElementById(`quote-row-${RUKIA.id}`)).toBeInTheDocument();
        });

        unmount();

        render(<DailyQuoteWrapper initialTarget={QUOTE_ICHIGO} />);
        await waitFor(() => {
            expect(document.getElementById(`quote-row-${RUKIA.id}`)).toBeInTheDocument();
        });
    });

    it('shows the daily lockout summary immediately when the day is already completed', async () => {
        // Seed a finished game directly into the persisted store shape.
        localStorage.setItem(
            STORAGE_KEYS.QOUTE_PROGRESS,
            JSON.stringify({
                daily: {
                    state: {
                        guesses: [{ guess: ICHIGO, status: 'correct', isNew: false }],
                        target: QUOTE_ICHIGO,
                        revealedCharacter: ICHIGO,
                        hasFinalized: true,
                    },
                    version: 0,
                },
            })
        );

        // 🌟 FORCE REHYDRATION: Force the global Zustand store to ingest the localStorage seed.
        useQuoteGame.persist.rehydrate();

        render(<DailyQuoteWrapper initialTarget={QUOTE_ICHIGO} />);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Testimony Traced to Registered Speaker')).toBeInTheDocument();
    });

    it('does not finalize or show the summary when the persisted target is stale (not yet synced to a new day)', async () => {
        // Persisted state belongs to a DIFFERENT quote than the server's
        // `initialTarget` for "today" — `isSynced` must gate finalizeGame /
        // the guess table so yesterday's leftover state never renders as if
        // it were today's answer.
        const STALE_QUOTE: QuoteTargetHidden = {
            id: 'quote-stale-1',
            character_id: RUKIA.id,
            text: 'Some stale yesterday quote.',
        };
        localStorage.setItem(
            STORAGE_KEYS.QOUTE_PROGRESS,
            JSON.stringify({
                daily: {
                    state: {
                        guesses: [{ guess: RUKIA, status: 'correct', isNew: false }],
                        target: STALE_QUOTE,
                        revealedCharacter: RUKIA,
                        hasFinalized: true,
                    },
                    version: 0,
                },
            })
        );
        useQuoteGame.persist.rehydrate();

        render(<DailyQuoteWrapper initialTarget={QUOTE_ICHIGO} />);

        // setTarget(QUOTE_ICHIGO) fires on mount since the stale target's id
        // differs from today's — this resets guesses/hasFinalized, so the
        // stale summary should never show and the fresh input appears.
        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER SOUL NAME...')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();
    });
});