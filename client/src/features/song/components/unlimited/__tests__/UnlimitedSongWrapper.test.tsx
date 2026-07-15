// src/features/song/components/unlimited/__tests__/UnlimitedSongWrapper.test.tsx
// pnpm --prefix client test src/features/song/components/unlimited/__tests__/UnlimitedSongWrapper.test.tsx

// 🎯 INTEGRATION TEST FOR UNLIMITED SONG MODE

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import UnlimitedSongWrapper from '@/src/features/song/components/unlimited/UnlimitedSongWrapper';
import { useSongGame } from '@/src/features/song/hooks/unlimited/useSongGame';
import { STORAGE_KEYS } from '@/src/const/localStorage';

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

    const ALL_SEGMENTS = ALL_SONGS.flatMap(song =>
        song.segments.map(seg => ({ ...seg, song_id: song.id }))
    );

    return { hoistedSongs: { SONG_1, SONG_2, ALL_SONGS, ALL_SEGMENTS } };
});

export const { SONG_1, SONG_2, ALL_SONGS } = hoistedSongs;

// 🎯 delay จริงที่ page.tsx ใช้ — ต่างกันระหว่างแพ้/ชนะ (คนละแบบกับ character ที่คงที่ 2500ms ทั้งคู่)
const WIN_REVEAL_DELAY_MS = 1600;
const LOSS_REVEAL_DELAY_MS = 900;

vi.mock('@/src/features/song/song', () => ({
    getSongs: () => hoistedSongs.ALL_SONGS,
    getSongById: (id: string) => hoistedSongs.ALL_SONGS.find(s => s.id === id),
    getAllSongSegments: () => hoistedSongs.ALL_SEGMENTS,
}));

