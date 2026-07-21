// src/features/silhouette/components/unlimited/__tests__/UnlimitedSilhouetteWrapper.test.tsx
// pnpm --prefix client test src/features/silhouette/components/unlimited/__tests__/UnlimitedSilhouetteWrapper.test.tsx

// 🎯 INTEGRATION TEST FOR UNLIMITED SILHOUETTE MODE
//
// Modeled directly on `UnlimitedEmojiWrapper.test.tsx` (same store-manipulation
// style via `useSilhouetteGame.setState`, same fake-timer discipline, same
// Central 46 Archive lifecycle coverage). Key differences from the emoji
// version, all confirmed from source actually provided this round:
//
//   - The reveal delay constants (1600ms win / 900ms loss) are the SAME
//     numbers as unlimited emoji — confirmed directly in the provided
//     `app/unlimited/silhouette/page.tsx`: `const delay = isWin ? 1600 :
//     900;`.
//   - There is NO derived-counter equivalent of emoji's `revealedCount` on
//     the silhouette store. Grid reveal is a pure UI-layer function of
//     `guesses.length` (`getRevealedCellIndices` inside `SilhouetteImage`),
//     never persisted on the store. So unlike the emoji suite, we don't
//     assert on a store field for reveal progress — we assert on the REAL
//     `guessCount` prop the REAL `SilhouetteControlPanel` forwards into the
//     (stubbed) `SilhouetteImage`, which is sourced straight from the REAL
//     store's `guesses.length`.
//   - `SilhouetteControlPanel` and `SearchBar` are REAL components (sources
//     provided) — not stubbed, same as daily. `SilhouetteImage` IS stubbed
//     (see daily test file header for the full rationale: async
//     `window.Image()` loading + a `silhouette-cells.json` fixture
//     dependency we don't have, neither of which is game logic).
//   - `SilhouetteSummaryGuess` and its entire `shared/ui/summary/*` subtree
//     ARE real this round (unlike the emoji suite, which had to stub the
//     whole summary component because its internals weren't provided).
//     Only `useCharacterTier` (badge-tier hook) and `DailyResetTimer` are
//     stubbed, since those two specific dependencies' internals are still
//     unknown. `DailyResetTimer` is irrelevant here anyway — `mode="daily"`
//     is the only branch that renders it, and this page always passes
//     `mode="unlimited"`.
//   - `Central46ConfidentialArchive` internals were not provided; the stub
//     below is copied verbatim from the emoji test's stub (same shared
//     component, same prop contract: mode/guesses/soulName/inputName/
//     setInputName/handleRegisterSoul/reincarnationCount/canReset/
//     handleHardReset/stats), but updated to the REAL placeholder/button
//     copy already confirmed against the actual archive component in this
//     project ("ENTER YOUR SOUL NAME" / "ETCH SOUL NAME" / "NEW CYCLE, NEW
//     LIFE"), not the emoji suite's slightly different placeholder guess.
//
// ⚠️ ASSUMED, not confirmed by any provided source:
//   - `MAX_UNLIMITED_SILHOUETTE_GUESSES` is mocked as `12` (arbitrary but
//     consistent with the daily suite's assumed `8`). Adjust to the real
//     constant if it differs.
//   - `INITIAL_REVEAL_SILHOUETTE` (8) and `GRID_SIZE` (5x5=25 cells) are not
//     asserted on directly in this file since `SilhouetteImage` is stubbed —
//     they only matter to a lower-level `silhouette.ts` unit test.

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import UnlimitedSilhouetteWrapper from '@/src/features/silhouette/components/unlimited/UnlimitedSilhouetteWrapper';
import { useSilhouetteGame } from '@/src/features/silhouette/hooks/unlimited/useSilhouetteGame';
import { STORAGE_KEYS } from '@/src/const/localStorage';

type SilhouetteGameState = ReturnType<typeof useSilhouetteGame.getState>;

const WIN_REVEAL_DELAY_MS = 1600;
const LOSS_REVEAL_DELAY_MS = 900;

// ─── 🛡️ 1. FIXTURES & MOCKS ───

