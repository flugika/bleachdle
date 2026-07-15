// app/api/stats/daily/route.test.ts
// pnpm --prefix client test app/api/stats/daily/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { edgeRateLimit } from '@/src/lib/rateLimit';
import { logApiEvent } from '@/src/services/monitor/logEvent';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

// ─── 🛠️ TYPE-SAFE MOCK BUILDERS ──────────────────────────────────────────────
// Properly satisfies Supabase's strict interface structurally without any casting shortcuts.

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

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('GET /api/stats/daily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 and log a warning if rate limit is exceeded', async () => {
    vi.mocked(edgeRateLimit).mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/stats/daily');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body).toEqual({ error: 'Too many requests, please slow down.' });
    expect(logApiEvent).toHaveBeenCalledWith('stats.daily', 'warning', 429, 'rate_limited');
    expect(supabaseServer.rpc).not.toHaveBeenCalled();
  });

  it('should return 500 and log an error if the database RPC fails', async () => {
    vi.mocked(edgeRateLimit).mockReturnValue(true);

    const mockError = createMockFailureResponse('Database connection timeout', 'TIMEOUT_ERR');
    vi.mocked(supabaseServer.rpc).mockResolvedValueOnce(mockError);

    const req = new NextRequest('http://localhost/api/stats/daily');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Failed to load stats' });
    expect(logApiEvent).toHaveBeenCalledWith(
      'stats.daily',
      'error',
      500,
      'Database connection timeout'
    );
  });

  it('should return 200, log success, and return correct stats when successful', async () => {
    const mockStatsData = {
      character: { played: 10, passed: 5, distribution: {} },
      song: { played: 8, passed: 4, distribution: {} },
      silhouette: { played: 0, passed: 0, distribution: {} },
      release: { played: 0, passed: 0, distribution: {} },
      emoji: { played: 0, passed: 0, distribution: {} },
      quote: { played: 0, passed: 0, distribution: {} },
    };

    vi.mocked(edgeRateLimit).mockReturnValue(true);

    const mockSuccess = createMockSuccessResponse(mockStatsData);
    vi.mocked(supabaseServer.rpc).mockResolvedValueOnce(mockSuccess);

    const req = new NextRequest('http://localhost/api/stats/daily');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      date: '2026-07-16',
      stats: mockStatsData,
    });
    expect(supabaseServer.rpc).toHaveBeenCalledWith('get_daily_stats', { p_date: '2026-07-16' });
    expect(logApiEvent).toHaveBeenCalledWith('stats.daily', 'success', 200);
  });

  it('should fallback to an empty object if database RPC returns null data without error', async () => {
    vi.mocked(edgeRateLimit).mockReturnValue(true);

    const mockNullData = createMockSuccessResponse(null);
    vi.mocked(supabaseServer.rpc).mockResolvedValueOnce(mockNullData);

    const req = new NextRequest('http://localhost/api/stats/daily');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stats).toEqual({});
  });
});