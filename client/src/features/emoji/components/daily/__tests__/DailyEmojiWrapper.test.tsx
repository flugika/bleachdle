// src/features/emoji/components/daily/__tests__/DailyEmojiWrapper.test.tsx
// pnpm --prefix client test src/features/emoji/components/daily/__tests__/DailyEmojiWrapper.test.tsx
//
// Senior review notes (read before touching this file):
//
//   1. Real flow under test: `DailyEmojiWrapper` → `useEmojiGame` (daily store,
//      built by `createDailyGuessGameStore` with an extra `revealedCount`
//      derived counter) → `<EmojiControlPanel />` (REAL component, imported
//      as-is) → `<SearchBar />` (REAL component, imported as-is). We do NOT
//      stub these two — their source was provided and the whole point of
//      this test is to exercise the actual wiring between the store, the
//      control panel, and the search bar, the same way
//      `DailyCharacterWrapper.test.tsx` keeps `SearchBar` real.
//
//   2. `EmojiGuessTable`, `EmojiSummaryGuess`, and `EmojiTestimonyDisplay`
//      have UNKNOWN internals (not provided in full) or pull in a deep
//      subtree of shared/ui components (SummaryCardShell, TierBadgeCard,
//      useRaceEmblem, useBadgeTier, etc.) that also weren't provided. Per
//      the same senior pattern used for `CharacterSummaryGuess`, these are
//      stubbed to dumb pass-throughs — EXCEPT the stubs still assert on
//      strings/props that live directly in the real source we DO have:
//        - `EmojiSummaryGuess.tsx` hardcodes the subtitle strings
//          "Symbol Set Traced to Registered Soul" / "Symbol Set Left
//          Unattributed" based on `isWin` — the stub reproduces exactly
//          that branch, so a regression in what `isWin` gets passed down
//          still fails this test.
//        - `EmojiTestimonyDisplay` is stubbed to render `revealedCount` as
//          "`${revealedCount} / 4 UNSEALED`", matching the on-screen copy
//          confirmed via screenshot ("1 / 4 UNSEALED" etc). This lets the
//          test assert on the REAL `revealedCounter` derived-counter logic
//          (imported for real, not mocked) without needing the actual
//          dossier-card markup.
//
//   3. `MAX_DAILY_EMOJI_GUESSES` is not defined anywhere in the files
//      provided — its value is ASSUMED to be 6 for this test file (flagged
//      below at the mock). If the real constant differs, the loss-path
//      test's guess count needs to match it exactly, or that test will
//      hang waiting for `isGameOver`.
//
//   4. `revealedCounter`, `compareBinaryGuess`, and `createDailyGuessGameStore`
//      are used FOR REAL (not mocked) — they're the actual logic this test
//      exists to protect. Only I/O boundaries (localStorage keys already
//      covered by jsdom, character lookups, stats recording, layout chrome)
//      are mocked.
//
//   5. FEATURE_FLAGS.daily.emoji is assumed `true` for these tests.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DailyEmojiWrapper from '@/src/features/emoji/components/daily/DailyEmojiWrapper';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { Character } from '@/src/entities/character/schema';
import { EmojiTargetHidden } from '@/src/features/emoji/types';
import { useEmojiGame } from '../../../hooks/daily/useEmojiGame';

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

// Emoji set fixture — target is the HIDDEN shape { id, character_id } only,
// matching `EmojiTargetHidden` from src/features/emoji/types.ts.
const ICHIGO_SET: EmojiTargetHidden & { emoji_list: string[] } = {
    id: 'set-ichigo', character_id: ICHIGO.id, emoji_list: ['🍓', '⚔️', '🧡', '👹'],
};

vi.mock('@/src/features/character/character', () => ({
    getCharacters: () => ALL,
    getCharacterById: (id: string) => ALL.find((c) => c.id === id),
}));

// Covers both `getEmojiSets` (used directly by DailyEmojiWrapper) and
// `getEmojiGuessableCharacters` (used inside the REAL EmojiControlPanel).
vi.mock('@/src/features/emoji/emoji', () => ({
    getEmojiSets: () => [ICHIGO_SET],
    getEmojiGuessableCharacters: () => ALL,
    getEmojiSetById: (id: string) => [ICHIGO_SET].find((s) => s.id === id),
}));

const recordDailyStat = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/services/statsClient', () => ({
    recordDailyStat: (...args: unknown[]) => recordDailyStat(...args),
}));

