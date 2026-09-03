// app/api/sync/result/route.test.ts
// pnpm --prefix client test app/api/sync/result/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ MOCK BUILDERS FOR SUPABASE RPC ───────────────────────────────────────
const mockRpcFn = vi.fn();

class MockPostgrestError extends Error {
    details = 'Replay protection constraint or internal database error';
    hint = 'Check RPC apply_game_result definition';
    code = '23505';

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
        rpc: vi.fn((...args) => mockRpcFn(...args)),
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
describe('Game Result Sync API Suite (POST /api/sync/result)', () => {
    const MOCK_PLAYER_ID = 'player-uuid-result-9999';
    const VALID_DAILY_PAYLOAD = {
        gameMode: 'character' as const,
        gameType: 'daily' as const,
        roundKey: '2026-08-16',
        isWin: true,
        guessCount: 3,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Implementations
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-sync-result');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
    });

    const createPostReq = (body: unknown) =>
        new NextRequest('http://localhost/api/sync/result', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });

    // ==========================================
    // 🛡️ EDGE RATE LIMITING GUARDS
    // ==========================================
    describe('Edge Rate Limiting Guards', () => {
        it('should return 429 Rate Limited when rate limit capacity (10 req / 10s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = createPostReq(VALID_DAILY_PAYLOAD);
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-sync-result', 10, 10000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔑 AUTHENTICATION GUARDS
    // ==========================================
    describe('Authentication Guard', () => {
        it('should return 401 Unauthenticated if resolvePlayerFromCookie returns null', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = createPostReq(VALID_DAILY_PAYLOAD);
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockRpcFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 📋 PAYLOAD & ZOD SCHEMA VALIDATION
    // ==========================================
    describe('Payload & Zod Schema Validation', () => {
        it('should return 400 Bad Request when JSON body is malformed', async () => {
            const req = new NextRequest('http://localhost/api/sync/result', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '{ invalid-json }',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error).toBeDefined();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when required fields are missing', async () => {
            const req = createPostReq({
                gameMode: 'song',
                // gameType, roundKey, isWin, guessCount missing
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors).toHaveProperty('gameType');
            expect(body.error.fieldErrors).toHaveProperty('roundKey');
            expect(body.error.fieldErrors).toHaveProperty('isWin');
            expect(body.error.fieldErrors).toHaveProperty('guessCount');
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when guessCount is out of bounds (< 0 or > 20)', async () => {
            const reqBelowMin = createPostReq({ ...VALID_DAILY_PAYLOAD, guessCount: -1 });
            const resBelow = await POST(reqBelowMin);
            expect(resBelow.status).toBe(400);

            const reqAboveMax = createPostReq({ ...VALID_DAILY_PAYLOAD, guessCount: 21 });
            const resAbove = await POST(reqAboveMax);
            expect(resAbove.status).toBe(400);

            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when guessCount is not an integer', async () => {
            const req = createPostReq({ ...VALID_DAILY_PAYLOAD, guessCount: 2.5 });
            const res = await POST(req);
            expect(res.status).toBe(400);
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when roundKey exceeds max length 128 chars', async () => {
            const req = createPostReq({
                ...VALID_DAILY_PAYLOAD,
                gameType: 'unlimited',
                roundKey: 'a'.repeat(129),
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.roundKey).toBeDefined();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        // ─── ZOD SCHEMA REFINE TESTS (ROUNDKEY DATE FORMAT) ───
        it('should FAIL schema refinement (400) when gameType is "daily" but roundKey is NOT YYYY-MM-DD', async () => {
            const invalidDailyKeys = ['2026/08/16', '16-08-2026', 'random-session-uuid', '2026-8-16', ''];

            for (const roundKey of invalidDailyKeys) {
                const req = createPostReq({
                    ...VALID_DAILY_PAYLOAD,
                    gameType: 'daily',
                    roundKey,
                });

                const res = await POST(req);
                const body = await res.json();

                expect(res.status).toBe(400);
                expect(body.error.fieldErrors.roundKey).toContain(
                    'roundKey must be a YYYY-MM-DD date for daily rounds'
                );
            }

            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should PASS schema refinement when gameType is "unlimited" with arbitrary non-date roundKey string', async () => {
            const mockRpcResult = { stats: { total_played: 10 }, replay: false };
            mockRpcFn.mockResolvedValueOnce({ data: mockRpcResult, error: null });

            const unlimitedPayload = {
                gameMode: 'song' as const,
                gameType: 'unlimited' as const,
                roundKey: 'unlimited-round-uuid-abc-123',
                isWin: false,
                guessCount: 6,
            };

            const req = createPostReq(unlimitedPayload);
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual(mockRpcResult);
            expect(mockRpcFn).toHaveBeenCalledWith('apply_game_result', {
                p_player_id: MOCK_PLAYER_ID,
                p_game_mode: 'song',
                p_game_type: 'unlimited',
                p_round_key: 'unlimited-round-uuid-abc-123',
                p_is_win: false,
                p_guess_count: 6,
            });
        });
    });

    // ==========================================
    // 💥 DATABASE RPC FAILURE HANDLING
    // ==========================================
    describe('Database RPC Failure Handling', () => {
        it('should return 500 internal error and log console error when apply_game_result RPC fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockResolvedValueOnce(createDbFailure('Foreign key constraint violation'));

            const req = createPostReq(VALID_DAILY_PAYLOAD);
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[sync/result] rpc failed:',
                expect.objectContaining({ message: 'Foreign key constraint violation' })
            );

            consoleSpy.mockRestore();
        });
    });

    // ==========================================
    // 🔄 HAPPY PATH & IDEMPOTENT REPLAY HANDLING
    // ==========================================
    describe('Happy Path & Idempotent Replay Protection', () => {
        const gameModes = ['character', 'song', 'silhouette', 'release', 'emoji', 'quote'] as const;

        it.each(gameModes)(
            'should successfully send result to RPC for mode: %s and return status data',
            async (gameMode) => {
                const mockResultPayload = {
                    stats: { current_streak: 5, max_streak: 10, total_wins: 12 },
                    replay: false,
                };
                mockRpcFn.mockResolvedValueOnce({ data: mockResultPayload, error: null });

                const payload = { ...VALID_DAILY_PAYLOAD, gameMode };
                const req = createPostReq(payload);
                const res = await POST(req);
                const body = await res.json();

                expect(res.status).toBe(200);
                expect(body).toEqual(mockResultPayload);
                expect(mockRpcFn).toHaveBeenCalledWith('apply_game_result', {
                    p_player_id: MOCK_PLAYER_ID,
                    p_game_mode: gameMode,
                    p_game_type: 'daily',
                    p_round_key: '2026-08-16',
                    p_is_win: true,
                    p_guess_count: 3,
                });
            }
        );

        it('should return 200 OK with replay: true when submitting a duplicate/already-recorded round (Idempotence)', async () => {
            const mockReplayResult = {
                stats: { current_streak: 5, max_streak: 10 },
                replay: true,
            };
            mockRpcFn.mockResolvedValueOnce({ data: mockReplayResult, error: null });

            const req = createPostReq(VALID_DAILY_PAYLOAD);
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.replay).toBe(true);
            expect(body).toEqual(mockReplayResult);
        });
    });
});