// app/api/sync/soul-registry/route.test.ts
// pnpm --prefix client test app/api/sync/soul-registry/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ HOISTED MOCKS & HELPERS ──────────────────────────────────────────────
const { mockEqFn, mockSelectFn, mockFromFn } = vi.hoisted(() => {
    const mockEqFn = vi.fn();
    const mockSelectFn = vi.fn(() => ({ eq: mockEqFn }));
    const mockFromFn = vi.fn(() => ({ select: mockSelectFn }));

    return {
        mockEqFn,
        mockSelectFn,
        mockFromFn,
    };
});

class MockPostgrestError extends Error {
    details = 'Database query failed';
    hint = 'Check database connection or table schema';
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
        from: mockFromFn,
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
describe('GET /api/sync/soul-registry', () => {
    const MOCK_PLAYER_ID = 'player-uuid-soul-reg-9999';

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Implementations
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-soul-registry');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
    });

    const createGetReq = () =>
        new NextRequest('http://localhost/api/sync/soul-registry', {
            method: 'GET',
        });

    // ─── RATE LIMITING ───
    it('should return 429 Rate Limited when rate limit capacity (10 req / 10s) is exceeded', async () => {
        vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(body).toEqual({ error: 'rate limited' });
        expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-soul-registry', 10, 10000);
        expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        expect(mockFromFn).not.toHaveBeenCalled();
    });

    // ─── AUTHENTICATION ───
    it('should return 401 Unauthenticated if player cookie resolution fails', async () => {
        vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(401);
        expect(body).toEqual({ error: 'unauthenticated' });
        expect(mockFromFn).not.toHaveBeenCalled();
    });

    // ─── DATABASE ERRORS ───
    it('should return 500 Internal Error and log console error when Supabase select query fails', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockEqFn.mockResolvedValueOnce(createDbFailure('Connection reset by peer'));

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ error: 'internal' });
        expect(consoleSpy).toHaveBeenCalledWith(
            '[sync/soul-registry] query failed:',
            expect.objectContaining({ message: 'Connection reset by peer' })
        );

        consoleSpy.mockRestore();
    });

    // ─── HAPPY PATHS ───
    it('should return 200 OK with empty registry array when player has no reincarnation records', async () => {
        mockEqFn.mockResolvedValueOnce({
            data: [],
            error: null,
        });

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ registry: [] });
        expect(mockFromFn).toHaveBeenCalledWith('player_soul_registry');
        expect(mockSelectFn).toHaveBeenCalledWith('game_mode, reincarnation_count');
        expect(mockEqFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
    });

    it('should return 200 OK with registry array when data is null (fallback to empty array)', async () => {
        mockEqFn.mockResolvedValueOnce({
            data: null,
            error: null,
        });

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ registry: [] });
    });

    it('should return 200 OK with full player soul registry list across multiple modes', async () => {
        const mockRegistryData = [
            { game_mode: 'classic', reincarnation_count: 5 },
            { game_mode: 'quote', reincarnation_count: 2 },
            { game_mode: 'ability', reincarnation_count: 0 },
        ];

        mockEqFn.mockResolvedValueOnce({
            data: mockRegistryData,
            error: null,
        });

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ registry: mockRegistryData });
        expect(mockFromFn).toHaveBeenCalledWith('player_soul_registry');
        expect(mockSelectFn).toHaveBeenCalledWith('game_mode, reincarnation_count');
        expect(mockEqFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
    });
});