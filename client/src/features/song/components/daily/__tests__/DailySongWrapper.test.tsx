// src/features/song/components/daily/__tests__/DailySongWrapper.test.tsx
// pnpm --prefix client test src/features/song/components/daily/__tests__/DailySongWrapper.test.tsx

// 🎯 INTEGRATION TEST FOR DAILY SONG MODE
//
// ⚠️⚠️⚠️ READ BEFORE RUNNING — THIS FILE IS A BEST-EFFORT SCAFFOLD ⚠️⚠️⚠️
//
// Unlike every other test file in this batch (DailyCharacterWrapper,
// DailyEmojiWrapper, UnlimitedSongGame, UnlimitedEmojiGame), the ACTUAL
// SOURCE of the daily song wrapper component and its daily store hook were
// NEVER PROVIDED in this conversation. Everything below is reconstructed by
// analogy from:
//   - `daily-song-flow.spec.ts` (Playwright e2e spec) — confirms the route
//     `/daily/song`, the placeholder `ENTER TRACK, ARTIST, OR OP/ED...`,
//     the `<li>` dropdown selection pattern, the `SONG READY` audio-ready
//     text, the `row-${id}` DOM id convention (NOT `song-row-`, per that
//     spec file), and text `REISHI KAKUNIN` / `Track Verified` on win.
//   - `createDailyGuessGameStore.ts` (real, provided) — the generic daily
//     store factory this hook is assumed to be built from.
//   - `UnlimitedSongWrapper.test.tsx` (real, provided) — the sibling unlimited
//     test, whose `useSongGame` unlimited store shape (`target`,
//     `targetSegmentId`, `guesses`, `hasFinalized`, `_hasHydrated`, `stats`)
//     is assumed to carry over to the daily store, since both would be
//     built by the two sibling factories over the same `Song`/`Segment`
//     domain types.
//
// Concretely ASSUMED and UNVERIFIED — fix these against the real source
// before trusting this file:
//   1. Component path: `@/src/features/song/components/daily/DailySongWrapper`
//      exporting a default component. CONFIRMED (via a real TS2741 error
//      surfaced against the actual component) that its props are
//      `DailySongWrapperProps = { initialTarget, initialSegmentId }` — i.e.
//      unlike character/emoji daily wrappers (single `initialTarget` prop),
//      song mode needs the segment id passed in separately alongside the
//      song target. All render() calls below pass both.
//   2. Hook path: `@/src/features/song/hooks/daily/useSongGame`, built via
//      `createDailyGuessGameStore`, with an extra `targetSegmentId` field
//      (song mode needs to know WHICH segment/clip plays, unlike character
//      or emoji daily modes).
//   3. Reveal delay before showing the summary modal: UNKNOWN exact value.
//      Emoji's daily wrapper uses a flat 2500ms; unlimited song uses
//      1600ms win / 900ms loss (asymmetric). Since daily song's own delay
//      constant was never shown, this file assumes the SAME asymmetric
//      1600/900 split as unlimited song (same feature, same game) but
//      FLAGS every timer-dependent assertion so they're easy to find and
//      correct if the real component uses different numbers.
//   4. `isWin` condition assumed as `guesses[0]?.status === 'correct'`
//      (matches the daily-mode convention seen in `DailyEmojiWrapper`,
//      which only looks at the latest guess — NOT `.some()` across all
//      guesses like the unlimited stores do).
//   5. `MAX_DAILY_SONG_GUESSES` mocked as `6`, matching the pattern used
//      for `MAX_DAILY_EMOJI_GUESSES` in the daily-emoji test — pure guess.
//   6. `SongSummaryGuess`'s subtitle strings for daily mode are assumed
//      identical to the unlimited-mode stub already used in
//      `UnlimitedSongWrapper.test.tsx` ("Melodic Reiatsu Resonance Confirmed"
//      / "Melodic Link Severed"), since no daily-specific copy was ever
//      shown.
//   7. `DailyHubModalFooter` is stubbed to `null` exactly like in the
//      character/emoji daily tests — its real markup was never provided.
//
// If/when the real `DailySongWrapper.tsx` and daily `useSongGame.ts` files
// are available, this header comment plus every "⚠️ ASSUMED" marker inline
// below should be treated as a checklist to reconcile against them.

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import DailySongWrapper from '@/src/features/song/components/daily/DailySongWrapper';
import { useSongGame } from '@/src/features/song/hooks/daily/useSongGame';
import { STORAGE_KEYS } from '@/src/const/localStorage';

