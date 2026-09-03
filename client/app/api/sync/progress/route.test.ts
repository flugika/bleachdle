// app/api/sync/progress/route.test.ts
// pnpm --prefix client test app/api/sync/progress/route.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ MOCK BUILDERS FOR CHAINED SUPABASE QUERIES ────────────────────────────
// SELECT Chain: from().select().eq().eq().eq().maybeSingle()
const mockMaybeSingleFn = vi.fn();
const mockEqGameTypeFn = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFn });
const mockEqGameModeFn = vi.fn().mockReturnValue({ eq: mockEqGameTypeFn });
const mockEqPlayerIdFn = vi.fn().mockReturnValue({ eq: mockEqGameModeFn });
const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqPlayerIdFn });

// UPSERT Chain: from().upsert()
const mockUpsertFn = vi.fn();

const mockFromFn = vi.fn().mockReturnValue({
    select: mockSelectFn,
    upsert: mockUpsertFn,
});

class MockPostgrestError extends Error {
    details = 'Database execution failed internally.';
    hint = 'Check database table structure and RLS policies.';
    code = 'P0001';

    constructor(message: string) {
        super(message);
        this.name = 'PostgrestError';
    }
}

function createDbFailure(message: string): { data: null; error: PostgrestError } {
    return { data: null, error: new MockPostgrestError(message) as unknown as PostgrestError };
}

// ─── 🚀 MODULE MOCKS ──────────────────────────────────────────────────────────
vi.mock('@/src/lib/supabase/supabase-server', () => ({
    supabaseServer: {
        from: vi.fn((...args) => mockFromFn(...args)),
    },
}));

vi.mock('@/src/lib/auth/resolvePlayer', () => ({
    resolvePlayerFromCookie: vi.fn(),
}));

