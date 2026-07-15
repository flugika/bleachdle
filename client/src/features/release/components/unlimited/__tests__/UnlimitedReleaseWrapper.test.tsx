// src/features/release/components/unlimited/__tests__/UnlimitedReleaseWrapper.test.tsx
// pnpm --prefix client test src/features/release/components/unlimited/__tests__/UnlimitedReleaseWrapper.test.tsx

// 🎯 INTEGRATION TEST FOR UNLIMITED RELEASE MODE
//
// Modeled directly on `UnlimitedEmojiGame.test.tsx` (same store-manipulation
// style via `useReleaseGame.setState`, same fake-timer discipline, same
// Central 46 Archive lifecycle coverage). Key differences from the emoji
// version, all confirmed from source actually provided:
//
//   - The reveal delay constants (1600ms win / 900ms loss) are the SAME
//     numbers as unlimited emoji — confirmed directly in
//     `app/unlimited/release/page.tsx`: `const delay = isWin ? 1600 : 900;`.
//   - There is no `revealedCount`/derived-counter ladder in release mode —
//     it's a plain binary guess game, same shape as quote/silhouette, EXCEPT
//     `compareGuess`/`resolveAnswerId` are overridden in
//     `hooks/unlimited/useReleaseGame.ts` to compare on `target.id`
//     (the release itself is "the answer"), not the factory default
//     `target.character_id`. This is the core regression this test suite
//     protects — a guess on the correct release's own id must resolve to a
//     win, and `revealedCharacter` after `finalizeGame` must be the full
//     `BleachRelease` (via `getReleaseById(target.id)`), not `null`.
//   - 🎯 SEARCH DIFFERS from emoji/character mode by design: the real
//     `ReleaseSearchBar`'s placeholder is "ENTER TECHNIQUE NAME..." (not
//     "ENTER SOUL NAME...") and it searches on `technique_name` (plus
//     `trigger_phrase`/`technique_translation`), not a character's `name`.
//     `selectTechnique()` below drives guesses through the REAL
//     `ReleaseSearchBar` (no mock) using that placeholder + technique name.
//   - `ReleaseControlPanel` and `ReleaseSearchBar` are REAL components
//     (sources were provided) — not stubbed, same rationale as keeping
//     `EmojiControlPanel`/`SearchBar` real in the emoji test.
//     `ReleaseGuessTable`, `ReleaseSummaryGuess`, and
//     `ReleaseTestimonyDisplay` pull in deep/tangential internals
//     (framer-motion cards, `useRaceEmblem`, `useCharacterTier`, hanko/SVG
//     case-file rendering) not provided in full, so — same as the emoji
//     test stubs `EmojiTestimonyDisplay`/`EmojiSummaryGuess` — they're
//     stubbed to reproduce only the on-screen strings/ids confirmed
//     directly in their real source (row id `release-row-${guess.id}`,
//     `id="release-audio-player"`, and the `isWin` subtitle strings).
//   - `Central46ConfidentialArchive` internals were not provided either;
//     the stub below is copied verbatim from the emoji test's stub (same
//     shared component, same prop contract: mode/guesses/soulName/
//     inputName/setInputName/handleRegisterSoul/reincarnationCount/
//     canReset/handleHardReset/stats). `mode='release'` is passed for real
//     from `page.tsx`, but the stub itself is prop-agnostic on `mode`.
//
// ⚠️ ASSUMED, not confirmed by any provided source:
//   - `MAX_UNLIMITED_RELEASE_GUESSES` is mocked as `10` (same assumption
//     made in the daily-release vitest file, mirroring emoji's assumed
//     constants). Adjust to the real constant if it differs — otherwise
//     "runs out of guesses" style assertions may never fire.

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import UnlimitedReleaseWrapper from '@/src/features/release/components/unlimited/UnlimitedReleaseWrapper';
import { useReleaseGame } from '@/src/features/release/hooks/unlimited/useReleaseGame';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { BleachRelease } from '@/src/entities/release/schema';
import { ReleaseTargetHidden } from '@/src/features/release/types';

type ReleaseGameState = ReturnType<typeof useReleaseGame.getState>;

const WIN_REVEAL_DELAY_MS = 1600;
const LOSS_REVEAL_DELAY_MS = 900;

// ─── 🛡️ 1. FIXTURES & MOCKS ───