type DailySongWrapperProps = React.ComponentProps<typeof DailySongWrapper>;
type SongGameState = ReturnType<typeof useSongGame.getState>;
const asTarget = (song: typeof SONG_1) =>
    song as unknown as DailySongWrapperProps['initialTarget'];

// ⚠️ ASSUMED — see header disclaimer #3.
const WIN_REVEAL_DELAY_MS = 1600;
const LOSS_REVEAL_DELAY_MS = 900;

// ─── 🛡️ 1. FIXTURES & MOCKS ───

const { hoistedSongs } = vi.hoisted(() => {
    const SONG_1 = {
        id: 'song-1',
        title: 'Asterisk',
        artist: 'Orange Range',
        album: 'OP-1',
        audio_url: '/assets/audio/songs/asterisk.mp3',
        youtube_url: null,
        spotify_url: null,
        character_id: null,
        segments: [{ id: 'seg-1', segment_name: 'INTRO', start_time_ms: 700, difficulty_level: 'easy' }],
    };

    const SONG_2 = {
        id: 'song-2',
        title: 'D-tecnoLife',
        artist: 'UVERworld',
        album: 'OP-2',
        audio_url: '/assets/audio/songs/d_tecnolife.mp3',
        youtube_url: null,
        spotify_url: null,
        character_id: null,
        segments: [{ id: 'seg-2', segment_name: 'FIRST VOCAL', start_time_ms: 900, difficulty_level: 'normal' }],
    };

    const ALL_SONGS = [SONG_1, SONG_2];

    return { hoistedSongs: { SONG_1, SONG_2, ALL_SONGS } };
});

export const { SONG_1, SONG_2, ALL_SONGS } = hoistedSongs;

vi.mock('@/src/features/song/song', () => ({
    getSongs: () => hoistedSongs.ALL_SONGS,
    getSongById: (id: string) => hoistedSongs.ALL_SONGS.find((s) => s.id === id),
}));

const recordDailyStat = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/services/statsClient', () => ({
    recordDailyStat: (...args: unknown[]) => recordDailyStat(...args),
}));

// ⚠️ ASSUMED value — see header disclaimer #5.
vi.mock('@/src/const/guess', () => ({
    MAX_DAILY_SONG_GUESSES: 6,
    MAX_UNLIMITED_SONG_GUESSES: 10,
}));

vi.mock('@/src/config/feature.flags', () => ({
    FEATURE_FLAGS: { daily: { song: true }, unlimited: { song: true } },
}));

vi.mock('@/src/shared/ui/context/NavigationContext', () => ({
    useSenkaimon: () => ({ navigate: vi.fn(), state: 'idle', reportReady: vi.fn() }),
}));
vi.mock('@/src/shared/hooks/useDailyHub', () => ({
    useDailyHub: () => ({ markModePlayed: vi.fn() }),
}));