vi.mock('@/src/lib/rateLimit', () => ({
    edgeRateLimit: vi.fn(),
    getRateLimitKey: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Sync Progress API Endpoint Suite (/api/sync/progress)', () => {
    const MOCK_PLAYER_ID = 'player-uuid-7777';
    const MOCK_SYSTEM_TIME = '2026-08-16T00:00:00.000Z';

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date(MOCK_SYSTEM_TIME));

        // Default Mock Implementations
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-sync-progress');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ==========================================================================
    // 💾 POST METHOD (Save / Upsert Progress)
    // ==========================================================================
    describe('POST /api/sync/progress (Save Progress)', () => {
        const createPostReq = (body: unknown) =>
            new NextRequest('http://localhost/api/sync/progress', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });

        it('should return 429 Rate Limited when POST rate limit (20 req / 10s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = createPostReq({ gameMode: 'character', gameType: 'daily', guesses: [] });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-sync-progress', 20, 10000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if player cookie cannot be resolved', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = createPostReq({ gameMode: 'character', gameType: 'daily', guesses: [] });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 413 Payload Too Large when request body exceeds MAX_PAYLOAD_BYTES (20,000 bytes)', async () => {
            // Create an oversized string exceeding 20,000 bytes limit
            const hugeString = 'x'.repeat(20005);
            const req = new NextRequest('http://localhost/api/sync/progress', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: hugeString,
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(413);
            expect(body).toEqual({ error: 'payload too large' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when Zod validation fails (invalid gameMode / excess guesses count)', async () => {
            // Invalid game mode 'poker' and excess guesses (>50 items)
            const invalidBody = {
                gameMode: 'invalid_mode',
                gameType: 'daily',
                targetId: 'target-1',
                guesses: Array(51).fill({ guess: 'test' }),
            };

            const req = createPostReq(invalidBody);
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.gameMode).toBeDefined();
            expect(body.error.fieldErrors.guesses).toBeDefined();
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should allow relaxed guesses array containing arbitrary shapes (v2 requirement)', async () => {
            mockMaybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
            mockUpsertFn.mockResolvedValueOnce({ error: null });

            const relaxedGuessesBody = {
                gameMode: 'character',
                gameType: 'daily',
                targetId: 'char-101',
                guesses: [
                    { guess: 'Ichigo', result: { race: 'correct', gender: 'correct' } },
                    { customField: 123, status: 'unknown_structure' },
                    'raw_string_guess',
                ],
            };

            const req = createPostReq(relaxedGuessesBody);
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ status: 'ok' });
            expect(mockUpsertFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    guesses: relaxedGuessesBody.guesses,
                })
            );
        });

        // ─── ⏱️ TIMING PROTECTION (target_started_at) TESTS ──────────────────
        describe('Timing Protection Logic (target_started_at)', () => {
            it('should set target_started_at to current timestamp when no existing progress record exists', async () => {
                mockMaybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
                mockUpsertFn.mockResolvedValueOnce({ error: null });

                const req = createPostReq({
                    gameMode: 'song',
                    gameType: 'daily',
                    targetId: 'song-555',
                    guesses: [],
                });

                const res = await POST(req);
                expect(res.status).toBe(200);

                expect(mockUpsertFn).toHaveBeenCalledWith({
                    player_id: MOCK_PLAYER_ID,
                    game_mode: 'song',
                    game_type: 'daily',
                    target_id: 'song-555',
                    target_started_at: MOCK_SYSTEM_TIME,
                    guesses: [],
                    updated_at: MOCK_SYSTEM_TIME,
                });
            });

            it('should BUMP target_started_at to current time when targetId has CHANGED from existing record', async () => {
                const OLD_START_TIME = '2026-08-15T10:00:00.000Z';
                mockMaybeSingleFn.mockResolvedValueOnce({
                    data: { target_id: 'old-target-111', target_started_at: OLD_START_TIME },
                    error: null,
                });
                mockUpsertFn.mockResolvedValueOnce({ error: null });

                const req = createPostReq({
                    gameMode: 'song',
                    gameType: 'daily',
                    targetId: 'new-target-222', // Target changed!
                    guesses: [],
                });

                const res = await POST(req);
                expect(res.status).toBe(200);

                expect(mockUpsertFn).toHaveBeenCalledWith(
                    expect.objectContaining({
                        target_id: 'new-target-222',
                        target_started_at: MOCK_SYSTEM_TIME, // Bumped to new time!
                        updated_at: MOCK_SYSTEM_TIME,
                    })
                );
            });

            it('should PRESERVE existing target_started_at when targetId is UNCHANGED (debounced re-push protection)', async () => {
                const ORIGINAL_START_TIME = '2026-08-15T10:00:00.000Z';
                mockMaybeSingleFn.mockResolvedValueOnce({
                    data: { target_id: 'same-target-999', target_started_at: ORIGINAL_START_TIME },
                    error: null,
                });
                mockUpsertFn.mockResolvedValueOnce({ error: null });

                const req = createPostReq({
                    gameMode: 'quote',
                    gameType: 'unlimited',
                    targetId: 'same-target-999', // Same target!
                    guesses: [{ guess: 'Aizen' }],
                });

                const res = await POST(req);
                expect(res.status).toBe(200);

                expect(mockUpsertFn).toHaveBeenCalledWith(
                    expect.objectContaining({
                        target_id: 'same-target-999',
                        target_started_at: ORIGINAL_START_TIME, // Must NOT reset clock!
                        updated_at: MOCK_SYSTEM_TIME,
                    })
                );
            });
        });

        it('should return 500 internal error and log console error when upsert query fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockMaybeSingleFn.mockResolvedValueOnce({ data: null, error: null });
            mockUpsertFn.mockResolvedValueOnce(createDbFailure('Upsert primary key constraint error'));

            const req = createPostReq({
                gameMode: 'silhouette',
                gameType: 'daily',
                targetId: 'sil-1',
                guesses: [],
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[sync/progress POST] upsert failed:',
                expect.objectContaining({ message: 'Upsert primary key constraint error' })
            );

            consoleSpy.mockRestore();
        });
    });

    // ==========================================================================
    // 📖 GET METHOD (Fetch Progress)
    // ==========================================================================
    describe('GET /api/sync/progress (Fetch Progress)', () => {
        const createGetReq = (params: string) =>
            new NextRequest(`http://localhost/api/sync/progress?${params}`, { method: 'GET' });

        it('should return 429 Rate Limited when GET rate limit (30 req / 10s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = createGetReq('gameMode=character&gameType=daily');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-sync-progress', 30, 10000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if player cookie cannot be resolved', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = createGetReq('gameMode=character&gameType=daily');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when query params are missing or invalid', async () => {
            const req = createGetReq('gameMode=invalid_mode'); // missing gameType
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.gameMode).toBeDefined();
            expect(body.error.fieldErrors.gameType).toBeDefined();
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 500 internal error and log console error when database fetch fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockMaybeSingleFn.mockResolvedValueOnce(createDbFailure('Fetch read timeout'));

            const req = createGetReq('gameMode=emoji&gameType=daily');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[sync/progress GET] query failed:',
                expect.objectContaining({ message: 'Fetch read timeout' })
            );

            consoleSpy.mockRestore();
        });

        it('should return progress record when data exists in database (Happy Path)', async () => {
            const mockProgressData = {
                target_id: 'emoji-99',
                guesses: [{ guess: '🔥' }],
                updated_at: '2026-08-16T00:00:00.000Z',
            };

            mockMaybeSingleFn.mockResolvedValueOnce({ data: mockProgressData, error: null });

            const req = createGetReq('gameMode=emoji&gameType=daily');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ progress: mockProgressData });

            expect(mockFromFn).toHaveBeenCalledWith('player_progress');
            expect(mockSelectFn).toHaveBeenCalledWith('target_id, guesses, updated_at');
            expect(mockEqPlayerIdFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
            expect(mockEqGameModeFn).toHaveBeenCalledWith('game_mode', 'emoji');
            expect(mockEqGameTypeFn).toHaveBeenCalledWith('game_type', 'daily');
        });

        it('should return progress: null when no record exists for the player/mode', async () => {
            mockMaybeSingleFn.mockResolvedValueOnce({ data: null, error: null });

            const req = createGetReq('gameMode=release&gameType=unlimited');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ progress: null });
        });
    });
});