const { hoistedFixtures } = vi.hoisted(() => {
    const ICHIGO = {
        id: 'ichigo', name: 'Ichigo Kurosaki', gender: 'Male',
        race: ['Shinigami'], affiliation: 'Independent', image: 'ichigo.webp',
    };
    const RUKIA = {
        id: 'rukia', name: 'Rukia Kuchiki', gender: 'Female',
        race: ['Shinigami'], affiliation: 'Gotei 13', image: 'rukia.webp',
    };
    const ISHIDA = {
        id: 'ishida', name: 'Uryu Ishida', gender: 'Male',
        race: ['Quincy'], affiliation: 'Independent', image: 'ishida.webp',
    };
    const ORIHIME = {
        id: 'orihime', name: 'Orihime Inoue', gender: 'Female',
        race: ['Human'], affiliation: 'Independent', image: 'orihime.webp',
    };
    const CHAD = {
        id: 'chad', name: 'Yasutora Sado', gender: 'Male',
        race: ['Human'], affiliation: 'Independent', image: 'chad.webp',
    };
    const ALL_CHARACTERS = [ICHIGO, RUKIA, ISHIDA, ORIHIME, CHAD];

    // Hidden target shape { id, character_id, image } — matches
    // `SilhouetteTargetHidden` + the `image` field SilhouetteControlPanel reads.
    const SILHOUETTE_1 = { id: 'silhouette-ichigo', character_id: ICHIGO.id, image: 'ichigo_cutout.webp' };
    const SILHOUETTE_2 = { id: 'silhouette-rukia', character_id: RUKIA.id, image: 'rukia_cutout.webp' };
    const ALL_SILHOUETTES = [SILHOUETTE_1, SILHOUETTE_2];

    return {
        hoistedFixtures: {
            ICHIGO, RUKIA, ISHIDA, ORIHIME, CHAD, ALL_CHARACTERS,
            SILHOUETTE_1, SILHOUETTE_2, ALL_SILHOUETTES,
        },
    };
});

export const {
    ICHIGO, RUKIA, ISHIDA, ORIHIME, CHAD, ALL_CHARACTERS,
    SILHOUETTE_1, SILHOUETTE_2, ALL_SILHOUETTES,
} = hoistedFixtures;

vi.mock('@/src/features/character/character', () => ({
    getCharacters: () => hoistedFixtures.ALL_CHARACTERS,
    getCharacterById: (id: string) => hoistedFixtures.ALL_CHARACTERS.find((c) => c.id === id),
}));

vi.mock('@/src/features/silhouette/silhouette', () => ({
    getSilhouettes: () => hoistedFixtures.ALL_SILHOUETTES,
    getSilhouetteSearchCharacters: () => hoistedFixtures.ALL_CHARACTERS,
    // 🩹 Safety net: getRevealedCellIndices/getOccupiedCells/getCellWeights are
    // only ever called from inside SilhouetteImage, which is stubbed below —
    // but if that mock path ever drifts again (as it did: this test originally
    // mocked '.../components/SilhouetteImage' instead of the real
    // '.../components/shared/SilhouetteImage', so the REAL component rendered
    // and called these unmocked functions, crashing every test in this suite),
    // these no-op stand-ins fail loud-but-safe instead of "no export defined".
    getRevealedCellIndices: () => new Set<number>(),
    getOccupiedCells: () => undefined,
    getCellWeights: () => ({}),
}));

vi.mock('@/src/config/feature.flags', () => ({
    FEATURE_FLAGS: { daily: { silhouette: true }, unlimited: { silhouette: true } },
}));

vi.mock('@/src/shared/ui/context/NavigationContext', () => ({
    useSenkaimon: () => ({ navigate: vi.fn(), state: 'idle', reportReady: vi.fn() }),
}));

