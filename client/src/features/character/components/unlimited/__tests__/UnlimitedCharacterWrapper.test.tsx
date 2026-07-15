// src/features/character/components/unlimited/__tests__/UnlimitedCharacterWrapper.test.tsx
// pnpm --prefix client test src/features/character/components/unlimited/__tests__/UnlimitedCharacterWrapper.test.tsx
//
// 🎯 INTEGRATION TEST FOR UNLIMITED CHARACTER MODE & CENTRAL 46 ARCHIVE

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import UnlimitedCharacterWrapper from '@/src/features/character/components/unlimited/UnlimitedCharacterWrapper';
import { useCharacterGame } from '@/src/features/character/hooks/unlimited/useCharacterGame';
import { STORAGE_KEYS } from '@/src/const/localStorage';

// ─── 🛡️ 1. FIXTURES & MOCKS ───

const { hoistedCharacters } = vi.hoisted(() => {
    const ICHIGO = {
        id: 'ichigo',
        name: 'Ichigo Kurosaki',
        gender: 'Male' as const,
        race: ['Shinigami', 'Hollow', 'Human'],
        affiliation: 'Independent',
        height_cm: 181,
        age: 19,
        eye_color: 'Brown',
        hair_color: 'Orange',
        first_appearance_chapter: 'Agent of the Shinigami',
        weapon: ['Weaponized'],
        release: ['Shikai', 'Bankai'],
        primary_ability: ['Physical'],
        image: 'ichigo.webp'
    };

    const RUKIA = {
        id: 'rukia',
        name: 'Rukia Kuchiki',
        gender: 'Female' as const,
        race: ['Shinigami'],
        affiliation: 'Gotei 13',
        height_cm: 144,
        age: 150,
        eye_color: 'Purple',
        hair_color: 'Black',
        first_appearance_chapter: 'Agent of the Shinigami',
        weapon: ['Weaponized'],
        release: ['Shikai', 'Bankai'],
        primary_ability: ['Kido'],
        image: 'rukia.webp'
    };

    const ISHIDA = {
        id: 'ishida',
        name: 'Uryu Ishida',
        gender: 'Male' as const,
        race: ['Quincy'],
        affiliation: 'Wandenreich',
        height_cm: 177,
        age: 19,
        eye_color: 'Blue',
        hair_color: 'Black',
        first_appearance_chapter: 'Agent of the Shinigami',
        weapon: ['Weaponized'],
        release: ['None'],
        primary_ability: ['Reishi'],
        image: 'ishida.webp'
    };

    const ALL_CHARACTERS = [ICHIGO, RUKIA, ISHIDA];

    return {
        hoistedCharacters: {
            ICHIGO,
            RUKIA,
            ISHIDA,
            ALL_CHARACTERS
        }
    };
});

export const { ICHIGO, RUKIA, ISHIDA, ALL_CHARACTERS } = hoistedCharacters;

const REVEAL_DELAY_MS = 2500;

vi.mock('@/src/features/character/character', () => ({
    getCharacters: () => hoistedCharacters.ALL_CHARACTERS,
    getCharacterById: (id: string) => hoistedCharacters.ALL_CHARACTERS.find(c => c.id === id),
    ALL_CHARACTERS: hoistedCharacters.ALL_CHARACTERS,
    default: hoistedCharacters.ALL_CHARACTERS
}));

vi.mock('@/data/characters', () => ({
    ALL_CHARACTERS: hoistedCharacters.ALL_CHARACTERS,
    default: hoistedCharacters.ALL_CHARACTERS
}));

vi.mock('@/src/config/feature.flags', () => ({
    FEATURE_FLAGS: {
        daily: { character: true },
        unlimited: { character: true }
    }
}));

vi.mock('@/src/shared/ui/context/NavigationContext', () => ({
    useSenkaimon: () => ({
        navigate: vi.fn(),
        state: 'idle',
        reportReady: vi.fn(),
    }),
}));