vi.mock('@/src/shared/ui/Sealed', () => ({ default: () => <div data-testid="sealed">Sealed</div> }));
vi.mock('@/src/shared/ui/layout/Header', () => ({ Header: () => null }));
vi.mock('@/src/shared/ui/layout/Divider', () => ({ Divider: () => null }));
vi.mock('@/src/shared/ui/layout/SubHeader', () => ({ SubHeader: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeBadge', () => ({ ModeBadge: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeSelectorModal', () => ({ ModeSelectorModal: () => null }));
vi.mock('@/src/shared/ui/daily-hub/DailyHubModalFooter', () => ({ DailyHubModalFooter: () => null }));
vi.mock('@/src/shared/ui/Legend', () => ({ Legend: () => null }));
vi.mock('@/src/features/song/components/shared/SongHowToPlayModal', () => ({
    SongHowToPlayModal: () => null,
}));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// ⚠️ ASSUMED subtitle copy — see header disclaimer #6.
vi.mock('@/src/features/song/components/shared/SongSummaryGuess', () => ({
    SongSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Melodic Reiatsu Resonance Confirmed' : 'Melodic Link Severed'}</p>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();

    // SongAudioPlayer likely calls audioRef.current?.load()/play() on mount —
    // jsdom doesn't implement HTMLMediaElement playback, so stub it (same
    // as the unlimited song test) to avoid unhandled rejections/throws.
    window.HTMLMediaElement.prototype.load = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
});

// ─── 🧪 2. HELPERS ───

async function selectSong(title: string) {
    const input = await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');
    fireEvent.change(input, { target: { value: title } });
    fireEvent.focus(input);

    // Per daily-song-flow.spec.ts: option lives in an <li>.
    const option = await screen.findByText(title);
    fireEvent.mouseDown(option);
    fireEvent.click(option);
}

async function advanceRevealDelay(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    recordDailyStat.mockClear();

    // ⚠️ ASSUMED shape — see header disclaimer #2. `targetSegmentId` mirrors
    // the unlimited store's field for "which clip/segment to play".
    useSongGame.setState({
        target: SONG_1,
        targetSegmentId: 'seg-1',
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
    } satisfies Partial<SongGameState>);
});

afterEach(() => {
    vi.useRealTimers();
});

// ─── 🎯 3. TEST SUITE ───

describe('DailySongWrapper (daily mode) — real component integration [SCAFFOLD, unverified against real source]', () => {
    it("renders the search input once hydrated, with today's target wired in", async () => {
        render(<DailySongWrapper initialTarget={asTarget(SONG_1)} initialSegmentId="seg-1" />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...')).toBeInTheDocument();
        });

        expect(useSongGame.getState().target?.id).toBe(SONG_1.id);
    });

    it('records a wrong guess as a row, then a correct guess ends the game and reports isWin=true after the reveal delay', async () => {
        render(<DailySongWrapper initialTarget={asTarget(SONG_1)} initialSegmentId="seg-1" />);
        await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

        // Wrong guess: SONG_2
        await selectSong(SONG_2.title);
        await waitFor(() => {
            // Per daily-song-flow.spec.ts, rows use the plain `row-` prefix
            // (not `song-row-`) — unlike emoji mode's `emoji-row-`.
            expect(document.getElementById(`row-${SONG_2.id}`)).toBeInTheDocument();
        });

        // Winning guess: SONG_1 (the target)
        await selectSong(SONG_1.title);

        // ⚠️ ASSUMED delay — see header disclaimer #3. Adjust if the real
        // daily wrapper uses a different constant than unlimited song's.
        await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Melodic Reiatsu Resonance Confirmed')).toBeInTheDocument();

        await waitFor(() => {
            expect(recordDailyStat).toHaveBeenCalledWith('song', true, 2, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
        });

        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
        // Daily completion is date-keyed (see createDailyGuessGameStore.ts),
        // not id-keyed like unlimited — assert non-empty rather than a
        // specific date string to avoid brittle "today" formatting coupling.
        expect(completed.daily?.length).toBeGreaterThan(0);
    });

    it('persists guesses across remounts via localStorage hydration', async () => {
        const { unmount } = render(<DailySongWrapper initialTarget={asTarget(SONG_1)} initialSegmentId="seg-1" />);
        await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

        await selectSong(SONG_2.title);
        await waitFor(() => {
            expect(document.getElementById(`row-${SONG_2.id}`)).toBeInTheDocument();
        });

        unmount();

        render(<DailySongWrapper initialTarget={asTarget(SONG_1)} initialSegmentId="seg-1" />);
        await waitFor(() => {
            expect(document.getElementById(`row-${SONG_2.id}`)).toBeInTheDocument();
        });
    });

    it('shows the daily lockout summary immediately when the day is already completed', async () => {
        localStorage.setItem(
            STORAGE_KEYS.SONG_PROGRESS,
            JSON.stringify({
                daily: {
                    state: {
                        guesses: [{ guess: SONG_1, status: 'correct', isNew: false }],
                        target: SONG_1,
                        targetSegmentId: 'seg-1',
                        hasFinalized: true,
                    },
                    version: 0,
                },
            })
        );

        await useSongGame.persist.rehydrate();

        render(<DailySongWrapper initialTarget={asTarget(SONG_1)} initialSegmentId="seg-1" />);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.queryByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...')).not.toBeInTheDocument();
    });

    it('shows loss summary once guesses run out without a correct answer', async () => {
        // ⚠️ ASSUMED MAX_DAILY_SONG_GUESSES = 6 — see header disclaimer #5.
        act(() => {
            useSongGame.setState({
                guesses: [
                    { guess: SONG_2, status: 'wrong', isNew: true },
                    ...Array(5).fill({ guess: SONG_2, status: 'wrong', isNew: false }),
                ],
            } satisfies Partial<SongGameState>);
        });

        render(<DailySongWrapper initialTarget={asTarget(SONG_1)} initialSegmentId="seg-1" />);
        await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

        // ⚠️ ASSUMED delay — see header disclaimer #3.
        await advanceRevealDelay(LOSS_REVEAL_DELAY_MS);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Melodic Link Severed')).toBeInTheDocument();

        // Daily loss clears the streak-tracking `daily` completion array
        // entirely (per createDailyGuessGameStore.ts's finalizeGame: `[]`).
        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
        expect(completed.daily).toEqual([]);
    });
});