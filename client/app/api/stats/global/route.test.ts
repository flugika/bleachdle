// app/api/stats/global/route.test.ts
// pnpm --prefix client test app/api/stats/global/route.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { edgeRateLimit } from '@/src/lib/rateLimit';
import { logApiEvent } from '@/src/services/monitor/logEvent';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';

// ─── 🛠️ TYPE-SAFE MOCK BUILDERS ──────────────────────────────────────────────
function createMockSuccessResponse<T>(data: T): PostgrestResponseSuccess<T> {
    return {
        data,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
        success: true,
    };
}

function createMockFailureResponse(
    message: string,
    code = 'DATABASE_ERROR'
): PostgrestResponseFailure {
    return {
        data: null,
        error: {
            name: 'PostgrestError',
            message,
            details: 'Detailed database failure information for debugging.',
            hint: 'Please review schema definitions or database connections.',
            code,
            toJSON() {
                return {
                    name: this.name,
                    message: this.message,
                    details: this.details,
                    hint: this.hint,
                    code: this.code,
                };
            },
        },
        count: null,
        status: 500,
        statusText: 'Internal Server Error',
        success: false,
    };
}

type PostgrestResponseSuccess<T> = Extract<PostgrestSingleResponse<T>, { success: true }>;
type PostgrestResponseFailure = Extract<PostgrestSingleResponse<null>, { success: false }>;

// ─── 🚀 MODULE MOCKS ──────────────────────────────────────────────────────────
vi.mock('@/src/lib/supabase/supabase-server', () => ({
    supabaseServer: {
        rpc: vi.fn(),
    },
}));

vi.mock('@/src/lib/utils/format', () => ({
    getTodayStr: vi.fn(() => '2026-07-16'),
}));

vi.mock('@/src/lib/rateLimit', () => ({
    getRateLimitKey: vi.fn(() => '127.0.0.1'),
    edgeRateLimit: vi.fn(),
}));

vi.mock('@/src/services/monitor/logEvent', () => ({
    logApiEvent: vi.fn(),
}));

vi.mock('@/src/lib/auth/resolvePlayer', () => ({
    resolvePlayerFromCookie: vi.fn(),
}));

// Mock the valid stat modes to keep the test environment predictable and fully controlled
vi.mock('@/src/entities/stats/types', () => ({
    VALID_STAT_MODES: ['character', 'song'],
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('GET /api/stats/global', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        // Route handler intentionally console.warn's on 429 and
        // console.error's on 500 (see route.ts) — both paths are exercised
        // on purpose by the tests below. Silence them here so CI/test
        // output stays clean; the actual observability behavior is still
        // covered separately via the logApiEvent assertions in each test.
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('should return 429 and log a warning if rate limit is exceeded', async () => {
        vi.mocked(edgeRateLimit).mockReturnValue(false);

        const req = new NextRequest('http://localhost/api/stats/global');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(body).toEqual({ error: 'Too many requests, please slow down.' });
        expect(logApiEvent).toHaveBeenCalledWith('stats.global', 'warning', 429, 'rate_limited');
        expect(supabaseServer.rpc).not.toHaveBeenCalled();

        // Confirm the route still actually console.warn'd, just silently
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Rate limit exceeded for IP')
        );
    });

    it('should return 500 and log an error if the database RPC fails', async () => {
        vi.mocked(edgeRateLimit).mockReturnValue(true);

        const mockError = createMockFailureResponse('RPC execution failed', 'RPC_ERROR');
        vi.mocked(supabaseServer.rpc).mockResolvedValueOnce(mockError);

        const req = new NextRequest('http://localhost/api/stats/global?dimension=daily');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ error: 'Failed to load global stats' });
        expect(logApiEvent).toHaveBeenCalledWith('stats.global', 'error', 500, 'RPC execution failed');

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('RPC get_global_stats_today failed'),
            mockError.error
        );
    });

    it('should default to daily dimension and call get_global_stats_today with correct parameters', async () => {
        vi.mocked(edgeRateLimit).mockReturnValue(true);

        const mockData = {
            character: {
                played: 10,
                passed: 10, // total = 20 -> win_rate = (10/20)*100 = 50%
                guess_distribution: { '1': 2, '2': 3, 'fail': 5 }, // solves = 5, guesses = (1*2)+(2*3) = 8 -> avg = 8/5 = 1.6
            },
        };

        const mockResponse = createMockSuccessResponse(mockData);
        vi.mocked(supabaseServer.rpc).mockResolvedValueOnce(mockResponse);

        // Requesting without dimension query param (should default to 'daily')
        const req = new NextRequest('http://localhost/api/stats/global');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.dimension).toBe('daily');
        expect(supabaseServer.rpc).toHaveBeenCalledWith('get_global_stats_today', { p_date: '2026-07-16' });

        // Assert structural calculation correctness
        expect(body.globalTickerStats.character).toEqual({
            played: 10,
            passed: 10,
            win_rate: 50,
            avg_guesses: 1.6,
        });
        expect(body.topSouls).toEqual([]);
        expect(logApiEvent).toHaveBeenCalledWith('stats.global', 'success', 200);
    });

    it('should use unlimited dimension and call get_player_stats for the resolved player', async () => {
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue('player-123');

        const mockData = {
            song: {
                played: 5,
                passed: 0,
                guess_distribution: { '3': 4, 'invalid_key': 2 },
            },
        };
        vi.mocked(supabaseServer.rpc).mockResolvedValueOnce(createMockSuccessResponse(mockData));

        const req = new NextRequest('http://localhost/api/stats/global?dimension=unlimited');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.dimension).toBe('unlimited');
        expect(supabaseServer.rpc).toHaveBeenCalledWith('get_player_stats', {
            p_player_id: 'player-123',
            p_game_type: 'unlimited',
        });
        expect(body.globalTickerStats.song).toEqual({
            played: 5, passed: 0, win_rate: 100, avg_guesses: 3,
        });
    });

    it('should return empty stats and skip RPC when no player is linked (unlimited)', async () => {
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(null);

        const req = new NextRequest('http://localhost/api/stats/global?dimension=unlimited');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.global).toEqual({});
        expect(body.globalTickerStats).toEqual({});
        expect(supabaseServer.rpc).not.toHaveBeenCalled();
        expect(logApiEvent).toHaveBeenCalledWith('stats.global', 'success', 200, 'no_linked_player');
    });

    it('should return empty objects fallback and safe stats metrics when RPC returns null data', async () => {
        vi.mocked(edgeRateLimit).mockReturnValue(true);

        const mockResponse = createMockSuccessResponse(null);
        vi.mocked(supabaseServer.rpc).mockResolvedValueOnce(mockResponse);

        const req = new NextRequest('http://localhost/api/stats/global?dimension=daily');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.global).toEqual({});
        expect(body.globalTickerStats).toEqual({});
    });

    it('should return 0 win_rate and null avg_guesses if played and passed parameters are 0', async () => {
        vi.mocked(edgeRateLimit).mockReturnValue(true);

        const mockZeroData = {
            character: {
                played: 0,
                passed: 0,
                guess_distribution: {},
            },
        };

        const mockResponse = createMockSuccessResponse(mockZeroData);
        vi.mocked(supabaseServer.rpc).mockResolvedValueOnce(mockResponse);

        const req = new NextRequest('http://localhost/api/stats/global');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.globalTickerStats.character.win_rate).toBe(0);
        expect(body.globalTickerStats.character.avg_guesses).toBeNull();
    });
});