vi.mock('@/src/shared/ui/Sealed', () => ({
    default: () => <div data-testid="sealed">Sealed</div>,
}));
vi.mock('@/src/shared/ui/layout/Header', () => ({ Header: () => null }));
vi.mock('@/src/shared/ui/layout/Divider', () => ({ Divider: () => null }));
vi.mock('@/src/shared/ui/layout/SubHeader', () => ({ SubHeader: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeBadge', () => ({ ModeBadge: () => null }));
vi.mock('@/src/shared/ui/game-selector/ModeSelectorModal', () => ({ ModeSelectorModal: () => null }));
vi.mock('@/src/shared/ui/Legend', () => ({ Legend: () => null }));

vi.mock('@/src/features/character/components/shared/CharacterSummaryGuess', () => ({
    CharacterSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Reishi Signature Resonance Confirmed' : 'Konpaku Link Severed'}</p>
            <button onClick={onClose}>OPEN SENKAIMON</button>
        </div>
    ),
}));

// 🔥 REMOVED THE OLD MINIMAL MOCK TO TEST REAL CENTRAL 46 ARCHIVE COMPONENT FLOW!
// โหมด Mock ตัวเดิมถูกถอดออกแล้วเพื่อให้เอนจินของ Central46 ทำงานได้จริงเสมือนบนโปรดักชัน

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

async function advanceRevealDelay() {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(REVEAL_DELAY_MS);
    });
}

// Helper เร่งเวลาสำหรับหลบหลีก microtask/setTimeout ตอนเคลียร์เกม
async function flushPromises() {
    await act(async () => {
        await vi.runOnlyPendingTimersAsync();
    });
}

// ─── 🎯 3. TEST SUITE ───

