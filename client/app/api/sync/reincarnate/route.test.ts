// app/api/sync/reincarnate/route.test.ts
// pnpm --prefix client test app/api/sync/reincarnate/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ MOCK BUILDERS FOR SUPABASE RPC ───────────────────────────────────────
const mockRpcFn = vi.fn();

class MockPostgrestError extends Error {
    details = 'Database transaction execution failed.';
    hint = 'Check RPC reincarnate function definition.';
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

vi.mock('@/src/lib/auth/verifySameOrigin', () => ({
    verifySameOrigin: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Reincarnate API Endpoint Suite (POST /api/sync/reincarnate)', () => {
    const MOCK_PLAYER_ID = 'player-uuid-reincarnate-8888';
    const VALID_GAME_MODE = 'character';

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Implementations
        vi.mocked(verifySameOrigin).mockReturnValue(true);
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-sync-reincarnate');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
    });

    const createPostReq = (body: unknown) =>
        new NextRequest('http://localhost/api/sync/reincarnate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });

    // ==========================================
    // 🛡️ SECURITY & EDGE RATE LIMITING
    // ==========================================
    describe('Security & Edge Rate Limiting Guards', () => {
        it('should return 403 Forbidden when origin verification check fails', async () => {
            vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

            const req = createPostReq({ gameMode: VALID_GAME_MODE });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'invalid origin' });
            expect(edgeRateLimit).not.toHaveBeenCalled();
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 429 Rate Limited when rate limit capacity (5 req / 60s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = createPostReq({ gameMode: VALID_GAME_MODE });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-sync-reincarnate', 5, 60000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔑 AUTHENTICATION & COOKIE GUARDS
    // ==========================================
    describe('Authentication Guard', () => {
        it('should return 401 Unauthenticated if resolvePlayerFromCookie returns null', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = createPostReq({ gameMode: VALID_GAME_MODE });
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
        it('should return 400 Bad Request when JSON body is invalid or null', async () => {
            const req = new NextRequest('http://localhost/api/sync/reincarnate', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: 'invalid-json-content',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error).toBeDefined();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when gameMode is missing', async () => {
            const req = createPostReq({});
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.gameMode).toBeDefined();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when gameMode is not in allowed enum', async () => {
            const req = createPostReq({ gameMode: 'invalid_game_mode' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.gameMode).toBeDefined();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 💥 DATABASE RPC FAILURE HANDLING
    // ==========================================
    describe('Database RPC Failure Handling', () => {
        it('should return 500 internal error and log console error when reincarnate RPC fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockResolvedValueOnce(createDbFailure('RPC transaction deadlock'));

            const req = createPostReq({ gameMode: VALID_GAME_MODE });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[sync/reincarnate] rpc failed:',
                expect.objectContaining({ message: 'RPC transaction deadlock' })
            );

            consoleSpy.mockRestore();
        });
    });

    // ==========================================
    // 🔄 REINCARNATION EXECUTION (HAPPY PATH)
    // ==========================================
    describe('Reincarnation Execution (Happy Path)', () => {
        const validGameModes = ['character', 'song', 'silhouette', 'release', 'emoji', 'quote'] as const;

        it.each(validGameModes)(
            'should successfully invoke reincarnate RPC and return payload for gameMode: %s',
            async (gameMode) => {
                const mockRpcResult = {
                    status: 'reincarnated',
                    reincarnation_count: 1,
                    current_streak: 0,
                    max_streak: 15,
                };

                mockRpcFn.mockResolvedValueOnce({ data: mockRpcResult, error: null });

                const req = createPostReq({ gameMode });
                const res = await POST(req);
                const body = await res.json();

                expect(res.status).toBe(200);
                expect(body).toEqual(mockRpcResult);

                expect(mockRpcFn).toHaveBeenCalledWith('reincarnate', {
                    p_player_id: MOCK_PLAYER_ID,
                    p_game_mode: gameMode,
                });
            }
        );
    });
});