// src/features/emoji/components/unlimited/__tests__/UnlimitedEmojiWrapper.test.tsx
// pnpm --prefix client test src/features/emoji/components/unlimited/__tests__/UnlimitedEmojiWrapper.test.tsx

// 🎯 INTEGRATION TEST FOR UNLIMITED EMOJI MODE
//
// Modeled directly on `UnlimitedSongWrapper.test.tsx` (same store-manipulation
// style via `useEmojiGame.setState`, same fake-timer discipline, same
// Central 46 Archive lifecycle coverage). Key differences from the song
// version, all confirmed from source actually provided:
//
//   - The reveal delay constants (1600ms win / 900ms loss) are the SAME
//     numbers as unlimited song — confirmed directly in
//     `app/unlimited/emoji/page.tsx`: `const delay = isWin ? 1600 : 900;`.
//   - There is no audio player / reveal-ladder-by-milliseconds here.
//     Instead, `revealedCount` (1→4) is a derived counter recomputed by the
//     REAL store on every `addGuess` (see `emojiRevealedCounter.ts`):
//     +1 symbol per 2 wrong guesses, capped at 4. Because this value lives
//     on the store and is only recomputed inside `addGuess`, we can't fake
//     it by directly overwriting `guesses` via `setState` the way the song
//     test fakes a long clip-length ladder — doing so would desync
//     `revealedCount` from `guesses`. So the reveal-ladder test below drives
//     guesses through the REAL `SearchBar` (real component, no mock) so
//     `addGuess` recomputes `revealedCount` itself.
//   - `EmojiControlPanel` and `SearchBar` are REAL components (sources were
//     provided) — not stubbed. `EmojiTestimonyDisplay`'s internals were NOT
//     provided in full, so it's stubbed to reproduce only the on-screen
//     readout confirmed via screenshot: "`${revealedCount} / 4 UNSEALED`".
//   - `Central46ConfidentialArchive` internals were not provided either;
//     the stub below is copied verbatim from the song test (same shared
//     component, same prop contract: mode/guesses/soulName/inputName/
//     setInputName/handleRegisterSoul/reincarnationCount/canReset/
//     handleHardReset/stats).
//
// ⚠️ ASSUMED, not confirmed by any provided source:
//   - `MAX_UNLIMITED_EMOJI_GUESSES` is mocked as `10` (same guess as the
//     daily-emoji vitest file). Adjust to the real constant if it differs —
//     otherwise the "runs out of guesses" style assertions may never fire.

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import UnlimitedEmojiWrapper from '@/src/features/emoji/components/unlimited/UnlimitedEmojiWrapper';
import { useEmojiGame } from '@/src/features/emoji/hooks/unlimited/useEmojiGame';
import { STORAGE_KEYS } from '@/src/const/localStorage';

type EmojiGameState = ReturnType<typeof useEmojiGame.getState>;

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

    // Hidden target shape { id, character_id } — matches `EmojiTargetHidden`.
    const SET_1 = { id: 'set-ichigo', character_id: ICHIGO.id, emoji_list: ['🍓', '⚔️', '🧡', '👹'] };
    const SET_2 = { id: 'set-rukia', character_id: RUKIA.id, emoji_list: ['❄️', '🗡️', '⚪', '👑'] };
    const ALL_SETS = [SET_1, SET_2];

    return { hoistedFixtures: { ICHIGO, RUKIA, ISHIDA, ORIHIME, CHAD, ALL_CHARACTERS, SET_1, SET_2, ALL_SETS } };
});

export const { ICHIGO, RUKIA, ISHIDA, ORIHIME, CHAD, ALL_CHARACTERS, SET_1, SET_2, ALL_SETS } = hoistedFixtures;

vi.mock('@/src/features/character/character', () => ({
    getCharacters: () => hoistedFixtures.ALL_CHARACTERS,
    getCharacterById: (id: string) => hoistedFixtures.ALL_CHARACTERS.find((c) => c.id === id),
}));