describe('UnlimitedCharacterWrapper (unlimited mode) — real component integration', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        localStorage.clear();

        useCharacterGame.setState({
            targetId: ICHIGO.id,
            target: ICHIGO,
            guesses: [],
            hasFinalized: false,
            _hasHydrated: true, // ตั้งค่าพร้อมทดสอบกลไก
            stats: {
                currentStreak: 0,
                maxStreak: 0,
                playedCount: 0,
                passedCount: 0,
                guessDistribution: {},
            },
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the search input and automatically initializes a random target character', async () => {
        render(<UnlimitedCharacterWrapper />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER SOUL NAME...')).toBeInTheDocument();
        });

        const target = useCharacterGame.getState().target;
        expect(target).not.toBeNull();
        expect(ALL_CHARACTERS.map(c => c.id)).toContain(target?.id);
    });

    it('records wrong guesses in the table and shows victory summary upon a correct guess', async () => {
        render(<UnlimitedCharacterWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        const target = useCharacterGame.getState().target;
        expect(target).not.toBeNull();
        const wrongChar = target?.id === RUKIA.id ? ISHIDA : RUKIA;

        await selectCharacter(wrongChar.name);
        await waitFor(() => {
            expect(document.getElementById(`row-${wrongChar.id}`)).toBeInTheDocument();
        });

        await selectCharacter(target!.name);
        await advanceRevealDelay();

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Reishi Signature Resonance Confirmed')).toBeInTheDocument();
    });

    it('persists completed characters in localStorage and filters them out on the next round', async () => {
        localStorage.setItem(
            STORAGE_KEYS.CHARACTER_COMPLETED,
            JSON.stringify({ unlimited: [RUKIA.id] })
        );

        render(<UnlimitedCharacterWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        const target = useCharacterGame.getState().target;
        expect(target?.id).not.toBe(RUKIA.id);
        expect([ICHIGO.id, ISHIDA.id]).toContain(target?.id);
    });

    it('advances to the next round when clicking the "Next Character" button', async () => {
        render(<UnlimitedCharacterWrapper />);
        await screen.findByPlaceholderText('ENTER SOUL NAME...');

        const currentTarget = useCharacterGame.getState().target;
        expect(currentTarget).not.toBeNull();

        await selectCharacter(currentTarget!.name);
        await advanceRevealDelay();

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });

        const closeBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(useCharacterGame.getState().guesses).toHaveLength(0);
        });

        const newTarget = useCharacterGame.getState().target;
        expect(newTarget?.id).not.toBe(currentTarget!.id);
    });

    // ──────────────────────────────────────────────────────────────
    // 🏛️ CENTRAL 46 DEEP ARCHIVE INTEGRATION TESTS
    // ──────────────────────────────────────────────────────────────

    describe('Central 46 Classified Archive Lifecycle Flow', () => {
        beforeEach(() => {
            // Setup สเตทเริ่มต้นให้ชนะจนหมด Pool เหลือตัวสุดท้าย
            localStorage.setItem(
                STORAGE_KEYS.CHARACTER_COMPLETED,
                JSON.stringify({ unlimited: [ICHIGO.id, RUKIA.id] })
            );

            useCharacterGame.setState({
                targetId: ISHIDA.id,
                target: ISHIDA,
                guesses: [],
                hasFinalized: false,
                _hasHydrated: true,
            });
        });

        it('saves the registration soul name in localStorage under SOUL_REGISTRY key when etched', async () => {
            render(<UnlimitedCharacterWrapper />);

            // ปราบวิญญาณตัวสุดท้ายเพื่อบังคับเปิดหน้าต่างสภา 46
            await selectCharacter(ISHIDA.name);
            await advanceRevealDelay();

            const nextBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
            fireEvent.click(nextBtn);

            // 1. Verify: เอกสารลับต้องถูกเปิดขึ้นมา (มีข้อความเอกลักษณ์ของ Central 46)
            await waitFor(() => {
                expect(screen.getByText(/GREAT LOG GALLERY/i)).toBeInTheDocument();
            });

            // 2. Action: ตรวจจับช่องป้อนข้อมูลและส่งค่าชื่อวิญญาณเข้าไป
            const nameInput = screen.getByPlaceholderText('ENTER YOUR SOUL NAME');
            const etchButton = screen.getByRole('button', { name: /ETCH SOUL NAME/i });

            expect(etchButton).toBeDisabled(); // ต้องปิดใช้งานถ้ายังไม่ได้พิมพ์ค่า

            fireEvent.change(nameInput, { target: { value: 'Kurosaki' } });
            expect(etchButton).not.toBeDisabled(); // ต้องปลดล็อคทันทีหลังตรวจเจอกระแสวิญญาณ

            // 3. Submit: กดจารึกชื่อลงบนแผ่นป้ายข้อมูลถาวร
            fireEvent.click(etchButton);

            // 4. Assert Storage Integrity: ตรวจเช็คข้อมูลระดับ Database/LocalStorage
            await waitFor(() => {
                const storedRegistry = localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY);
                expect(storedRegistry).not.toBeNull();

                // ตรวจสอบว่ามีข้อมูลเก็บอยู่จริง (ปรับปรุงตามโครงสร้างจริงของแอปคุณ เช่น string ตรงๆ หรือ json)
                expect(storedRegistry).toContain('Kurosaki');
            });

            // 5. Assert UI Transformation: หน้ากระดาษต้องแปลงเป็น PERSONAL DOSSIER และเปลี่ยนหัวข้อทันที
            expect(screen.getByText('KUROSAKI')).toBeInTheDocument();
            expect(screen.getByText(/PERSONAL DOSSIER/i)).toBeInTheDocument();
        });

        it('purges progress, completed targets, and current streak upon initializing a NEW LIFE cycle', async () => {
            // 1. Arrange Seed State: ยัดข้อมูลปลอมใส่คลังข้อมูลเพื่อรอกดระเบิดล้างบาง
            localStorage.setItem(
                STORAGE_KEYS.CHARACTER_PROGRESS,
                JSON.stringify({ unlimited: { currentGuesses: ['mock-data'] } })
            );
            localStorage.setItem(
                STORAGE_KEYS.CHARACTER_COMPLETED,
                JSON.stringify({ unlimited: [ICHIGO.id, RUKIA.id, ISHIDA.id] })
            );

            // 🎯 FIX 1: ยัดชื่อวิญญาณลงคลัง เพื่อจำลองสภาวะที่ลงทะเบียนผ่านด่านแรกมาแล้ว
            localStorage.setItem(
                STORAGE_KEYS.SOUL_REGISTRY,
                JSON.stringify({
                    character: { name: 'Shinji', count: 1 }
                })
            );

            // 🎯 FIX 2: เคลียร์ targetId และ target เป็น null เพื่อกดดันให้คอมโพเนนต์รู้ว่า Pool ว่างเปล่าจริง
            useCharacterGame.setState({
                targetId: null,
                target: null,
                guesses: [],
                hasFinalized: false,
                _hasHydrated: true,
                stats: {
                    currentStreak: 5,
                    maxStreak: 12,
                    playedCount: 3,
                    passedCount: 0,
                    guessDistribution: {},
                }
            });

            // ดันข้อมูลเก็บลง Storage ประจำโหมด
            localStorage.setItem(
                STORAGE_KEYS.CHARACTER_STATS,
                JSON.stringify({
                    unlimited: { currentStreak: 5, maxStreak: 12, playedCount: 3, passedCount: 0, guessDistribution: {} }
                })
            );

            // โหลดแอป (เนื่องจาก Pool ว่างและได้รับการลงทะเบียนแล้ว หน้าสภา 46 ส่วนวิเคราะห์ข้อมูลจะเปิดทันที)
            render(<UnlimitedCharacterWrapper />);

            // 2. Action: มองหาปุ่มคำสั่งจุติใหม่ "NEW CYCLE, NEW LIFE"
            const newLifeCta = await screen.findByRole('button', { name: /NEW CYCLE, NEW LIFE/i });
            expect(newLifeCta).toBeInTheDocument();

            // 3. Execution: สั่งล้างบางรอบข้อมูลและเริ่มระบบใหม่ทั้งหมด
            fireEvent.click(newLifeCta);

            // บังคับสเต็ปของเทรดที่ค้างอยู่ (setTimeout ดึงตัวละครใหม่ใน hardReset) ให้ทำงานทันที
            await flushPromises();

            // 4. Assert Database Cleanliness: ตรวจสอบความสะอาดสะอ้านของคลังข้อมูลแยกชิ้นส่วน

            // A. Progress Data: ตรวจสอบว่าข้อมูลการทายเดิมถูกล้างหมดจด และถูกแทนที่ด้วยโครงสร้างเริ่มต้นรอบใหม่ที่สะอาด
            const progressRaw = localStorage.getItem(STORAGE_KEYS.CHARACTER_PROGRESS);
            const progressJson = JSON.parse(progressRaw || '{}');

            // ยืนยันว่าประวัติการเดาเก่าหายไป กลายเป็นอาเรย์ว่างสำหรับชีวิตใหม่
            expect(progressJson.unlimited.state.guesses).toEqual([]);
            expect(progressJson.unlimited.state.hasFinalized).toBe(false);
            // ยืนยันว่าระบบแอบสุ่มตัวละครเป้าหมายตัวใหม่ขึ้นมาให้แล้ว (ไม่เป็น null หรือเคลียร์ค้างไว้)
            expect(progressJson.unlimited.state.targetId).not.toBeNull();

            // B. Completed Data: รายชื่อตัวละครที่ชนะไปแล้วต้องถูกรีเซ็ตกลับเป็นอาเรย์ว่างเปล่าเพื่อนำกลับมาวนสุ่มใหม่
            const completedRaw = localStorage.getItem(STORAGE_KEYS.CHARACTER_COMPLETED);
            const completedJson = JSON.parse(completedRaw || '{}');
            expect(completedJson.unlimited).toEqual([]);

            // C. Store Recovery: ตัวเกมต้องสลัดสถานะหลุดออกจากร่างไร้ target กลับมาสุ่มตัวละครตัวแรกในวัฏจักรใหม่ได้ทันที
            const liveStoreState = useCharacterGame.getState();
            expect(liveStoreState.target).not.toBeNull();
            expect(liveStoreState.guesses).toHaveLength(0);

            // D. Streak Preservation Guard: เช็ค side effect ของระบบเก็บรักษาแต้มสูงสุด
            const statsRaw = localStorage.getItem(STORAGE_KEYS.CHARACTER_STATS);
            const statsJson = JSON.parse(statsRaw || '{}').unlimited;

            expect(statsJson.currentStreak).toBe(0);
            expect(statsJson.maxStreak).toBe(12); // ค่าสูงสุดของจิตวิญญาณยังคงได้รับการจดจำ
        });
    });
});