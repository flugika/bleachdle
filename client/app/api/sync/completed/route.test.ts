// app/api/sync/completed/route.test.ts
// pnpm --prefix client test app/api/sync/completed/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ MOCK BUILDERS FOR CHAINED SUPABASE QUERIES ────────────────────────────
// GET Chain: from().select().eq()
const mockEqFn = vi.fn();
const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqFn });
const mockFromFn = vi.fn().mockReturnValue({ select: mockSelectFn });

class MockPostgrestError extends Error {
    details = 'Database execution failed internally.';
    hint = 'Check database connection and table schema.';
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
describe('Sync Completed Games API Endpoint Suite (GET /api/sync/completed)', () => {
    const MOCK_PLAYER_ID = 'player-uuid-9999-sync';

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Security & Auth Mock Implementations
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-sync-completed');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
    });

    const createReq = () => new NextRequest('http://localhost/api/sync/completed', { method: 'GET' });

    // ==========================================
    // 🛡️ SECURITY & EDGE RATE LIMITING
    // ==========================================
    describe('Rate Limiting Guard', () => {
        it('should return 429 Rate Limited when rate limit capacity (10 req / 10s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = createReq();
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-sync-completed', 10, 10000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
            expect(mockFromFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔑 AUTHENTICATION & COOKIE GUARDS
    // ==========================================
    describe('Authentication Guard', () => {
        it('should return 401 Unauthenticated if resolvePlayerFromCookie returns null', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = createReq();
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 💥 DATABASE FAILURE HANDLING
    // ==========================================
    describe('Database Failure Handling', () => {
        it('should return 500 internal error and log console error when database query fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockEqFn.mockResolvedValueOnce(createDbFailure('Query execution timeout'));

            const req = createReq();
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[sync/completed] query failed:',
                expect.objectContaining({ message: 'Query execution timeout' })
            );

            consoleSpy.mockRestore();
        });
    });

    // ==========================================
    // 🔄 DATA RETRIEVAL & NULL SAFETY (HAPPY PATH)
    // ==========================================
    describe('Successful Data Retrieval & Reconcile Payload', () => {
        it('should query player_completed table with exact columns and return grouped records (Happy Path)', async () => {
            const mockCompletedRecords = [
                { game_mode: 'classic', game_type: 'daily', completed_key: '2026-08-16' },
                { game_mode: 'quote', game_type: 'daily', completed_key: '2026-08-15' },
                { game_mode: 'ability', game_type: 'unlimited', completed_key: 'char_102' },
            ];

            mockEqFn.mockResolvedValueOnce({ data: mockCompletedRecords, error: null });

            const req = createReq();
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ completed: mockCompletedRecords });

            // Verify Supabase Query Chain Precision
            expect(mockFromFn).toHaveBeenCalledWith('player_completed');
            expect(mockSelectFn).toHaveBeenCalledWith('game_mode, game_type, completed_key');
            expect(mockEqFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
        });

        it('should fallback to empty array [] when DB returns null data', async () => {
            mockEqFn.mockResolvedValueOnce({ data: null, error: null });

            const req = createReq();
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ completed: [] });
        });

        it('should return empty array [] when user has no completed records in DB', async () => {
            mockEqFn.mockResolvedValueOnce({ data: [], error: null });

            const req = createReq();
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ completed: [] });
        });
    });
});