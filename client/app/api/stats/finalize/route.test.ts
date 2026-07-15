// app/api/stats/finalize/route.test.ts
// pnpm --prefix client test app/api/stats/finalize/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { checkIpRateLimit } from '@/src/lib/support/ipRateLimit';
import { unpackCookie } from '@/src/lib/support/rateLimitCookie';
import { getMaxGuessLimit } from '@/src/lib/support/constantsExtractor';
import { getTodayStr, getBangkokDateStr } from '@/src/lib/utils/format';
import { logApiEvent } from '@/src/services/monitor/logEvent';
import { NextRequest } from 'next/server';
import { PostgrestResponse } from '@supabase/supabase-js';

// ── 1. MOCK ALL DEPENDENCIES OUTSIDE TO ENSURE ISOLATION ──

vi.mock('@/src/lib/supabase/supabase-server', () => ({
    supabaseServer: {
        rpc: vi.fn(),
    },
}));

vi.mock('@/src/lib/support/rateLimitCookie', () => ({
    packCookie: vi.fn((val) => `packed_${val}`),
    unpackCookie: vi.fn(),
}));

vi.mock('@/src/lib/support/ipRateLimit', () => ({
    checkIpRateLimit: vi.fn(),
}));

vi.mock('@/src/lib/support/constantsExtractor', () => ({
    getMaxGuessLimit: vi.fn(),
}));

vi.mock('@/src/lib/utils/format', () => ({
    getTodayStr: vi.fn(),
    getBangkokDateStr: vi.fn(),
}));

vi.mock('@/src/services/monitor/logEvent', () => ({
    logApiEvent: vi.fn(),
}));

// Mock valid modes to match imports from types
vi.mock('@/src/entities/stats/types', () => ({
    VALID_STAT_MODES: ['song', 'character', 'quote'],
}));