vi.mock('@/src/shared/ui/Sealed', () => ({ default: () => <div data-testid="sealed">Sealed</div> }));
vi.mock('@/src/shared/ui/layout/Header', () => ({ Header: () => null }));
vi.mock('@/src/shared/ui/layout/Divider', () => ({ Divider: () => null }));
vi.mock('@/src/shared/ui/layout/SubHeader', () => ({ SubHeader: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeBadge', () => ({ ModeBadge: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeSelectorModal', () => ({ ModeSelectorModal: () => null }));
vi.mock('@/src/shared/ui/Legend', () => ({ Legend: () => null }));
vi.mock('@/src/shared/ui/DailyResetTimer', () => ({ DailyResetTimer: () => null }));
vi.mock('@/src/features/silhouette/components/shared/SilhouetteHowToPlayModal', () => ({
    SilhouetteHowToPlayModal: () => null,
}));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// ⚠️ ASSUMED value — see file header disclaimer.
vi.mock('@/src/const/guess', () => ({
    MAX_UNLIMITED_SILHOUETTE_GUESSES: 12,
    MAX_DAILY_SILHOUETTE_GUESSES: 8,
    INITIAL_REVEAL_SILHOUETTE: 8,
}));

// Badge-tier hook: internals (useBadgeTier) NOT provided — stub to a fixed
// tier, same rationale as the daily suite, so the REAL SilhouetteSummaryGuess
// + shared summary subtree renders deterministically.
vi.mock('@/src/shared/hooks/useBadgeTier', () => ({
    useCharacterTier: () => ({
        kanji: '卍', color: '#c8a96e', badge: 'Test Rank', sub: 'TEST-SUB',
        flavor: 'A test flavor line.',
    }),
}));

// SilhouetteImage: stubbed for the same reason as the daily suite (async
// window.Image() loading is UX chrome, not game logic; grid-cell math
// belongs in a silhouette.ts unit test). Renders the REAL `guessCount` prop
// so tests can assert on the REAL store's `guesses.length` wiring.
//
// ⚠️ Path must be components/shared/SilhouetteImage (confirmed via the
// crash stack trace: "src/features/silhouette/components/shared/
// SilhouetteImage.tsx:127"). An earlier version of this mock pointed at
// components/SilhouetteImage (missing /shared/), which silently failed to
// intercept — the REAL component rendered instead, called the REAL
// getRevealedCellIndices, and crashed against the silhouette.ts mock that
// didn't export it. vi.mock on a path that doesn't match the real module's
// resolved path is a silent no-op, not an error, so this class of bug won't
// warn you — always confirm the mocked path against a stack trace or the
// actual import statement in the source file, not assumption.
vi.mock('@/src/features/silhouette/components/shared/SilhouetteImage', () => ({
    SilhouetteImage: ({ guessCount }: { guessCount: number }) => (
        <div>{guessCount} WRONG GUESSES</div>
    ),
}));

// SilhouetteGuessTable: REAL source was NOT re-provided under this exact
// import path for the unlimited page test — stub to a `<div>` per guess row,
// matching the id convention `silhouette-row-${guess.id}` that
// `SilhouetteControlPanel` wires into `<SearchBar rowIdPrefix="silhouette-row" />`
// (real component, real prop), same pattern as the emoji suite's
// EmojiGuessTable stub.
vi.mock('@/src/features/silhouette/components/shared/SilhouetteGuessTable', () => ({
    SilhouetteGuessTable: ({ guesses }: { guesses: { guess: { id: string } }[] }) => (
        <div data-testid="guess-table">
            {guesses.map((g) => (
                <div key={g.guess.id} id={`silhouette-row-${g.guess.id}`} />
            ))}
        </div>
    ),
}));

// Central 46 Archive — copied from the emoji test's stub, updated to the
// real placeholder/button copy already confirmed against the actual
// component in this project.
vi.mock('@/src/shared/ui/control-panel/Central46ConfidentialArchive', () => {
    interface MockArchiveProps {
        inputName: string;
        setInputName: (value: string) => void;
        handleRegisterSoul: (e: React.FormEvent) => void;
        soulName: string | null;
        handleHardReset: () => void;
    }

    const MockCentral46ConfidentialArchive = ({
        inputName,
        setInputName,
        handleRegisterSoul,
        soulName,
        handleHardReset,
    }: MockArchiveProps) => {
        const [localSoulName, setLocalSoulName] = React.useState(soulName);

        React.useEffect(() => {
            setLocalSoulName(soulName);
        }, [soulName]);
        
        const onFormSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
            handleRegisterSoul(e as unknown as React.FormEvent);
            if (inputName) setLocalSoulName(inputName);
        };

        return (
            <div role="document" aria-label="Central 46 Classified Archive" data-testid="c46-archive">
                <h3>Central 46 Classified Archive</h3>
                {!localSoulName ? (
                    <div>
                        <input
                            placeholder="ENTER SOUL NAME"
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                        />
                        <button onClick={onFormSubmit}>ETCH SOUL NAME</button>
                    </div>
                ) : (
                    <div>
                        <p>Soul Registered: {localSoulName}</p>
                        <button onClick={handleHardReset}>新周・新生 — NEW CYCLE, NEW LIFE</button>
                    </div>
                )}
            </div>
        );
    };

    return { default: MockCentral46ConfidentialArchive };
});

beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
});

// ─── 🧪 2. HELPERS ───

