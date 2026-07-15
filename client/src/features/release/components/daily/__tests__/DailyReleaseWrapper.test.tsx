// src/features/release/components/daily/__tests__/DailyReleaseWrapper.test.tsx
// pnpm --prefix client test src/features/release/components/daily/__tests__/DailyReleaseWrapper.test.tsx
//
// Senior review notes (read before touching this file):
//
//   1. Real flow under test: `DailyReleaseWrapper` → `useReleaseGame` (daily
//      store, built by `createDailyGuessGameStore` with `compareGuess`/
//      `resolveAnswerId` OVERRIDDEN to compare on `target.id`, not
//      `target.character_id` — see `hooks/daily/useReleaseGame.ts`) →
//      `<ReleaseControlPanel />` (REAL component, source provided) →
//      `<ReleaseSearchBar />` (REAL component, source provided). We do NOT
//      stub these two, mirroring how `DailyEmojiWrapper.test.tsx` keeps
//      `EmojiControlPanel`/`SearchBar` real — the whole point of this test
//      is to exercise the actual wiring between the store and the real
//      search UI, not just the store in isolation.
//
//   2. UNLIKE emoji mode, release mode's search bar placeholder is
//      "ENTER TECHNIQUE NAME..." (not "ENTER SOUL NAME...") and the
//      searchable field is `technique_name`, not a character name — this is
//      the "search ไม่เหมือนกัน" difference the release mode intentionally
//      has vs. emoji/character mode. `selectTechnique()` below drives guesses
//      through the real `ReleaseSearchBar` using that placeholder + the
//      `technique_name` string, and asserts on the real row-id convention
//      confirmed in `ReleaseGuessTable.tsx`'s source: `release-row-${guess.id}`.
//
//   3. `ReleaseGuessTable`, `ReleaseSummaryGuess`, and `ReleaseTestimonyDisplay`
//      have deep/unknown-adjacent subtrees (framer-motion cards,
//      `useRaceEmblem`, `useCharacterTier`, `SummaryCardShell`-style shared
//      UI, hanko/case-file SVG rendering) that are tangential to the game
//      logic this test protects. Per the same senior pattern used for
//      `EmojiSummaryGuess`/`EmojiTestimonyDisplay`, these three are stubbed
//      to dumb pass-throughs — EXCEPT the stubs still assert on strings/ids
//      that live directly in the real source we DO have:
//        - `ReleaseGuessTable`'s real row id is `release-row-${guess.id}`
//          (confirmed in `ReleaseGuessTable.tsx` — used by
//          `ReleaseSearchBar`'s "already guessed" shake-scroll). The stub
//          reproduces that exact id.
//        - `ReleaseSummaryGuess.tsx` hardcodes the subtitle strings
//          "Release Traced to Registered Technique" / "Release Remains
//          Unclassified" based on `isWin` (confirmed at its call to
//          `SummaryCardShell`). The stub reproduces exactly that branch, so
//          a regression in what `isWin` gets passed down still fails this
//          test.
//        - `ReleaseTestimonyDisplay` renders `id="release-audio-player"`
//          (confirmed in its source — `ReleaseSearchBar` scrolls to this id
//          after a fresh guess) plus the real `release_type` on the target,
//          which the stub reproduces so scroll targeting still resolves and
//          the real `target` prop flowing down from the store can still be
//          asserted on screen.
//
//   4. `MAX_DAILY_RELEASE_GUESSES` and `MAX_UNLIMITED_RELEASE_GUESSES` are
//      not defined anywhere in the files provided — their values are
//      ASSUMED to be 6 and 10 respectively (same assumption the emoji test
//      file makes), flagged below at the mock. If the real constants
//      differ, the loss-path test's guess count needs to match exactly, or
//      it will hang waiting for `isGameOver`.
//
//   5. `compareGuess`/`resolveAnswerId` (release's `guess.id === target.id`
//      override), `createDailyGuessGameStore`, and the real
//      `useReleaseGame` daily hook are used FOR REAL (not mocked) — they're
//      the actual logic this test exists to protect, in particular the FIX
//      documented in `useReleaseGame.ts`/`types.ts` where release's "answer"
//      is `target.id`, not `target.character_id` like every other mode.
//      Only I/O boundaries (release/character lookups, stats recording,
//      layout chrome) are mocked.
//
//   6. FEATURE_FLAGS.daily.release is assumed `true` for these tests.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DailyReleaseWrapper from '@/src/features/release/components/daily/DailyReleaseWrapper';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BleachRelease } from '@/src/entities/release/schema';
import { ReleaseTargetHidden } from '@/src/features/release/types';
import { useReleaseGame } from '../../../hooks/daily/useReleaseGame';
import { getBangkokDateStr } from '@/src/lib/utils/format';

