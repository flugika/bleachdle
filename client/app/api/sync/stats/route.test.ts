// app/api/sync/stats/route.test.ts
// pnpm --prefix client test app/api/sync/stats/route.test.ts

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
    hint = 'Check player_stats table constraints or connection';
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
describe('GET /api/sync/stats', () => {
    const MOCK_PLAYER_ID = 'player-uuid-stats-5555';
    const SELECT_FIELDS =
        'game_mode, game_type, current_streak, max_streak, played_count, passed_count, guess_distribution';

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Implementations
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-sync-stats');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
    });

    const createGetReq = () =>
        new NextRequest('http://localhost/api/sync/stats', {
            method: 'GET',
        });

    // ─── RATE LIMITING ───
    it('should return 429 Rate Limited when request rate exceeds 10 req / 10s window', async () => {
        vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(body).toEqual({ error: 'rate limited' });
        expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-sync-stats', 10, 10000);
        expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        expect(mockFromFn).not.toHaveBeenCalled();
    });

    // ─── AUTHENTICATION ───
    it('should return 401 Unauthenticated when player cookie resolution returns null', async () => {
        vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(401);
        expect(body).toEqual({ error: 'unauthenticated' });
        expect(mockFromFn).not.toHaveBeenCalled();
    });

    // ─── DATABASE ERRORS ───
    it('should return 500 Internal Error and log error when player_stats query fails', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockEqFn.mockResolvedValueOnce(createDbFailure('Deadlock detected'));

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ error: 'internal' });
        expect(consoleSpy).toHaveBeenCalledWith(
            '[sync/stats] query failed:',
            expect.objectContaining({ message: 'Deadlock detected' })
        );

        consoleSpy.mockRestore();
    });

    // ─── HAPPY PATHS ───
    it('should return 200 OK with empty stats array when player has no recorded stats', async () => {
        mockEqFn.mockResolvedValueOnce({
            data: [],
            error: null,
        });

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ stats: [] });
        expect(mockFromFn).toHaveBeenCalledWith('player_stats');
        expect(mockSelectFn).toHaveBeenCalledWith(SELECT_FIELDS);
        expect(mockEqFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
    });

    it('should return 200 OK with empty stats array when database returns null (nullish coalescing guard)', async () => {
        mockEqFn.mockResolvedValueOnce({
            data: null,
            error: null,
        });

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ stats: [] });
    });

    it('should return 200 OK with complete player stats across multiple game modes and types', async () => {
        const mockStatsData = [
            {
                game_mode: 'classic',
                game_type: 'daily',
                current_streak: 7,
                max_streak: 15,
                played_count: 20,
                passed_count: 18,
                guess_distribution: { '1': 2, '2': 5, '3': 8, '4': 3 },
            },
            {
                game_mode: 'quote',
                game_type: 'endless',
                current_streak: 0,
                max_streak: 4,
                played_count: 10,
                passed_count: 6,
                guess_distribution: { '1': 0, '2': 1, '3': 3, '4': 2 },
            },
        ];

        mockEqFn.mockResolvedValueOnce({
            data: mockStatsData,
            error: null,
        });

        const res = await GET(createGetReq());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ stats: mockStatsData });
        expect(mockFromFn).toHaveBeenCalledWith('player_stats');
        expect(mockSelectFn).toHaveBeenCalledWith(SELECT_FIELDS);
        expect(mockEqFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
    });
});