vi.mock('@/src/features/emoji/emoji', () => ({
    getEmojiSets: () => hoistedFixtures.ALL_SETS,
    getEmojiGuessableCharacters: () => hoistedFixtures.ALL_CHARACTERS,
    getEmojiSetById: (id: string) => hoistedFixtures.ALL_SETS.find((s) => s.id === id),
}));

vi.mock('@/src/config/feature.flags', () => ({
    FEATURE_FLAGS: { daily: { emoji: true }, unlimited: { emoji: true } },
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
vi.mock('@/src/features/emoji/components/shared/EmojiHowToPlayModal', () => ({
    EmojiHowToPlayModal: () => null,
}));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// ⚠️ ASSUMED value — see file header disclaimer.
vi.mock('@/src/const/guess', () => ({
    MAX_UNLIMITED_EMOJI_GUESSES: 10,
    MAX_DAILY_EMOJI_GUESSES: 6,
}));

vi.mock('@/src/features/emoji/components/shared/EmojiSummaryGuess', () => ({
    EmojiSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Symbol Set Traced to Registered Soul' : 'Symbol Set Left Unattributed'}</p>
            <button onClick={onClose}>OPEN SENKAIMON</button>
        </div>
    ),
}));

// Dossier card internals not provided — stub reproduces just the on-screen
// unseal readout confirmed via screenshot, so tests can assert on the REAL
// `revealedCount` value coming out of the REAL store/derived counter.
vi.mock('@/src/features/emoji/components/shared/EmojiTestimonyDisplay', () => ({
    EmojiTestimonyDisplay: ({ revealedCount }: { revealedCount: number }) => (
        <div>{revealedCount} / 4 UNSEALED</div>
    ),
}));

// Central 46 Archive — copied verbatim from the song test's stub (same
// shared component, same prop contract).
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

describe('UnlimitedEmojiWrapper (unlimited mode) — real component integration', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        localStorage.clear();

        useEmojiGame.setState({
            target: SET_1,
            revealedCharacter: null,
            guesses: [],
            revealedCount: 1,
            hasFinalized: false,
            _hasHydrated: true,
            stats: {
                currentStreak: 0,
                maxStreak: 0,
                playedCount: 0,
                passedCount: 0,
                guessDistribution: {},
            },
        } as unknown as Partial<EmojiGameState>);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the search input, initializing a random emoji set target with 1/4 unsealed', async () => {
        render(<UnlimitedEmojiWrapper />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER SOUL NAME...')).toBeInTheDocument();
        });

        const target = useEmojiGame.getState().target;
        expect(target).not.toBeNull();
        expect(ALL_SETS.map((s) => s.id)).toContain(target?.id);
        expect(screen.getByText('1 / 4 UNSEALED')).toBeInTheDocument();
    });

    it('unseals one more symbol every 2 wrong guesses via the REAL store, up to the 4-symbol cap', async () => {
        render(<UnlimitedEmojiWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        // Wrong guess #1 (target is SET_1 -> ICHIGO) — still 1/4
        await selectCharacter(RUKIA.name);
        await waitFor(() => {
            expect(document.getElementById(`emoji-row-${RUKIA.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('1 / 4 UNSEALED')).toBeInTheDocument();

        // Wrong guess #2 -> floor(2/2) = 1 extra reveal -> 2/4
        await selectCharacter(ISHIDA.name);
        await waitFor(() => {
            expect(screen.getByText('2 / 4 UNSEALED')).toBeInTheDocument();
        });

        // Wrong guess #3 -> floor(3/2) = 1 -> stays 2/4
        await selectCharacter(ORIHIME.name);
        await waitFor(() => {
            expect(document.getElementById(`emoji-row-${ORIHIME.id}`)).toBeInTheDocument();
        });
        expect(screen.getByText('2 / 4 UNSEALED')).toBeInTheDocument();

        // Wrong guess #4 -> floor(4/2) = 2 -> 3/4
        await selectCharacter(CHAD.name);
        await waitFor(() => {
            expect(screen.getByText('3 / 4 UNSEALED')).toBeInTheDocument();
        });
    });

    it('shows victory summary after WIN_REVEAL_DELAY_MS (1600ms) upon a correct guess', async () => {
        render(<UnlimitedEmojiWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        await selectCharacter(ICHIGO.name); // ICHIGO is the target for SET_1

        await advanceRevealDelay(1000);
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();

        await advanceRevealDelay(WIN_REVEAL_DELAY_MS - 1000);
        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Symbol Set Traced to Registered Soul')).toBeInTheDocument();

        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_COMPLETED) || '{}');
        expect(completed.unlimited).toContain(SET_1.id);
    });

    it('shows loss summary after LOSS_REVEAL_DELAY_MS (900ms), shorter than the win delay', async () => {
        // Force a loss: guesses maxed out with no correct entry.
        act(() => {
            useEmojiGame.setState({
                guesses: [
                    { guess: RUKIA, status: 'wrong', isNew: true },
                    ...Array(9).fill({ guess: RUKIA, status: 'wrong', isNew: false }),
                ],
                revealedCount: 4,
            } as unknown as Partial<EmojiGameState>);
        });

        render(<UnlimitedEmojiWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        await advanceRevealDelay(500);
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();

        await advanceRevealDelay(LOSS_REVEAL_DELAY_MS - 500);
        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Symbol Set Left Unattributed')).toBeInTheDocument();

        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_COMPLETED) || '{}');
        expect(completed.unlimited).toEqual([]);
    });

    it('advances to the next round and resets revealedCount to 1 when closing the summary after a win', async () => {
        render(<UnlimitedEmojiWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        const currentTarget = useEmojiGame.getState().target;
        const currentCharacter = ALL_CHARACTERS.find((c) => c.id === currentTarget?.character_id)!;
        await selectCharacter(currentCharacter.name);
        await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });

        const closeBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(useEmojiGame.getState().guesses).toHaveLength(0);
        });

        expect(useEmojiGame.getState().target).not.toBeNull();
        expect(useEmojiGame.getState().revealedCount).toBe(1);
    });

    describe('Central 46 Classified Archive Lifecycle Flow', () => {
        it('transitions to Central 46 Archive when the last emoji set is completed and modal is closed', async () => {
            localStorage.setItem(
                STORAGE_KEYS.EMOJI_COMPLETED,
                JSON.stringify({ unlimited: [SET_1.id] }) // SET_2 is the last remaining one
            );

            useEmojiGame.setState({
                target: SET_2,
                revealedCharacter: null,
                guesses: [],
                revealedCount: 1,
                hasFinalized: false,
            } as unknown as Partial<EmojiGameState>);

            render(<UnlimitedEmojiWrapper />);
            await screen.findByPlaceholderText('ENTER SOUL NAME...');

            await selectCharacter(RUKIA.name); // RUKIA is the target for SET_2
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
                STORAGE_KEYS.EMOJI_COMPLETED,
                JSON.stringify({ unlimited: [SET_1.id] })
            );

            const initialStats = {
                currentStreak: 5,
                maxStreak: 12,
                playedCount: 5,
                passedCount: 0,
                guessDistribution: { '1': 5 },
            };
            localStorage.setItem(
                STORAGE_KEYS.EMOJI_STATS,
                JSON.stringify({ unlimited: initialStats })
            );

            useEmojiGame.setState({
                target: SET_2,
                revealedCharacter: null,
                guesses: [],
                revealedCount: 1,
                hasFinalized: false,
                stats: initialStats,
            } as unknown as Partial<EmojiGameState>);

            render(<UnlimitedEmojiWrapper />);
            await screen.findByPlaceholderText('ENTER SOUL NAME...');

            await selectCharacter(RUKIA.name);
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

            const completedJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_COMPLETED) || '{}');
            expect(completedJson.unlimited).toEqual([]);

            const statsJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_STATS) || '{}');
            expect(statsJson.unlimited.currentStreak).toBe(0);
            expect(statsJson.unlimited.maxStreak).toBe(12);

            const progressJson = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOJI_PROGRESS) || '{}');
            expect(progressJson.unlimited.state.guesses).toEqual([]);
            expect(progressJson.unlimited.state.hasFinalized).toBe(false);
            expect(progressJson.unlimited.state.target).not.toBeNull();
            expect(progressJson.unlimited.state.revealedCount).toBe(1);
        });
    });
});