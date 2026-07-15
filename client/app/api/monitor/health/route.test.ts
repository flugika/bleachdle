// app/api/monitor/health/route.test.ts
// pnpm --prefix client test app/api/monitor/health/route.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { isAuthorizedForMonitor } from '@/src/features/admin/monitorAuth';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

// ─── 🛡️ ENTERPRISE TYPE-SAFE RPC RESPONSE BUILDERS ───────────────────────────
const mockRpcFn = vi.fn();

function createRpcSuccess<T>(data: T): PostgrestSingleResponse<T> {
    return {
        data,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
        success: true,
    };
}

function createRpcFailure(message: string): PostgrestSingleResponse<null> {
    return {
        data: null,
        error: {
            name: 'PostgrestError',
            message,
            details: 'RPC Execution Failed',
            hint: 'Verify database functions and permissions.',
            code: 'P0001',
            toJSON() { return this; }
        },
        count: null,
        status: 500,
        statusText: 'Internal Server Error',
        success: false,
    };
}

// ─── 🚀 MODULE MOCKS ──────────────────────────────────────────────────────────
vi.mock('@/src/lib/supabase/supabase-server', () => ({
    supabaseServer: {
        rpc: vi.fn((...args) => mockRpcFn(...args)),
    },
}));

vi.mock('@/src/features/admin/monitorAuth', () => ({
    isAuthorizedForMonitor: vi.fn(),
}));