// ⚠️ ASSUMED value — not defined in any provided source file. Adjust if the
// real constant in `src/const/guess.ts` differs, or the loss-path test below
// will guess the wrong number of times and never reach `isGameOver`.
vi.mock('@/src/const/guess', () => ({
    MAX_DAILY_EMOJI_GUESSES: 6,
    MAX_UNLIMITED_EMOJI_GUESSES: 10,
}));

// Layout/nav chrome — irrelevant to game logic, stub to keep this a focused
// integration test of the actual game wiring (same rationale as the
// character-mode test this file is modeled after).
vi.mock('@/src/shared/ui/layout/Header', () => ({ Header: () => null }));
vi.mock('@/src/shared/ui/layout/Divider', () => ({ Divider: () => null }));
vi.mock('@/src/shared/ui/layout/SubHeader', () => ({ SubHeader: () => null }));
vi.mock('@/src/shared/ui/Sealed', () => ({ default: () => <div>Sealed</div> }));
vi.mock('@/src/shared/ui/game-selector/ModeBadge', () => ({ ModeBadge: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeSelectorModal', () => ({ ModeSelectorModal: () => null }));
vi.mock('@/src/shared/ui/daily-hub/DailyHubModalFooter', () => ({ DailyHubModalFooter: () => null }));
vi.mock('@/src/shared/ui/Legend', () => ({ Legend: () => null }));
vi.mock('@/src/features/emoji/components/shared/EmojiHowToPlayModal', () => ({
    EmojiHowToPlayModal: () => null,
}));
vi.mock('@/src/shared/ui/context/NavigationContext', () => ({
    useSenkaimon: () => ({ navigate: vi.fn(), state: 'idle', reportReady: vi.fn() }),
}));
vi.mock('@/src/shared/hooks/useDailyHub', () => ({
    useDailyHub: () => ({ markModePlayed: vi.fn() }),
}));
vi.mock('@/src/config/feature.flags', () => ({ FEATURE_FLAGS: { daily: { emoji: true } } }));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// Guess table: UNKNOWN internals — stub to a `<div>` per guess row, matching
// the id convention `emoji-row-${guess.id}` that `EmojiControlPanel` wires
// into `<SearchBar rowIdPrefix="emoji-row" />` (real component, real prop).
vi.mock('@/src/features/emoji/components/shared/EmojiGuessTable', () => ({
    EmojiGuessTable: ({ guesses }: { guesses: { guess: { id: string } }[] }) => (
        <div data-testid="guess-table">
            {guesses.map((g) => (
                <div key={g.guess.id} id={`emoji-row-${g.guess.id}`} />
            ))}
        </div>
    ),
}));

// Dossier card: UNKNOWN internals — stub reproduces just the "`X / 4
// UNSEALED`" readout confirmed via screenshot, so the test can assert on the
// REAL `revealedCount` value produced by the REAL `revealedCounter` logic.
vi.mock('@/src/features/emoji/components/shared/EmojiTestimonyDisplay', () => ({
    EmojiTestimonyDisplay: ({ revealedCount }: { revealedCount: number }) => (
        <div>{revealedCount} / 4 UNSEALED</div>
    ),
}));

// Summary screen: real component has a deep unknown subtree (SummaryCardShell,
// TierBadgeCard, useRaceEmblem, useBadgeTier, etc.) — assert only on the
// strings that live in `EmojiSummaryGuess.tsx` itself (its own `subtitle`
// branch), so this test still catches a real wiring regression (wrong
// `isWin` passed down) without depending on unseen children.
vi.mock('@/src/features/emoji/components/shared/EmojiSummaryGuess', () => ({
    EmojiSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Symbol Set Traced to Registered Soul' : 'Symbol Set Left Unattributed'}</p>
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

    // 1. Reset the singleton Zustand store state to prevent cross-test leakage
    useEmojiGame.getState().resetGame();

    // 2. Mock jsdom-missing window layout/scroll functions
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
});

describe('DailyEmojiWrapper (daily mode) — real component integration', () => {
    it("renders the search input once hydrated, with today's target wired in", async () => {
        render(<DailyEmojiWrapper initialTarget={ICHIGO_SET} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER SOUL NAME...')).toBeInTheDocument();
        });

        // Real dossier stub should show the initial unseal state (1/4) —
        // proves `revealedCounter.initial` flowed through the REAL store.
        await waitFor(() => {
            expect(screen.getByText('1 / 4 UNSEALED')).toBeInTheDocument();
        });
    });

    it('unseals one more symbol every 2 wrong guesses, then a correct guess ends the game', async () => {
        render(<DailyEmojiWrapper initialTarget={ICHIGO_SET} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        // Wrong guess #1 — still 1/4 (needs 2 wrong guesses per reveal)
        await selectCharacter('Rukia Kuchiki');
        await waitFor(() => {
            expect(document.getElementById(`emoji-row-${RUKIA.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('1 / 4 UNSEALED')).toBeInTheDocument();

        // Wrong guess #2 — floor(2/2) = 1 extra reveal -> 2/4
        await selectCharacter('Uryu Ishida');
        await waitFor(() => {
            expect(document.getElementById(`emoji-row-${ISHIDA.id}`)).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('2 / 4 UNSEALED')).toBeInTheDocument();
        });

        // Winning guess: Ichigo (the target, resolved via target.character_id)
        await selectCharacter('Ichigo Kurosaki');

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        }, { timeout: 3500 }); // real 2500ms reveal-delay setTimeout in DailyEmojiWrapper
        expect(screen.getByText('Symbol Set Traced to Registered Soul')).toBeInTheDocument();

        // finalizeGame forces revealedCount to TOTAL_EMOJI_COUNT regardless of
        // win/loss (see emojiRevealedCounter.ts finalizeValue) — assert that
        // too via recordDailyStat's guess-count argument (3 guesses total).
        await waitFor(() => {
            expect(recordDailyStat).toHaveBeenCalledWith('emoji', true, 3);
        });
    });

    it('reaches the 4-symbol cap and does not overflow past it on further wrong guesses', async () => {
        render(<DailyEmojiWrapper initialTarget={ICHIGO_SET} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        // 4 wrong guesses -> floor(4/2) = 2 extra reveals -> 1 + 2 = 3/4
        await selectCharacter('Rukia Kuchiki');
        await selectCharacter('Uryu Ishida');
        await selectCharacter('Orihime Inoue');
        await selectCharacter('Yasutora Sado');

        await waitFor(() => {
            expect(screen.getByText('3 / 4 UNSEALED')).toBeInTheDocument();
        });

        // 5th wrong guess (odd count) -> still floor(5/2) = 2 -> stays 3/4
        await selectCharacter('Renji Abarai');
        await waitFor(() => {
            expect(document.getElementById(`emoji-row-${RENJI.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('3 / 4 UNSEALED')).toBeInTheDocument();
    });

    it('persists guesses and the revealed-symbol count across remounts via localStorage hydration', async () => {
        const { unmount } = render(<DailyEmojiWrapper initialTarget={ICHIGO_SET} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        await selectCharacter('Rukia Kuchiki');
        await selectCharacter('Uryu Ishida');
        await waitFor(() => {
            expect(screen.getByText('2 / 4 UNSEALED')).toBeInTheDocument();
        });

        unmount();

        render(<DailyEmojiWrapper initialTarget={ICHIGO_SET} />);
        await waitFor(() => {
            expect(document.getElementById(`emoji-row-${RUKIA.id}`)).toBeInTheDocument();
            expect(document.getElementById(`emoji-row-${ISHIDA.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('2 / 4 UNSEALED')).toBeInTheDocument();
    });

    it('shows the daily lockout summary immediately when the day is already completed', async () => {
        // Seed a finished game directly into the persisted store shape
        localStorage.setItem(
            STORAGE_KEYS.EMOJI_PROGRESS,
            JSON.stringify({
                daily: {
                    state: {
                        guesses: [{ guess: ICHIGO, status: 'correct', isNew: false }],
                        target: { id: ICHIGO_SET.id, character_id: ICHIGO_SET.character_id },
                        revealedCharacter: ICHIGO,
                        revealedCount: 4,
                        hasFinalized: true,
                    },
                    version: 0,
                },
            })
        );

        // 🌟 FORCE REHYDRATION: Force the global Zustand store to ingest the localStorage seed
        useEmojiGame.persist.rehydrate();

        render(<DailyEmojiWrapper initialTarget={ICHIGO_SET} />);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });

        // Search input should not be present once the game is locked out.
        expect(screen.queryByPlaceholderText('ENTER SOUL NAME...')).not.toBeInTheDocument();
    });
});