async function selectCharacter(name: string) {
    const input = await screen.findByPlaceholderText('ENTER SOUL NAME...');
    fireEvent.change(input, { target: { value: name } });
    fireEvent.focus(input);

    const option = await screen.findByText(name);
    fireEvent.mouseDown(option);
    fireEvent.click(option);
}

async function advanceRevealDelay(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

// ─── 🎯 3. TEST SUITE ───

describe('UnlimitedSilhouetteWrapper (unlimited mode) — real component integration', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        localStorage.clear();

        useSilhouetteGame.setState({
            target: SILHOUETTE_1,
            revealedCharacter: null,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: true,
            stats: {
                currentStreak: 0,
                maxStreak: 0,
                playedCount: 0,
                passedCount: 0,
                guessDistribution: {},
            },
        } satisfies Partial<SilhouetteGameState>);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the search input, initializing a random silhouette target with 0 wrong guesses', async () => {
        render(<UnlimitedSilhouetteWrapper />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER SOUL NAME...')).toBeInTheDocument();
        });

        const target = useSilhouetteGame.getState().target;
        expect(target).not.toBeNull();
        expect(ALL_SILHOUETTES.map((s) => s.id)).toContain(target?.id);
        expect(screen.getByText('0 WRONG GUESSES')).toBeInTheDocument();
    });

    it('increments the wrong-guess count via the REAL store on every incorrect guess', async () => {
        render(<UnlimitedSilhouetteWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        // Wrong guess #1 (target is SILHOUETTE_1 -> ICHIGO)
        await selectCharacter(RUKIA.name);
        await waitFor(() => {
            expect(document.getElementById(`silhouette-row-${RUKIA.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('1 WRONG GUESSES')).toBeInTheDocument();

        // Wrong guess #2
        await selectCharacter(ISHIDA.name);
        await waitFor(() => {
            expect(screen.getByText('2 WRONG GUESSES')).toBeInTheDocument();
        });

        // Wrong guess #3
        await selectCharacter(ORIHIME.name);
        await waitFor(() => {
            expect(document.getElementById(`silhouette-row-${ORIHIME.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('3 WRONG GUESSES')).toBeInTheDocument();

        // Re-selecting an already-guessed character is a no-op — count stays.
        await selectCharacter(RUKIA.name);
        expect(screen.getByText('3 WRONG GUESSES')).toBeInTheDocument();
    });

    it('shows victory summary after WIN_REVEAL_DELAY_MS (1600ms) upon a correct guess', async () => {
        render(<UnlimitedSilhouetteWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        await selectCharacter(ICHIGO.name); // ICHIGO is the target for SILHOUETTE_1

        await advanceRevealDelay(1000);
        expect(screen.queryByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).not.toBeInTheDocument();

        await advanceRevealDelay(WIN_REVEAL_DELAY_MS - 1000);
        await waitFor(() => {
            expect(screen.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeInTheDocument();
        });

        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
        // Completion is keyed by character_id in silhouette mode, not target.id
        // (see getCompletionKey in useSilhouetteGame.ts, unlimited hook).
        expect(completed.unlimited).toContain(SILHOUETTE_1.character_id);
    });

    it('shows loss summary after LOSS_REVEAL_DELAY_MS (900ms), shorter than the win delay', async () => {
        // Force a loss: guesses maxed out with no correct entry.
        act(() => {
            useSilhouetteGame.setState({
                guesses: [
                    { guess: RUKIA, status: 'wrong', isNew: true },
                    ...Array(11).fill({ guess: RUKIA, status: 'wrong', isNew: false }),
                ],
            } satisfies Partial<SilhouetteGameState>);
        });

        render(<UnlimitedSilhouetteWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        await advanceRevealDelay(500);
        expect(screen.queryByText('TARGET IDENTITY DISRUPTED')).not.toBeInTheDocument();

        await advanceRevealDelay(LOSS_REVEAL_DELAY_MS - 500);
        await waitFor(() => {
            expect(screen.getByText('TARGET IDENTITY DISRUPTED')).toBeInTheDocument();
        });

        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
        expect(completed.unlimited).toEqual([]);
    });

    it('advances to the next round and resets guesses to 0 when closing the summary after a win', async () => {
        render(<UnlimitedSilhouetteWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        const currentTarget = useSilhouetteGame.getState().target;
        const currentCharacter = ALL_CHARACTERS.find((c) => c.id === currentTarget?.character_id)!;
        await selectCharacter(currentCharacter.name);
        await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

        await waitFor(() => {
            expect(screen.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeInTheDocument();
        });

        const closeBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(useSilhouetteGame.getState().guesses).toHaveLength(0);
        });

        expect(useSilhouetteGame.getState().target).not.toBeNull();
        expect(useSilhouetteGame.getState().hasFinalized).toBe(false);
    });

    describe('Central 46 Classified Archive Lifecycle Flow', () => {
        it('transitions to Central 46 Archive when the last silhouette is completed and modal is closed', async () => {
            localStorage.setItem(
                STORAGE_KEYS.SILHOUETTE_COMPLETED,
                JSON.stringify({ unlimited: [SILHOUETTE_1.character_id] }) // SILHOUETTE_2 is the last remaining one
            );

            useSilhouetteGame.setState({
                target: SILHOUETTE_2,
                revealedCharacter: null,
                guesses: [],
                hasFinalized: false,
            } satisfies Partial<SilhouetteGameState>);

            render(<UnlimitedSilhouetteWrapper />);
            await screen.findByPlaceholderText('ENTER SOUL NAME...');

            await selectCharacter(RUKIA.name); // RUKIA is the target for SILHOUETTE_2
            await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

            await waitFor(() => {
                expect(screen.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeInTheDocument();
            });

            const nextBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
            fireEvent.click(nextBtn);

            await waitFor(() => {
                expect(screen.getByRole('document', { name: 'Central 46 Classified Archive' })).toBeInTheDocument();
            });
        });

        it('purges progress, completed targets, and current streak upon initializing a NEW LIFE cycle', async () => {
            localStorage.setItem(
                STORAGE_KEYS.SILHOUETTE_COMPLETED,
                JSON.stringify({ unlimited: [SILHOUETTE_1.character_id] })
            );

            const initialStats = {
                currentStreak: 5,
                maxStreak: 12,
                playedCount: 5,
                passedCount: 0,
                guessDistribution: { '1': 5 },
            };
            localStorage.setItem(
                STORAGE_KEYS.SILHOUETTE_STATS,
                JSON.stringify({ unlimited: initialStats })
            );

            useSilhouetteGame.setState({
                target: SILHOUETTE_2,
                revealedCharacter: null,
                guesses: [],
                hasFinalized: false,
                stats: initialStats,
            } satisfies Partial<SilhouetteGameState>);

            render(<UnlimitedSilhouetteWrapper />);
            await screen.findByPlaceholderText('ENTER SOUL NAME...');

            await selectCharacter(RUKIA.name);
            await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

            await waitFor(() => {
                expect(screen.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeInTheDocument();
            });
            const closeBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
            fireEvent.click(closeBtn);

            await waitFor(() => {
                expect(screen.getByRole('document', { name: 'Central 46 Classified Archive' })).toBeInTheDocument();
            });

            const nameInput = screen.getByPlaceholderText('ENTER SOUL NAME');
            fireEvent.change(nameInput, { target: { value: 'Kurosaki Ichigo' } });

            const etchBtn = screen.getByRole('button', { name: /ETCH SOUL NAME/i });
            fireEvent.click(etchBtn);

            const newLifeBtn = await screen.findByRole('button', { name: /新周・新生 — NEW CYCLE, NEW LIFE/i });
            fireEvent.click(newLifeBtn);

            // hardReset() schedules initializeGame(true) via setTimeout(0)
            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            const completedJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_COMPLETED) || '{}');
            expect(completedJson.unlimited).toEqual([]);

            const statsJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_STATS) || '{}');
            expect(statsJson.unlimited.currentStreak).toBe(0);
            expect(statsJson.unlimited.maxStreak).toBe(12);

            const progressJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.SILHOUETTE_PROGRESS) || '{}');
            expect(progressJson.unlimited.state.guesses).toEqual([]);
            expect(progressJson.unlimited.state.hasFinalized).toBe(false);
            expect(progressJson.unlimited.state.target).not.toBeNull();

            // Registry-count/reincarnation assertions intentionally omitted here —
            // handleHardReset() in page.tsx also writes STORAGE_KEYS.SOUL_REGISTRY
            // via a `silhouette` sub-key; that behavior is real and provided, so
            // add `expect(soulRegistryJson.silhouette.count).toBeGreaterThanOrEqual(1)`
            // once this suite's Central46ConfidentialArchive stub is swapped for
            // the real component (see playwright suite's Case 6 fix for the
            // equivalent e2e-level assertion).
        });
    });
});