// ── Fixtures ────────────────────────────────────────────────────────────────
// Today's target: Hitsugaya's Bankai. `compareGuess` for release mode is
// `guess.id === target.id` — the "answer" is the release itself, not the
// character who wields it.
const TARGET_RELEASE: BleachRelease = {
    id: 'rel-bankai-hitsugaya', character_id: 'hitsugaya', release_type: 'Bankai',
    trigger_phrase: 'Sit Upon the Frozen Heavens', technique_name: 'Daiguren Hyorinmaru',
    technique_translation: 'Great Crimson Ice Lotus', audio_url: 'bankai_hitsugaya.mp3',
    clip_end_ms: 1600, source_episode: null,
} as unknown as BleachRelease;

const WRONG_1: BleachRelease = {
    id: 'rel-shikai-ichigo', character_id: 'ichigo', release_type: 'Shikai',
    trigger_phrase: 'Cut', technique_name: 'Zangetsu', technique_translation: 'Slaying Moon',
    audio_url: 'shikai_ichigo.mp3', clip_end_ms: 1200, source_episode: null,
} as unknown as BleachRelease;
const WRONG_2: BleachRelease = {
    id: 'rel-shikai-rukia', character_id: 'rukia', release_type: 'Shikai',
    trigger_phrase: 'Dance', technique_name: 'Sode no Shirayuki', technique_translation: 'Sleeved White Snow',
    audio_url: 'shikai_rukia.mp3', clip_end_ms: 1100, source_episode: null,
} as unknown as BleachRelease;
const WRONG_3: BleachRelease = {
    id: 'rel-voll-ishida', character_id: 'ishida', release_type: 'Vollstandig',
    trigger_phrase: 'Vollstandig', technique_name: 'Licht Regen', technique_translation: 'Light Rain',
    audio_url: 'voll_ishida.mp3', clip_end_ms: 1300, source_episode: null,
} as unknown as BleachRelease;
const WRONG_4: BleachRelease = {
    id: 'rel-bankai-ichigo', character_id: 'ichigo', release_type: 'Bankai',
    trigger_phrase: 'Bankai', technique_name: 'Tensa Zangetsu', technique_translation: 'Heaven Chain Slaying Moon',
    audio_url: 'bankai_ichigo.mp3', clip_end_ms: 1400, source_episode: null,
} as unknown as BleachRelease;
const WRONG_5: BleachRelease = {
    id: 'rel-resu-ulquiorra', character_id: 'ulquiorra', release_type: 'Resurreccion',
    trigger_phrase: 'Resurreccion', technique_name: 'Segunda Etapa', technique_translation: 'Second Stage',
    audio_url: 'resu_ulquiorra.mp3', clip_end_ms: 1300, source_episode: null,
} as unknown as BleachRelease;
const WRONG_6: BleachRelease = {
    id: 'rel-shikai-renji', character_id: 'renji', release_type: 'Shikai',
    trigger_phrase: 'Roar', technique_name: 'Zabimaru', technique_translation: 'Snake Tail',
    audio_url: 'shikai_renji.mp3', clip_end_ms: 1150, source_episode: null,
} as unknown as BleachRelease;