const { hoistedFixtures } = vi.hoisted(() => {
    const RELEASE_1: BleachRelease = {
        id: 'rel-bankai-hitsugaya', character_id: 'hitsugaya', release_type: 'Bankai',
        trigger_phrase: 'Sit Upon the Frozen Heavens', technique_name: 'Daiguren Hyorinmaru',
        technique_translation: 'Great Crimson Ice Lotus', audio_url: 'bankai_hitsugaya.mp3',
        clip_end_ms: 1600, source_episode: null,
    };
    const RELEASE_2: BleachRelease = {
        id: 'rel-shikai-rukia', character_id: 'rukia', release_type: 'Shikai',
        trigger_phrase: 'Dance', technique_name: 'Sode no Shirayuki',
        technique_translation: 'Sleeved White Snow', audio_url: 'shikai_rukia.mp3',
        clip_end_ms: 1100, source_episode: null,
    };
    const WRONG_1: BleachRelease = {
        id: 'rel-shikai-ichigo', character_id: 'ichigo', release_type: 'Shikai',
        trigger_phrase: 'Cut', technique_name: 'Zangetsu', technique_translation: 'Slaying Moon',
        audio_url: 'shikai_ichigo.mp3', clip_end_ms: 1200, source_episode: null,
    };
    const WRONG_2: BleachRelease = {
        id: 'rel-voll-ishida', character_id: 'ishida', release_type: 'Vollstandig',
        trigger_phrase: 'Vollstandig', technique_name: 'Licht Regen', technique_translation: 'Light Rain',
        audio_url: 'voll_ishida.mp3', clip_end_ms: 1300, source_episode: null,
    };
    const WRONG_3: BleachRelease = {
        id: 'rel-resu-ulquiorra', character_id: 'ulquiorra', release_type: 'Resurreccion',
        trigger_phrase: 'Resurreccion', technique_name: 'Segunda Etapa', technique_translation: 'Second Stage',
        audio_url: 'resu_ulquiorra.mp3', clip_end_ms: 1300, source_episode: null,
    };
    const ALL_RELEASES = [RELEASE_1, RELEASE_2, WRONG_1, WRONG_2, WRONG_3];

    // Hidden target shape { id, character_id, release_type, clip_end_ms } —
    // matches `ReleaseTargetHidden` and the real `attachCharacter` mapping
    // in `hooks/unlimited/useReleaseGame.ts`.
    const toHidden = (r: ReleaseTargetHidden): ReleaseTargetHidden => ({
        id: r.id, character_id: r.character_id, release_type: r.release_type, clip_end_ms: r.clip_end_ms,
    });
    const TARGET_1 = toHidden(RELEASE_1);
    const TARGET_2 = toHidden(RELEASE_2);

    return {
        hoistedFixtures: {
            RELEASE_1, RELEASE_2, WRONG_1, WRONG_2, WRONG_3, ALL_RELEASES, TARGET_1, TARGET_2,
        },
    };
});

export const { RELEASE_1, RELEASE_2, WRONG_1, WRONG_2, WRONG_3, ALL_RELEASES, TARGET_1, TARGET_2 } = hoistedFixtures;

// Covers `getReleases`/`getReleaseById` (used directly by the unlimited hook
// & `page.tsx`) and `getReleasableItems` (used inside the REAL
// `ReleaseControlPanel` to build the search pool).
vi.mock('@/src/features/release/release', () => ({
    getReleases: () => hoistedFixtures.ALL_RELEASES,
    getReleaseById: (id: string) => hoistedFixtures.ALL_RELEASES.find((r: BleachRelease) => r.id === id),
    getReleasableItems: () => hoistedFixtures.ALL_RELEASES,
    attachReleaseCharacter: (release: BleachRelease) => ({ ...release, character: { id: release.character_id, name: release.character_id } }),
    countReleasesByCharacter: () => new Map<string, number>(),
}));