vi.mock('@/src/lib/utils/format', () => ({
    getTodayStr: vi.fn(() => '2026-07-16'),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('GET /api/monitor/health', () => {
    const FAKE_NOW_MS = 1784167000000; // Fixed timestamp in 2026
    const fakeNowIso = new Date(FAKE_NOW_MS).toISOString();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(FAKE_NOW_MS);

        // Default: User is authorized
        vi.mocked(isAuthorizedForMonitor).mockReturnValue(true);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return 401 Unauthorized if monitor authorization check fails', async () => {
        vi.mocked(isAuthorizedForMonitor).mockReturnValueOnce(false);

        const req = new NextRequest('http://localhost/api/monitor/health');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(401);
        expect(body).toEqual({ ok: false, error: 'Unauthorized.' });
        expect(supabaseServer.rpc).not.toHaveBeenCalled();
    });

    it('should fall back to default filter configurations when query parameters are absent', async () => {
        // Mock standard database return structures
        mockRpcFn
            .mockResolvedValueOnce(createRpcSuccess({ status: 'operational' })) // health
            .mockResolvedValueOnce(createRpcSuccess({ total_requests: 1500 }))  // dailyStats
            .mockResolvedValueOnce(createRpcSuccess([{ id: 1, level: 'success' }])) // events
            .mockResolvedValueOnce(createRpcSuccess([{ date: '2026-07-15' }])); // statsHistory

        const req = new NextRequest('http://localhost/api/monitor/health');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.health).toEqual({ status: 'operational' });
        expect(body.dailyStats).toEqual({ total_requests: 1500 });
        expect(body.events).toHaveLength(1);

        // Verify fallback variables (hours=24, days=7, level=null)
        const expectedRangeStart = new Date(FAKE_NOW_MS - 24 * 3600_000).toISOString();
        expect(body.appliedFilters).toEqual({
            hours: 24,
            level: null,
            from: expectedRangeStart,
            to: fakeNowIso,
            days: 7
        });

        // Verify correct RPC arguments matching parallel assignment
        expect(mockRpcFn).toHaveBeenNthCalledWith(1, 'get_api_health', { p_hours: 24 });
        expect(mockRpcFn).toHaveBeenNthCalledWith(2, 'get_daily_stats', { p_date: '2026-07-16' });
        expect(mockRpcFn).toHaveBeenNthCalledWith(3, 'get_api_events', {
            p_start: expectedRangeStart,
            p_end: fakeNowIso,
            p_level: null,
            p_limit: 200
        });
        expect(mockRpcFn).toHaveBeenNthCalledWith(4, 'get_stats_history', { p_days: 7 });
    });

    it('should correctly handle and apply valid custom query parameters', async () => {
        mockRpcFn
            .mockResolvedValueOnce(createRpcSuccess({}))
            .mockResolvedValueOnce(createRpcSuccess({}))
            .mockResolvedValueOnce(createRpcSuccess([]))
            .mockResolvedValueOnce(createRpcSuccess([]));

        const customFrom = '2026-07-10T00:00:00.000Z';
        const customTo = '2026-07-12T23:59:59.000Z';

        const url = `http://localhost/api/monitor/health?hours=48&level=error&from=${customFrom}&to=${customTo}&days=30`;
        const req = new NextRequest(url);

        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.appliedFilters).toEqual({
            hours: 48,
            level: 'error',
            from: customFrom,
            to: customTo,
            days: 30
        });

        expect(mockRpcFn).toHaveBeenNthCalledWith(1, 'get_api_health', { p_hours: 48 });
        expect(mockRpcFn).toHaveBeenNthCalledWith(3, 'get_api_events', {
            p_start: customFrom,
            p_end: customTo,
            p_level: 'error',
            p_limit: 200
        });
        expect(mockRpcFn).toHaveBeenNthCalledWith(4, 'get_stats_history', { p_days: 30 });
    });

    it('should reset out-of-bounds or invalid custom parameters to their default parameters safely', async () => {
        mockRpcFn
            .mockResolvedValueOnce(createRpcSuccess({}))
            .mockResolvedValueOnce(createRpcSuccess({}))
            .mockResolvedValueOnce(createRpcSuccess([]))
            .mockResolvedValueOnce(createRpcSuccess([]));

        // hours > 168 (invalid), level=hacker (invalid), days=95 (invalid), ISO dates are garbage strings
        const url = 'http://localhost/api/monitor/health?hours=500&level=invalid_level&from=not-a-date&to=bad-date&days=-10';
        const req = new NextRequest(url);

        const res = await GET(req);
        const body = await res.json();

        const expectedRangeStart = new Date(FAKE_NOW_MS - 24 * 3600_000).toISOString();
        expect(body.appliedFilters).toEqual({
            hours: 24, // fallback from 500
            level: null, // fallback from invalid_level
            from: expectedRangeStart,
            to: fakeNowIso,
            days: 7 // fallback from -10
        });
    });

    it('should return 500 Internal Server Error if the critical get_api_health RPC data loading fails', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Critical health RPC fails
        mockRpcFn
            .mockResolvedValueOnce(createRpcFailure('Database down connection timeout'))
            .mockResolvedValueOnce(createRpcSuccess({}))
            .mockResolvedValueOnce(createRpcSuccess([]))
            .mockResolvedValueOnce(createRpcSuccess([]));

        const req = new NextRequest('http://localhost/api/monitor/health');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ ok: false, error: 'Failed to load health data.' });
        expect(consoleSpy).toHaveBeenCalledWith(
            '[/api/monitor/health] RPC failed:',
            expect.objectContaining({ message: 'Database down connection timeout' })
        );

        consoleSpy.mockRestore();
    });

    it('should process gracefully and return 200 with empty fallbacks if non-critical RPC execution calls fail', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // health passes, but dailyStats, events, and statsHistory fail
        mockRpcFn
            .mockResolvedValueOnce(createRpcSuccess({ status: 'ok' }))
            .mockResolvedValueOnce(createRpcFailure('daily stats error'))
            .mockResolvedValueOnce(createRpcFailure('events processing error'))
            .mockResolvedValueOnce(createRpcFailure('history fetching error'));

        const req = new NextRequest('http://localhost/api/monitor/health');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.health).toEqual({ status: 'ok' });

        // Non-critical structural resilience validations
        expect(body.dailyStats).toBeNull();
        expect(body.events).toEqual([]);
        expect(body.statsHistory).toEqual([]);

        // Ensure errors were caught and written out to internal console streams
        expect(consoleSpy).toHaveBeenCalledWith('[/api/monitor/health] get_api_events RPC failed:', expect.any(Object));
        expect(consoleSpy).toHaveBeenCalledWith('[/api/monitor/health] get_stats_history RPC failed:', expect.any(Object));

        consoleSpy.mockRestore();
    });
});