vi.mock('@/src/config/feature.flags', () => ({
    FEATURE_FLAGS: {
        daily: { song: true },
        unlimited: { song: true },
    },
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
vi.mock('@/src/features/song/components/shared/SongHowToPlayModal', () => ({
    SongHowToPlayModal: () => null,
}));

vi.mock('@/src/features/song/components/shared/SongSummaryGuess', () => ({
    SongSummaryGuess: ({ isWin, onClose }: { isWin: boolean; onClose: () => void }) => (
        <div data-testid="summary">
            <p>{isWin ? 'Melodic Reiatsu Resonance Confirmed' : 'Melodic Link Severed'}</p>
            <button onClick={onClose}>OPEN SENKAIMON</button>
        </div>
    ),
}));

// เปลี่ยนแปลงการ Mock ของ Central46ConfidentialArchive ด้านบนของไฟล์ทดสอบ
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

    // 🛡️ SongAudioPlayer เรียก audioRef.current?.load() ทันทีที่ target เปลี่ยน (useEffect on mount)
    // jsdom ไม่ implement HTMLMediaElement.load()/play() จริง — ต้อง stub ไว้ก่อน ไม่งั้น throw
    window.HTMLMediaElement.prototype.load = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
});

// ─── 🧪 2. HELPERS ───

async function selectSong(name: string) {
    const input = await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');
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

describe('UnlimitedSongWrapper (unlimited mode) — real component integration', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        localStorage.clear();

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
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the search input and audio player, initializing a random target song', async () => {
        render(<UnlimitedSongWrapper />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...')).toBeInTheDocument();
        });

        const target = useSongGame.getState().target;
        expect(target).not.toBeNull();
        expect(ALL_SONGS.map(s => s.id)).toContain(target?.id);
    });

    it('shows the 200ms clip length before any guess, then advances the reveal ladder after each wrong guess', async () => {
        render(<UnlimitedSongWrapper />);
        await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

        // 🎯 ก่อนเดาเลย (attemptIndex = guesses.length = 0) ต้องเห็น "200ms"
        expect(screen.getByText('200ms')).toBeInTheDocument();

        // เดาผิดครั้งที่ 1 (SONG_2 ไม่ใช่ target ซึ่งคือ SONG_1) → attemptIndex กลายเป็น 1 → 500ms
        await selectSong(SONG_2.title);
        await waitFor(() => {
            expect(screen.getByText('500ms')).toBeInTheDocument();
        });

        // ครั้งนี้เดา SONG_2 ไปแล้ว จะเดาซ้ำไม่ได้ (ถูก guard กันซ้ำใน addGuess) เลย force
        // เปลี่ยน guesses ตรงๆ ผ่าน store เพื่อจำลองการเดาผิดต่อเนื่องหลายครั้งแบบไม่ผูกกับ
        // จำนวนเพลง mock ที่มีจำกัดแค่ 2 เพลง (ในของจริงจะมีเพลงมากพอให้เดาผิดได้เรื่อยๆ)
        act(() => {
            useSongGame.setState({
                guesses: [
                    { guess: SONG_2, status: 'wrong', isNew: true },
                    { guess: SONG_2, status: 'wrong', isNew: false },
                    { guess: SONG_2, status: 'wrong', isNew: false },
                ],
            });
        });
        // attemptIndex = 3 → ladder index 3 → 3000ms → format เป็น "3s"
        await waitFor(() => {
            expect(screen.getByText('3s')).toBeInTheDocument();
        });

        act(() => {
            useSongGame.setState({
                guesses: Array(5).fill({ guess: SONG_2, status: 'wrong', isNew: false }),
            });
        });
        // attemptIndex = 5 → ladder index 5 (สุดท้าย) → 10000ms → "10s"
        await waitFor(() => {
            expect(screen.getByText('10s')).toBeInTheDocument();
        });

        act(() => {
            useSongGame.setState({
                guesses: Array(9).fill({ guess: SONG_2, status: 'wrong', isNew: false }),
            });
        });
        // เกิน ladder length (index 9 > 5) ต้อง clamp ค้างที่ "10s" ไม่ throw ไม่ undefined
        await waitFor(() => {
            expect(screen.getByText('10s')).toBeInTheDocument();
        });
    });

    it('shows victory summary after WIN_REVEAL_DELAY_MS (1600ms) upon a correct guess', async () => {
        render(<UnlimitedSongWrapper />);
        await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

        await selectSong(SONG_1.title); // SONG_1 คือ target ตรงๆ

        // ยังไม่ครบ 1600ms ห้ามเห็น summary
        await advanceRevealDelay(1000);
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();

        await advanceRevealDelay(WIN_REVEAL_DELAY_MS - 1000);
        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Melodic Reiatsu Resonance Confirmed')).toBeInTheDocument();

        // finalizeGame ต้องถูกเรียกและบันทึกลง completed list แล้ว
        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
        expect(completed.unlimited).toContain(SONG_1.id);
    });

    it('shows loss summary after LOSS_REVEAL_DELAY_MS (900ms), shorter than the win delay', async () => {
        // 🎯 บังคับแพ้: เดาผิดจนครบ MAX_UNLIMITED_SONG_GUESSES โดยไม่มี guess ไหน status==='correct'
        act(() => {
            useSongGame.setState({
                guesses: [
                    { guess: SONG_2, status: 'wrong', isNew: true },
                    ...Array(9).fill({ guess: SONG_2, status: 'wrong', isNew: false }),
                ],
            });
        });

        render(<UnlimitedSongWrapper />);
        await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

        await advanceRevealDelay(500);
        expect(screen.queryByTestId('summary')).not.toBeInTheDocument();

        await advanceRevealDelay(LOSS_REVEAL_DELAY_MS - 500);
        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });
        expect(screen.getByText('Melodic Link Severed')).toBeInTheDocument();

        // แพ้ต้องล้าง completed list ทั้งหมดตามสเปกของ finalizeGame(false)
        const completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED) || '{}');
        expect(completed.unlimited).toEqual([]);
    });

    it('advances to the next round when closing the summary after a win', async () => {
        render(<UnlimitedSongWrapper />);
        await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

        const currentTarget = useSongGame.getState().target;
        await selectSong(currentTarget!.title);
        await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

        await waitFor(() => {
            expect(screen.getByTestId('summary')).toBeInTheDocument();
        });

        const closeBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
        fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(useSongGame.getState().guesses).toHaveLength(0);
        });

        // เพลงมีแค่ 2 เพลงใน mock — target ใหม่อาจซ้ำเพลงเดิมได้ถ้า pool เหลือ 1 เพลง
        // (เพลงที่ชนะไปแล้วถูกกันออกจาก pool) เลยเช็คแค่ target ต้องไม่ null และไม่ crash
        expect(useSongGame.getState().target).not.toBeNull();
    });

    describe('Central 46 Classified Archive Lifecycle Flow', () => {
        it('transitions to Central 46 Archive when the last song is completed and modal is closed', async () => {
            localStorage.setItem(
                STORAGE_KEYS.SONG_COMPLETED,
                JSON.stringify({ unlimited: [SONG_1.id] }) // เหลือ SONG_2 ตัวสุดท้าย
            );

            useSongGame.setState({
                target: SONG_2,
                targetSegmentId: 'seg-2',
                guesses: [],
                hasFinalized: false,
            });

            render(<UnlimitedSongWrapper />);
            await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

            await selectSong(SONG_2.title);
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
            // A. ตั้งสถานะให้เสมือนว่าเคลียร์เพลงก่อนหน้าไปจนเหลือเพลงสุดท้าย (SONG_2)
            localStorage.setItem(
                STORAGE_KEYS.SONG_COMPLETED,
                JSON.stringify({ unlimited: [SONG_1.id] })
            );

            // เซ็ตสถิติเริ่มต้นให้มีการสะสม Streak ไว้ (เช่น ชนะต่อเนื่องมา 5 ครั้ง)
            const initialStats = {
                currentStreak: 5,
                maxStreak: 12,
                playedCount: 5,
                passedCount: 0,
                guessDistribution: { '1': 5 },
            };
            localStorage.setItem(
                STORAGE_KEYS.SONG_STATS,
                JSON.stringify({ unlimited: initialStats })
            );

            useSongGame.setState({
                target: SONG_2,
                targetSegmentId: 'seg-2',
                guesses: [],
                hasFinalized: false,
                stats: initialStats,
            });

            render(<UnlimitedSongWrapper />);
            await screen.findByPlaceholderText('ENTER TRACK, ARTIST, OR OP/ED...');

            // B. ดำเนินการทายเพลงเป้าหมายเพลงสุดท้ายให้ถูกต้อง
            await selectSong(SONG_2.title);
            await advanceRevealDelay(WIN_REVEAL_DELAY_MS);

            // รอจน Modal สรุปผลลัพธ์ปรากฏขึ้นมา แล้วกดปิดเพื่อเปิดทางไปหอจดหมายเหตุ
            await waitFor(() => {
                expect(screen.getByTestId('summary')).toBeInTheDocument();
            });
            const closeBtn = screen.getByRole('button', { name: /OPEN SENKAIMON/i });
            fireEvent.click(closeBtn);

            // ยืนยันว่าหน้าจอเปลี่ยนผ่านเข้าสู่โหมด Central 46 Archive เรียบร้อยแล้ว
            await waitFor(() => {
                expect(screen.getByTestId('c46-archive')).toBeInTheDocument();
            });

            // C. เริ่มขั้นตอนสลักชื่อวิญญาณ (Soul Name Registration)
            const nameInput = screen.getByPlaceholderText('ENTER SOUL NAME');
            fireEvent.change(nameInput, { target: { value: 'Kurosaki Ichigo' } });

            const etchBtn = screen.getByRole('button', { name: /ETCH SOUL NAME/i });
            fireEvent.click(etchBtn);

            // D. คลิกปุ่มจุติรอบใหม่ (NEW CYCLE, NEW LIFE) เพื่อทำลายวัฏจักรเก่า
            const newLifeBtn = await screen.findByRole('button', { name: /新周・新生 — NEW CYCLE, NEW LIFE/i });
            fireEvent.click(newLifeBtn);

            // เคลียร์คิวของระบบ Async (setTimeout 0 ใน hardReset) เพื่อปล่อยให้ initializeGame(true) ทำงานสมบูรณ์
            await act(async () => {
                await vi.advanceTimersByTimeAsync(0);
            });

            // E. ส่วนการตรวจสอบหลังกดปุ่ม (Post-Reset Verification)

            // 1. Completed Data: รายชื่อเพลงที่เคยชนะไปแล้วทั้งหมดต้องถูกล้างเกลี้ยงเพื่อให้สามารถสุ่มกลับมาวนใหม่ได้
            const completedRaw = localStorage.getItem(STORAGE_KEYS.SONG_COMPLETED);
            const completedJson = JSON.parse(completedRaw || '{}');
            expect(completedJson.unlimited).toEqual([]);

            // 2. Stats Data: ค่าสถิติการชนะต่อเนื่องปัจจุบัน (currentStreak) ต้องถูกปัดกลับเป็น 0 แต่สถิติสูงสุด (maxStreak) ต้องอยู่คงเดิม
            const statsRaw = localStorage.getItem(STORAGE_KEYS.SONG_STATS);
            const statsJson = JSON.parse(statsRaw || '{}');
            expect(statsJson.unlimited.currentStreak).toBe(0);
            expect(statsJson.unlimited.maxStreak).toBe(12);

            // 3. Progress Data: ตรวจสอบโครงสร้างว่าสเตทการเล่นเดิมหายไปหมดจด และถูกตั้งโครงสร้างของรอบเกมใหม่ขึ้นมาทันทีอย่างถูกต้อง
            // (เป็นการเช็คไส้ในของ Object แทนการเช็ค .toBeUndefined เพื่อหลีกเลี่ยงการชนกันกับ Zustand Async Persist)
            const progressRaw = localStorage.getItem(STORAGE_KEYS.SONG_PROGRESS);
            const progressJson = JSON.parse(progressRaw || '{}');

            expect(progressJson.unlimited.state.guesses).toEqual([]);
            expect(progressJson.unlimited.state.hasFinalized).toBe(false);
            expect(progressJson.unlimited.state.targetId).not.toBeNull(); // ระบบแอบเลือกเพลงรอบใหม่ให้พร้อมสรรพ
        });
    });
});