describe('POST /api/stats/finalize Route Handler', () => {
    const defaultBody = {
        mode: 'song',
        isWin: true,
        guessCount: 3,
        date: '2026-07-16',
    };

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(getTodayStr).mockReturnValue('2026-07-16');
        vi.mocked(getBangkokDateStr).mockReturnValue('2026-07-15');
        vi.mocked(getMaxGuessLimit).mockReturnValue(6);
        vi.mocked(checkIpRateLimit).mockReturnValue({ success: true, retryAfter: 0 });
        vi.mocked(unpackCookie).mockReturnValue(null);

        // 🎯 Fix: ต้องใส่ success: true เพื่อผ่าน Type Discrimination
        const mockSuccessResponse = {
            data: null,
            error: null,
            count: null,
            status: 200,
            statusText: 'OK',
            success: true,
        } as unknown as PostgrestResponse<unknown>;

        vi.mocked(supabaseServer.rpc).mockResolvedValue(mockSuccessResponse);
    });

    // 🎯 Enterprise Fix: เปลี่ยนจาก any เป็น Record<string, unknown> หรือระบุโครงสร้างแบบยืดหยุ่นรองรับเคสเทสลบ
    const createRequest = (body: Record<string, unknown> | null, cookieValue?: string) => {
        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (cookieValue) {
            headers.set('Cookie', `sfz_cd_song=${cookieValue}`);
        }
        return new NextRequest('http://localhost:3000/api/stats/finalize', {
            method: 'POST',
            headers,
            body: body === null ? null : JSON.stringify(body),
        });
    };

    // ── GROUP 1: INPUT VALIDATION TESTS ──
    describe('Input Validation', () => {
        it('should return 400 if JSON body is invalid or empty', async () => {
            const req = new NextRequest('http://localhost:3000/api/stats/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid-json-{',
            });

            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(400);
            expect(json.error).toBe('Invalid JSON body');
            expect(logApiEvent).toHaveBeenCalledWith(expect.any(String), 'warning', 400, 'invalid_json_body');
        });

        it('should return 400 if the provided mode is not supported', async () => {
            const req = createRequest({ ...defaultBody, mode: 'invalid_mode' });

            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(400);
            expect(json.error).toBe('Invalid mode');
            expect(logApiEvent).toHaveBeenCalledWith(expect.any(String), 'warning', 400, 'invalid_mode');
        });

        it('should return 400 if isWin is not a boolean', async () => {
            const req = createRequest({ ...defaultBody, isWin: 'true' }); // sent as string

            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(400);
            expect(json.error).toBe('isWin must be boolean');
        });

        it('should return 400 if guessCount exceeds max dynamic limit or is less than 1', async () => {
            vi.mocked(getMaxGuessLimit).mockReturnValue(6);

            const overLimitReq = createRequest({ ...defaultBody, guessCount: 7 });
            const underLimitReq = createRequest({ ...defaultBody, guessCount: 0 });

            const resOver = await POST(overLimitReq);
            const resUnder = await POST(underLimitReq);

            expect(resOver.status).toBe(400);
            expect(resUnder.status).toBe(400);
            expect(logApiEvent).toHaveBeenCalledWith(expect.any(String), 'warning', 400, 'invalid_guessCount');
        });
    });

    // ── GROUP 2: DATE SUBMISSION & ENTERPRISE SECURITY TESTS ──
    describe('Date Validation & Anti-Spoofing Guard', () => {
        it('should return 400 if the client date format is invalid', async () => {
            const req = createRequest({ ...defaultBody, date: '16-07-2026' }); // Not YYYY-MM-DD

            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(400);
            expect(json.error).toBe('Invalid date format');
        });

        it('should return 400 if the submitted date is outside the allowed window (neither today nor yesterday)', async () => {
            const req = createRequest({ ...defaultBody, date: '2026-07-14' }); // Day before yesterday

            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(400);
            expect(json.error).toBe('Stats can only be finalized for today or yesterday.');
            expect(logApiEvent).toHaveBeenCalledWith(expect.any(String), 'warning', 400, 'date_out_of_allowed_window');
        });

        it('should accept submitted date if it represents yesterday (Bangkok Time)', async () => {
            const req = createRequest({ ...defaultBody, date: '2026-07-15' }); // Yesterday

            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            // Ensure DB RPC receives the yesterday date
            expect(supabaseServer.rpc).toHaveBeenCalledWith('increment_daily_stat', expect.objectContaining({
                p_date: '2026-07-15',
            }));
        });
    });

    // ── GROUP 3: RATE LIMITING & SECURITY GUARDS TESTS ──
    describe('Security and Rate Limits', () => {
        it('should return 429 if the cookie cooldown is active', async () => {
            // Simulate that 2 seconds have passed since a submission (Cooldown is 5s)
            const mockLastSubmitMs = Date.now() - 2000;
            vi.mocked(unpackCookie).mockReturnValue(String(mockLastSubmitMs));

            const req = createRequest(defaultBody, 'active_cookie_payload');
            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(429);
            expect(json.error).toBe('Too many requests, slow down.');
            expect(json.retryAfter).toBe(3); // 5 - 2 = 3s remaining
        });

        it('should return 429 if IP rate limit check fails', async () => {
            vi.mocked(checkIpRateLimit).mockReturnValue({ success: false, retryAfter: 4 });

            const req = createRequest(defaultBody);
            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(429);
            expect(json.error).toContain('Kido Barrier: Rate limit exceeded');
            expect(json.retryAfter).toBe(4);
        });
    });

    // ── GROUP 4: DATABASE RPC AND SUCCESS STATES TESTS ──
    describe('Database Interactions', () => {
        it('should return 500 if the Supabase rpc call throws a database error', async () => {
            // 🎯 Enterprise Fix: ปั้น Error Object โครงสร้างตรงตาม PostgrestResponse จริง ๆ แทนการ cast as any
            const mockError = {
                message: 'Database query timeout',
                details: '',
                hint: '',
                code: '500',
                // ต้องมีเมธอดเหล่านี้เพื่อผ่าน Type Checking
                toJSON: () => ({}),
                name: 'PostgrestError'
            };

            const mockErrorResponse = {
                data: null,
                error: mockError,
                count: null,
                status: 500,
                statusText: 'Internal Server Error',
            } as PostgrestResponse<unknown>;
            vi.mocked(supabaseServer.rpc).mockResolvedValue(mockErrorResponse);

            const req = createRequest(defaultBody);
            const response = await POST(req);
            const json = await response.json();

            expect(response.status).toBe(500);
            expect(json.error).toBe('Failed to record stat');
            expect(logApiEvent).toHaveBeenCalledWith(expect.any(String), 'error', 500, 'Database query timeout');
        });

        it('should successfully update stats and set browser cooldown cookie upon valid request', async () => {
            const req = createRequest(defaultBody);
            const response = await POST(req);
            const json = await response.json();

            // Assert status and body
            expect(response.status).toBe(200);
            expect(json.success).toBe(true);

            // Verify DB interaction parameters
            expect(supabaseServer.rpc).toHaveBeenCalledWith('increment_daily_stat', {
                p_date: '2026-07-16',
                p_mode: 'song',
                p_passed: true,
                p_guess_count: 3,
            });

            // Assert that cooldown cookie is generated and appended onto the Response Header
            const setCookieHeader = response.headers.get('set-cookie');
            expect(setCookieHeader).toBeDefined();
            expect(setCookieHeader).toContain('sfz_cd_song=packed_');
            expect(logApiEvent).toHaveBeenCalledWith(expect.any(String), 'success', 200);
        });

        it('should send null for p_guess_count to Supabase if the user lost the game (isWin: false)', async () => {
            const req = createRequest({ ...defaultBody, isWin: false, guessCount: 6 });
            const response = await POST(req);

            expect(response.status).toBe(200);
            expect(supabaseServer.rpc).toHaveBeenCalledWith('increment_daily_stat', {
                p_date: '2026-07-16',
                p_mode: 'song',
                p_passed: false,
                p_guess_count: null, // guessCount must be null on failure as per code logic
            });
        });
    });
});