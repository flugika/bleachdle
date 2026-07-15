// src/features/character/components/daily/__tests__/DailyCharacterWrapper.test.tsx
// pnpm --prefix client test src/features/character/components/daily/__tests__/DailyCharacterWrapper.test.tsx
//
// ⚠️ REPLACES the old `ClassicGameContainer.test.tsx`.
//
// Why the old test was wrong (senior review):
//   1. It rendered `<ClassicGameContainer />`, a standalone legacy component
//      that hits `supabaseClient` directly and hand-rolls its own compare
//      logic. That component is NOT what ships in the app — the real daily
//      flow is `DailyCharacterWrapper` → `useCharacterGame` (daily store,
//      zustand + persist) → `<SearchBar />` / `<CharacterGuessTable />`.
//   2. It asserted on `data-testid="search-input"`, `data-testid="suggestions"`,
//      `data-testid="suggestion-item"`, `<table>` markup, `data-color-tag`,
//      and a `share-modal` with literal text "🎉 VICTORY!". None of these
//      exist in the real components: `SearchBar.tsx` renders a plain
//      `placeholder="ENTER SOUL NAME..."` input with a portal `<ul>`/`<li>`
//      dropdown (no testids), and `CharacterGuessTable.tsx` renders `<div>`
//      rows (`id={`row-${guess.id}`}`), not a `<table>`.
//   3. It asserted an `increment_daily_stat` RPC payload shape that belongs
//      to the legacy component, not to `recordDailyStat` in
//      `src/services/statsClient`, which is what the real store calls.
//   4. "Classic" isn't a real mode in this codebase — modes are
//      `'daily'` and `'unlimited'`. This file tests the daily mode.
//
// Assumptions flagged for whoever wires this up (source for these wasn't
// provided, so they're stubbed as dumb pass-throughs — swap for the real
// components/values once available):
//   - Header / SubHeader / ModeBadge / ModeSelectorModal / Legend /
//     DailyHubModalFooter / useSenkaimon / useDailyHub / Sealed are pure
//     layout/navigation chrome unrelated to game logic → stubbed.
//   - CharacterSummaryGuess is stubbed too, EXCEPT we still assert on the
//     two subtitle strings that live directly in that component's own
//     source ("Reishi Signature Resonance Confirmed" / "Konpaku Link
//     Severed") so the test breaks if that wiring ever changes — but we
//     don't try to render its full DOM tree (SummaryCardShell etc. weren't
//     provided).
//   - FEATURE_FLAGS.daily.character is assumed `true` for these tests.

import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // beforeAll มาจาก vitest ไม่ใช่ testing-library — ดูด้านล่าง
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import DailyCharacterWrapper from '@/src/features/character/components/daily/DailyCharacterWrapper';
import { useCharacterGame } from '@/src/features/character/hooks/daily/useCharacterGame'; // 🆕 เพิ่ม import นี้
import { STORAGE_KEYS } from '@/src/const/localStorage';
import { Character } from '@/src/entities/character/schema';

// ── Fixtures ────────────────────────────────────────────────────────────────
// Typed as `Character` (not inferred) so literal fields like `gender` don't
// widen to `string` and fail the `initialTarget: Character | null` prop type.
const ICHIGO: Character = {
    id: 'ichigo', name: 'Ichigo Kurosaki', gender: 'Male',
    race: ['Shinigami', 'Hollow', 'Human'], affiliation: 'Independent',
    height_cm: 181, age: 19, eye_color: 'Brown', hair_color: 'Orange',
    first_appearance_chapter: 'Agent of the Shinigami', weapon: ['Weaponized'],
    release: ['Shikai', 'Bankai'], primary_ability: ['Physical'], image: 'ichigo.webp',
};
const RUKIA: Character = {
    id: 'rukia', name: 'Rukia Kuchiki', gender: 'Female',
    race: ['Shinigami'], affiliation: 'Gotei 13',
    height_cm: 144, age: 150, eye_color: 'Violet', hair_color: 'Black',
    first_appearance_chapter: 'Agent of the Shinigami', weapon: ['Weaponized'],
    release: ['Shikai'], primary_ability: ['Physical'], image: 'rukia.webp',
};
const ISHIDA: Character = {
    id: 'ishida', name: 'Uryu Ishida', gender: 'Male',
    race: ['Quincy'], affiliation: 'Independent',
    height_cm: 177, age: 17, eye_color: 'Blue', hair_color: 'Black',
    first_appearance_chapter: 'Agent of the Shinigami', weapon: ['Weaponized'],
    release: ['Vollstandig'], primary_ability: ['Kido'], image: 'ishida.webp',
};
const ALL: Character[] = [ICHIGO, RUKIA, ISHIDA];

vi.mock('@/src/features/character/character', () => ({
    getCharacters: () => ALL,
    getCharacterById: (id: string) => ALL.find(c => c.id === id),
}));