vi.mock('@/src/config/feature.flags', () => ({
    FEATURE_FLAGS: { daily: { release: true }, unlimited: { release: true } },
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
vi.mock('@/src/features/release/components/shared/ReleaseHowToPlayModal', () => ({
    ReleaseHowToPlayModal: () => null,
}));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// ⚠️ ASSUMED value — see file header disclaimer.
vi.mock('@/src/const/guess', () => ({
    MAX_UNLIMITED_RELEASE_GUESSES: 10,
    MAX_DAILY_RELEASE_GUESSES: 6,
}));

vi.mock('@/src/features/release/components/shared/ReleaseSummaryGuess', () => ({
    ReleaseSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Release Traced to Registered Technique' : 'Release Remains Unclassified'}</p>
            <button onClick={onClose}>OPEN SENKAIMON</button>
        </div>
    ),
}));

// Testimony/dossier card internals not provided in full — stub reproduces
// only `id="release-audio-player"` (real id, confirmed in source; the REAL
// `ReleaseSearchBar` scrolls here after a fresh guess) plus the real
// `release_type`, so tests can assert the REAL `target` from the REAL store
// flowed down through the REAL `ReleaseControlPanel`.
vi.mock('@/src/features/release/components/shared/ReleaseTestimonyDisplay', () => ({
    ReleaseTestimonyDisplay: ({ target, isSolved }: { target: ReleaseTargetHidden; isSolved: boolean }) => (
        <div id="release-audio-player">
            <span>Type: {target.release_type}</span>
            <span>{isSolved ? 'UNSEALED' : 'SEALED'}</span>
        </div>
    ),
}));

// Guess table: deep/tangential internals (framer-motion cards) — stub
// reproduces the REAL row-id convention confirmed in `ReleaseGuessTable.tsx`
// (`release-row-${guess.id}`).
vi.mock('@/src/features/release/components/shared/ReleaseGuessTable', () => ({
    ReleaseGuessTable: ({ guesses }: { guesses: { guess: { id: string } }[] }) => (
        <div data-testid="guess-table">
            {guesses.map((g) => (
                <div key={g.guess.id} id={`release-row-${g.guess.id}`} />
            ))}
        </div>
    ),
}));

// Central 46 Archive — copied verbatim from the emoji test's stub (same
// shared component, same prop contract).
vi.mock('@/src/shared/ui/Central46ConfidentialArchive', () => {
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

// 🎯 Search differs from emoji/character mode: placeholder is
// "ENTER TECHNIQUE NAME..." and the searchable/displayed string is the
// release's `technique_name`.
async function selectTechnique(techniqueName: string) {
    const input = await screen.findByPlaceholderText('ENTER TECHNIQUE NAME...');
    fireEvent.change(input, { target: { value: techniqueName } });
    fireEvent.focus(input);

    const option = await screen.findByText(techniqueName);
    fireEvent.mouseDown(option);
    fireEvent.click(option);
}

async function advanceRevealDelay(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

// ─── 🎯 3. TEST SUITE ───

describe('UnlimitedReleaseWrapper (unlimited mode) — real component integration', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        localStorage.clear();

        useReleaseGame.setState({
            target: TARGET_1,
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
        } satisfies Partial<ReleaseGameState>);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the search input, with a random release wired in as target', async () => {
        render(<UnlimitedReleaseWrapper />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER TECHNIQUE NAME...')).toBeInTheDocument();
        });

        const target = useReleaseGame.getState().target;
        expect(target).not.toBeNull();
        expect(ALL_RELEASES.map((r) => r.id)).toContain(target?.id);
        expect(screen.getByText(`Type: ${target?.release_type}`)).toBeInTheDocument();
    });

    it('records wrong guesses via the REAL search bar without ending the game', async () => {
        render(<UnlimitedReleaseWrapper />);
        await screen.findByPlaceholderText('ENTER TECHNIQUE NAME...');

        // Target is RELEASE_1 (Daiguren Hyorinmaru) — guess something else.
        await selectTechnique(WRONG_1.technique_name);
        await waitFor(() => {
            expect(document.getElementById(`release-row-${WRONG_1.id}`)).toBeInTheDocument();
        });
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();
        expect(useReleaseGame.getState().guesses).toHaveLength(1);
        expect(useReleaseGame.getState().guesses[0].status).toBe('wrong');
    });

    it('shows victory summary after WIN_REVEAL_DELAY_MS (1600ms) upon guessing the correct technique', async () => {
        render(<UnlimitedReleaseWrapper />);
        await screen.findByPlaceholderText('ENTER TECHNIQUE NAME...');

        // RELEASE_1 (Daiguren Hyorinmaru) is the target for TARGET_1 — the
        // release-mode override means `guess.id === target.id`, not
        // `target.character_id`.
        await selectTechnique(RELEASE_1.technique_name);

        await advanceRevealDelay(1000);
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();

        await advanceRevealDelay(WIN_REVEAL_DELAY_MS - 1000);
        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Release Traced to Registered Technique')).toBeInTheDocument();

        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELEASE_COMPLETED) || '{}');
        // `getCompletionKey` for release mode is `target.id` (the release
        // itself), not `target.character_id`.
        expect(completed.unlimited).toContain(RELEASE_1.id);

        // `revealedCharacter` must be the full release (via
        // `getReleaseById(resolveAnswerId(target))`), not null — this is the
        // FIX documented in `createUnlimitedGuessGameStore.ts`.
        expect(useReleaseGame.getState().revealedCharacter?.id).toBe(RELEASE_1.id);
    });

    it('shows loss summary after LOSS_REVEAL_DELAY_MS (900ms), shorter than the win delay', async () => {
        // Force a loss: guesses maxed out with no correct entry.
        act(() => {
            useReleaseGame.setState({
                guesses: [
                    { guess: WRONG_1, status: 'wrong', isNew: true },
                    ...Array(9).fill({ guess: WRONG_1, status: 'wrong', isNew: false }),
                ],
            } satisfies Partial<ReleaseGameState>);
        });

        render(<UnlimitedReleaseWrapper />);
        await screen.findByPlaceholderText('ENTER TECHNIQUE NAME...');

        await advanceRevealDelay(500);
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();

        await advanceRevealDelay(LOSS_REVEAL_DELAY_MS - 500);
        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Release Remains Unclassified')).toBeInTheDocument();

        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELEASE_COMPLETED) || '{}');
        expect(completed.unlimited).toEqual([]);

        // Even on a loss, `revealedCharacter` should resolve to the full
        // answer release (finalizeGame always reveals, win or lose).
        expect(useReleaseGame.getState().revealedCharacter?.id).toBe(TARGET_1.id);
    });

    it('advances to the next round and clears guesses when closing the summary after a win', async () => {
        render(<UnlimitedReleaseWrapper />);
        await screen.findByPlaceholderText('ENTER TECHNIQUE NAME...');

        const currentTarget = useReleaseGame.getState().target;
        const currentRelease = ALL_RELEASES.find((r) => r.id === currentTarget?.id)!;
        await selectTechnique(currentRelease.technique_name);
        await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });

        const closeBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(useReleaseGame.getState().guesses).toHaveLength(0);
        });

        expect(useReleaseGame.getState().target).not.toBeNull();
    });

    describe('Central 46 Classified Archive Lifecycle Flow', () => {
        it('transitions to Central 46 Archive when the last release is completed and modal is closed', async () => {
            localStorage.setItem(
                STORAGE_KEYS.RELEASE_COMPLETED,
                // Everything except RELEASE_2 is already completed.
                JSON.stringify({ unlimited: [RELEASE_1.id, WRONG_1.id, WRONG_2.id, WRONG_3.id] })
            );

            useReleaseGame.setState({
                target: TARGET_2,
                revealedCharacter: null,
                guesses: [],
                hasFinalized: false,
            } satisfies Partial<ReleaseGameState>);

            render(<UnlimitedReleaseWrapper />);
            await screen.findByPlaceholderText('ENTER TECHNIQUE NAME...');

            await selectTechnique(RELEASE_2.technique_name); // RELEASE_2 is the target
            await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

            await waitFor(() => {
                expect(screen.getByTestId('summary')).toBeInTheDocument();
            });

            const nextBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
            fireEvent.click(nextBtn);

            await waitFor(() => {
                expect(screen.getByTestId('c46-archive')).toBeInTheDocument();
            });
        });

        it('purges progress, completed targets, and current streak upon initializing a NEW LIFE cycle', async () => {
            localStorage.setItem(
                STORAGE_KEYS.RELEASE_COMPLETED,
                JSON.stringify({ unlimited: [RELEASE_1.id, WRONG_1.id, WRONG_2.id, WRONG_3.id] })
            );

            const initialStats = {
                currentStreak: 5,
                maxStreak: 12,
                playedCount: 5,
                passedCount: 0,
                guessDistribution: { '1': 5 },
            };
            localStorage.setItem(
                STORAGE_KEYS.RELEASE_STATS,
                JSON.stringify({ unlimited: initialStats })
            );

            useReleaseGame.setState({
                target: TARGET_2,
                revealedCharacter: null,
                guesses: [],
                hasFinalized: false,
                stats: initialStats,
            } satisfies Partial<ReleaseGameState>);

            render(<UnlimitedReleaseWrapper />);
            await screen.findByPlaceholderText('ENTER TECHNIQUE NAME...');

            await selectTechnique(RELEASE_2.technique_name);
            await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

            await waitFor(() => {
                expect(screen.getByTestId('summary')).toBeInTheDocument();
            });
            const closeBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
            fireEvent.click(closeBtn);

            await waitFor(() => {
                expect(screen.getByTestId('c46-archive')).toBeInTheDocument();
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

            const completedJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELEASE_COMPLETED) || '{}');
            expect(completedJson.unlimited).toEqual([]);

            const statsJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELEASE_STATS) || '{}');
            expect(statsJson.unlimited.currentStreak).toBe(0);
            expect(statsJson.unlimited.maxStreak).toBe(12);

            const progressJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.RELEASE_PROGRESS) || '{}');
            expect(progressJson.unlimited.state.guesses).toEqual([]);
            expect(progressJson.unlimited.state.hasFinalized).toBe(false);
            expect(progressJson.unlimited.state.target).not.toBeNull();
        });
    });
});