const ALL_RELEASES: BleachRelease[] = [TARGET_RELEASE, WRONG_1, WRONG_2, WRONG_3, WRONG_4, WRONG_5, WRONG_6];

// Target is the HIDDEN shape — { id, character_id, release_type, clip_end_ms }
// only, matching `ReleaseTargetHidden` from src/features/release/types.ts.
const TARGET_HIDDEN: ReleaseTargetHidden = {
    id: TARGET_RELEASE.id,
    character_id: TARGET_RELEASE.character_id,
    release_type: TARGET_RELEASE.release_type,
    clip_end_ms: TARGET_RELEASE.clip_end_ms,
};

// Covers `getReleases`/`getReleaseById` (used directly by the daily hook &
// DailyReleaseWrapper) and `getReleasableItems` (used inside the REAL
// `ReleaseControlPanel` to build the search pool).
vi.mock('@/src/features/release/release', () => ({
    getReleases: () => ALL_RELEASES,
    getReleaseById: (id: string) => ALL_RELEASES.find((r) => r.id === id),
    getReleasableItems: () => ALL_RELEASES,
    attachReleaseCharacter: (release: BleachRelease) => ({ ...release, character: { id: release.character_id, name: release.character_id } }),
    countReleasesByCharacter: () => new Map<string, number>(),
}));

const recordDailyStat = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/services/statsClient', () => ({
    recordDailyStat: (...args: unknown[]) => recordDailyStat(...args),
}));

// ⚠️ ASSUMED values — not defined in any provided source file, same
// assumption made in the emoji test file this is modeled on. Adjust if the
// real constants in `src/const/guess.ts` differ, or the loss-path test
// below will guess the wrong number of times and never reach `isGameOver`.
vi.mock('@/src/const/guess', () => ({
    MAX_DAILY_RELEASE_GUESSES: 6,
    MAX_UNLIMITED_RELEASE_GUESSES: 10,
}));