const recordDailyStat = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/services/statsClient', () => ({ recordDailyStat: (...args: unknown[]) => recordDailyStat(...args) }));

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
vi.mock('@/src/features/character/components/shared/CharacterHowToPlayModal', () => ({ CharacterHowToPlayModal: () => null }));
vi.mock('@/src/shared/ui/context/NavigationContext', () => ({
    useSenkaimon: () => ({ navigate: vi.fn(), state: 'idle', reportReady: vi.fn() }),
}));
vi.mock('@/src/shared/hooks/useDailyHub', () => ({
    useDailyHub: () => ({ markModePlayed: vi.fn() }),
}));
vi.mock('@/src/config/feature.flags', () => ({ FEATURE_FLAGS: { daily: { character: true } } }));
vi.mock('@/src/lib/debug/logFullTarget', () => ({ logFullTarget: () => { } }));

// Summary screen: real component has deep unknown subtree (SummaryCardShell,
// TierBadgeCard, etc.) — assert only on the strings that live in
// CharacterSummaryGuess.tsx itself, so this test still catches a real wiring
// regression (wrong isWin passed down) without depending on unseen children.
vi.mock('@/src/features/character/components/shared/CharacterSummaryGuess', () => ({
    CharacterSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Reishi Signature Resonance Confirmed' : 'Konpaku Link Severed'}</p>
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
async function selectCharacter(name: string) {
    const input = screen.getByPlaceholderText('ENTER SOUL NAME...');
    fireEvent.change(input, { target: { value: name } });
    fireEvent.focus(input);

    // SearchBar's dropdown is a portal <ul>/<li> — no testid, select by role/text.
    const option = await screen.findByText(name);
    fireEvent.mouseDown(option);
}

beforeEach(() => {
    localStorage.clear();
    recordDailyStat.mockClear();
    useCharacterGame.setState({
        target: null,
        targetId: null,
        guesses: [],
        hasFinalized: false,
        _hasHydrated: true,
    });
});

beforeAll(() => {
    // 🩹 jsdom ไม่ implement Element.scrollIntoView จริง — SearchBar.tsx เรียก
    // ทั้ง wrapRef.current?.scrollIntoView(...) และ rowEl.scrollIntoView(...)
    // ตอน handleSelect ทุกครั้งที่เลือกตัวละคร ถ้าไม่ stub ตรงนี้จะ throw
    // "scrollIntoView is not a function" ตั้งแต่การเลือกตัวละครครั้งแรก
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
});

describe('DailyCharacterWrapper (daily mode) — real component integration', () => {
    it('renders the search input once hydrated, with today\'s target wired in', async () => {
        render(<DailyCharacterWrapper initialTarget={ICHIGO} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER SOUL NAME...')).toBeInTheDocument();
        });
    });

    it('records a wrong guess as a row, then a correct guess ends the game and reports isWin=true', async () => {
        render(<DailyCharacterWrapper initialTarget={ICHIGO} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        await selectCharacter('Rukia Kuchiki');
        await waitFor(() => {
            expect(document.getElementById(`row-${RUKIA.id}`)).toBeInTheDocument();
        });

        await selectCharacter('Ichigo Kurosaki');

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByText('Reishi Signature Resonance Confirmed')).toBeInTheDocument();

        await waitFor(() => {
            expect(recordDailyStat).toHaveBeenCalledWith('character', true, 2, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
        });
    });

    it('persists guesses across remounts via localStorage hydration', async () => {
        const { unmount } = render(<DailyCharacterWrapper initialTarget={ICHIGO} />);
        await waitFor(() => screen.getByPlaceholderText('ENTER SOUL NAME...'));

        await selectCharacter('Rukia Kuchiki');
        await waitFor(() => {
            expect(document.getElementById(`row-${RUKIA.id}`)).toBeInTheDocument();
        });

        unmount();

        render(<DailyCharacterWrapper initialTarget={ICHIGO} />);
        await waitFor(() => {
            expect(document.getElementById(`row-${RUKIA.id}`)).toBeInTheDocument();
        });
    });

    it('shows the daily lockout summary immediately when the day is already completed', async () => {
        const fullCorrectOutcome = {
            gender: 'correct',
            race: 'correct',
            affiliation: 'correct',
            height: 'correct',
            age: 'correct',
            eye_color: 'correct',
            hair_color: 'correct',
            first_appearance_chapter: 'correct',
            weapon: 'correct',
            release: 'correct',
            primary_ability: 'correct',
            image: ICHIGO.image,
        };

        localStorage.setItem(
            STORAGE_KEYS.CHARACTER_PROGRESS,
            JSON.stringify({
                daily: {
                    state: {
                        guesses: [{ guess: ICHIGO, result: fullCorrectOutcome, isNew: false }],
                        targetId: ICHIGO.id,
                        hasFinalized: true,
                    },
                    version: 0,
                },
            })
        );

        await useCharacterGame.persist.rehydrate();

        render(<DailyCharacterWrapper initialTarget={ICHIGO} />);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.queryByPlaceholderText('ENTER SOUL NAME...')).not.toBeInTheDocument();
    });
});