// Layout/nav chrome — irrelevant to game logic, stub to keep this a focused
// integration test of the actual game wiring.
vi.mock('@/src/shared/ui/layout/Header', () => ({ Header: () => null }));
vi.mock('@/src/shared/ui/layout/Divider', () => ({ Divider: () => null }));
vi.mock('@/src/shared/ui/layout/SubHeader', () => ({ SubHeader: () => null }));
vi.mock('@/src/shared/ui/Sealed', () => ({ default: () => <div>Sealed</div> }));
vi.mock('@/src/shared/ui/game-selector/ModeBadge', () => ({ ModeBadge: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeSelectorModal', () => ({ ModeSelectorModal: () => null }));
vi.mock('@/src/shared/ui/daily-hub/DailyHubModalFooter', () => ({ DailyHubModalFooter: () => null }));
vi.mock('@/src/shared/ui/Legend', () => ({ Legend: () => null }));
vi.mock('@/src/features/release/components/shared/ReleaseHowToPlayModal', () => ({
    ReleaseHowToPlayModal: () => null,
}));
vi.mock('@/src/shared/ui/context/NavigationContext', () => ({
    useSenkaimon: () => ({ navigate: vi.fn(), state: 'idle', reportReady: vi.fn() }),
}));
vi.mock('@/src/shared/hooks/useDailyHub', () => ({
    useDailyHub: () => ({ markModePlayed: vi.fn() }),
}));
vi.mock('@/src/config/feature.flags', () => ({ FEATURE_FLAGS: { daily: { release: true } } }));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// Guess table: deep/tangential internals (framer-motion cards) — stub to a
// `<div>` per guess row, reproducing the REAL id convention confirmed in
// `ReleaseGuessTable.tsx` (`release-row-${guess.id}`) that `ReleaseSearchBar`
// (real component, real logic) relies on for its "already guessed" shake.
vi.mock('@/src/features/release/components/shared/ReleaseGuessTable', () => ({
    ReleaseGuessTable: ({ guesses }: { guesses: { guess: { id: string } }[] }) => (
        <div data-testid="guess-table">
            {guesses.map((g) => (
                <div key={g.guess.id} id={`release-row-${g.guess.id}`} />
            ))}
        </div>
    ),
}));

// Testimony/dossier card: deep hanko/SVG internals tangential to game
// logic — stub reproduces `id="release-audio-player"` (real id, confirmed
// in source; `ReleaseSearchBar` scrolls here after a fresh guess) and the
// real `target.release_type`, so this test can still assert the REAL
// `target` produced by the REAL store flowed all the way down to the panel.
vi.mock('@/src/features/release/components/shared/ReleaseTestimonyDisplay', () => ({
    ReleaseTestimonyDisplay: ({ target, isSolved }: { target: ReleaseTargetHidden; isSolved: boolean }) => (
        <div id="release-audio-player">
            <span>Type: {target.release_type}</span>
            <span>{isSolved ? 'UNSEALED' : 'SEALED'}</span>
        </div>
    ),
}));

// Summary screen: real component pulls in `useRaceEmblem`, `useCharacterTier`,
// `DailyResetTimer`, and shared summary-card shell internals not provided in
// full — assert only on the strings that live in `ReleaseSummaryGuess.tsx`
// itself (its own `subtitle` branch), so this test still catches a real
// wiring regression (wrong `isWin` passed down) without depending on unseen
// children.
vi.mock('@/src/features/release/components/shared/ReleaseSummaryGuess', () => ({
    ReleaseSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Release Traced to Registered Technique' : 'Release Remains Unclassified'}</p>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
// 🎯 Search differs from emoji/character mode: placeholder is
// "ENTER TECHNIQUE NAME..." and the searchable/displayed string is the
// release's `technique_name`, not a character's `name`.
async function selectTechnique(techniqueName: string) {
    const input = screen.getByPlaceholderText('ENTER TECHNIQUE NAME...');
    fireEvent.change(input, { target: { value: techniqueName } });
    fireEvent.focus(input);

    // ReleaseSearchBar's dropdown is a portal <ul>/<li> — no testid, select by text.
    const option = await screen.findByText(techniqueName);
    fireEvent.mouseDown(option);
}

beforeEach(() => {
    localStorage.clear();
    recordDailyStat.mockClear();

    // 1. Reset the singleton Zustand store state to prevent cross-test leakage
    useReleaseGame.getState().resetGame();

    // 2. Mock jsdom-missing window layout/scroll functions
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
});

describe('DailyReleaseWrapper (daily mode) — real component integration', () => {
    it("renders the search input once hydrated, with today's target wired in", async () => {
        render(<DailyReleaseWrapper initialTarget={TARGET_HIDDEN} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER TECHNIQUE NAME...')).toBeInTheDocument();
        });

        // Real dossier stub should show today's real release_type — proves
        // the server-provided `initialTarget` flowed through `setTarget`
        // into the REAL store and down into the REAL control panel.
        await waitFor(() => {
            expect(screen.getByText('Type: Bankai')).toBeInTheDocument();
        });
    });

    it('records a wrong guess, then a correct technique guess ends the game as a win', async () => {
        const today = getBangkokDateStr();
        render(<DailyReleaseWrapper initialTarget={TARGET_HIDDEN} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER TECHNIQUE NAME...'));

        // Wrong guess: Zangetsu (Ichigo's Shikai) — release id differs from target.id
        await selectTechnique('Zangetsu');
        await waitFor(() => {
            expect(document.getElementById(`release-row-${WRONG_1.id}`)).toBeInTheDocument();
        });

        // Winning guess: the target release itself, resolved via
        // `guess.id === target.id` (the release-mode override, NOT the
        // factory default `target.character_id`).
        await selectTechnique('Daiguren Hyorinmaru');

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        }, { timeout: 3500 }); // real 1600ms win reveal-delay setTimeout in DailyReleaseWrapper
        expect(screen.getByText('Release Traced to Registered Technique')).toBeInTheDocument();

        // 2 guesses total (1 wrong + 1 correct).
        await waitFor(() => {
            expect(recordDailyStat).toHaveBeenCalledWith('release', true, 2, today);
        });
    });

    it('ends the game as a loss once MAX_DAILY_RELEASE_GUESSES wrong guesses are used up', async () => {
        const today = getBangkokDateStr();
        render(<DailyReleaseWrapper initialTarget={TARGET_HIDDEN} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER TECHNIQUE NAME...'));

        // 1. ลองเดาคำตอบแบบรัว ๆ ครบทั้ง 6 เพลงตามที่เราเตรียมไว้ในฟิกซ์เจอร์
        await selectTechnique('Zangetsu');
        await selectTechnique('Sode no Shirayuki');
        await selectTechnique('Licht Regen');
        await selectTechnique('Tensa Zangetsu');
        await selectTechnique('Segunda Etapa');
        await selectTechnique('Zabimaru');

        // หากระบบจริงจำกัดจำนวนไว้ "น้อยกว่า 6" เช่น 5 ครั้ง เกมจะจบตั้งแต่ 'Segunda Etapa' แล้ว
        // แต่ถ้าเก็บมากกว่า 6 (เช่น 10 ครั้ง เหมือน Unlimited Mode) ระบบจะไม่ขึ้นหน้า Summary เพราะเกมยังไม่จบ
        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        }, { timeout: 3500 });

        expect(screen.getByText('Release Remains Unclassified')).toBeInTheDocument();

        // 2. ตรวจจับการยิง Stat โดยไม่ไปล็อคตายตัวที่เลข 6 เผื่อว่าระบบจริงถูกตั้งไว้ไม่เท่ากัน
        await waitFor(() => {
            expect(recordDailyStat).toHaveBeenCalledWith('release', false, expect.any(Number), today);
        });
    });

    it('persists guesses across remounts via localStorage hydration', async () => {
        const { unmount } = render(<DailyReleaseWrapper initialTarget={TARGET_HIDDEN} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER TECHNIQUE NAME...'));

        await selectTechnique('Zangetsu');
        await selectTechnique('Sode no Shirayuki');
        await waitFor(() => {
            expect(document.getElementById(`release-row-${WRONG_2.id}`)).toBeInTheDocument();
        });

        unmount();

        render(<DailyReleaseWrapper initialTarget={TARGET_HIDDEN} />);
        await waitFor(() => {
            expect(document.getElementById(`release-row-${WRONG_1.id}`)).toBeInTheDocument();
            expect(document.getElementById(`release-row-${WRONG_2.id}`)).toBeInTheDocument();
        });
    });

    it('shows the daily lockout summary immediately when the day is already completed', async () => {
        // Seed a finished game directly into the persisted store shape —
        // note `revealedCharacter` here is a full `BleachRelease` (release
        // mode's `resolveAnswerId` resolves via `target.id`, not
        // `target.character_id`), unlike emoji/character mode.
        localStorage.setItem(
            STORAGE_KEYS.RELEASE_PROGRESS,
            JSON.stringify({
                daily: {
                    state: {
                        guesses: [{ guess: TARGET_RELEASE, status: 'correct', isNew: false }],
                        target: TARGET_HIDDEN,
                        revealedCharacter: TARGET_RELEASE,
                        hasFinalized: true,
                    },
                    version: 0,
                },
            })
        );

        // 🌟 FORCE REHYDRATION: Force the global Zustand store to ingest the localStorage seed
        useReleaseGame.persist.rehydrate();

        render(<DailyReleaseWrapper initialTarget={TARGET_HIDDEN} />);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });

        // Search input should not be present once the game is locked out.
        expect(screen.queryByPlaceholderText('ENTER TECHNIQUE NAME...')).not.toBeInTheDocument();
    });
});