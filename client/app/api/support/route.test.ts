// app/api/support/route.test.ts
// pnpm --prefix client test app/api/support/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { unpackCookie, packCookie } from '@/src/lib/support/rateLimitCookie';
import { checkIpRateLimit } from '@/src/lib/support/ipRateLimit';
import { sanitizeInput } from '@/src/lib/utils/sanitize';
import { logApiEvent } from '@/src/services/monitor/logEvent';
import type { PostgrestSingleResponse, PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ ENTERPRISE-GRADE MOCK CLASSES & BUILDERS ─────────────────────────────
const mockInsertFn = vi.fn();

/**
 * MockPostgrestError implements Supabase's PostgrestError interface 
 * while maintaining inheritance from the native JS Error class.
 * This guarantees both TS compilation compliance and proper runtime error handling.
 */
class MockPostgrestError extends Error implements PostgrestError {
    details: string;
    hint: string;
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'PostgrestError';
        this.details = 'Database column constraint violation.';
        this.hint = 'Check lengths and foreign keys.';
        this.code = code;

        // Ensure correct prototype chain inheritance in transpiled environments
        Object.setPrototypeOf(this, MockPostgrestError.prototype);
    }

    /**
     * Strictly fulfills the structural contract expected by PostgrestError['toJSON']
     */
    toJSON(): {
        name: string;
        message: string;
        details: string;
        hint: string;
        code: string;
    } {
        return {
            name: this.name,
            message: this.message,
            details: this.details,
            hint: this.hint,
            code: this.code,
        };
    }
}

function createMockSuccessResponse(): PostgrestSingleResponse<null> {
    return {
        data: null,
        error: null,
        count: null,
        status: 201,
        statusText: 'Created',
        success: true,
    };
}

function createMockFailureResponse(
    message: string,
    code = 'DATABASE_ERROR'
): PostgrestSingleResponse<null> {
    return {
        data: null,
        error: new MockPostgrestError(message, code),
        count: null,
        status: 500,
        statusText: 'Internal Server Error',
        success: false,
    };
}

// ─── 🚀 MODULE MOCKS ──────────────────────────────────────────────────────────
vi.mock('@/src/lib/supabase/supabase-server', () => ({
    supabaseServer: {
        from: vi.fn(() => ({
            insert: mockInsertFn,
        })),
    },
}));

vi.mock('@/src/lib/support/rateLimitCookie', () => ({
    packCookie: vi.fn((val: string) => `packed_${val}`),
    unpackCookie: vi.fn(),
    todayKey: vi.fn(() => '2026-07-16'),
}));

vi.mock('@/src/lib/utils/sanitize', () => ({
    sanitizeInput: vi.fn((str: string) => `sanitized_${str}`),
}));

vi.mock('@/src/lib/support/ipRateLimit', () => ({
    checkIpRateLimit: vi.fn(),
}));

vi.mock('@/src/services/monitor/logEvent', () => ({
    logApiEvent: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('POST /api/support', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default safe mocks for pass-through behavior
        vi.mocked(unpackCookie).mockReturnValue(null);
        vi.mocked(checkIpRateLimit).mockReturnValue({ success: true, retryAfter: 0 });
        mockInsertFn.mockResolvedValue(createMockSuccessResponse());
    });

    it('should return 400 if the request body is not valid JSON', async () => {
        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: 'invalid-non-json-string',
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ ok: false, error: 'Invalid request body.' });
        expect(logApiEvent).toHaveBeenCalledWith('support', 'warning', 400, 'invalid_json_body');
    });

    it('should trigger honeypot, skip processing, and return 200 if honeypot field is filled', async () => {
        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: JSON.stringify({
                category: 'bug',
                message: 'Valid length message here.',
                honeypot: 'i_am_a_bot',
            }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ ok: true });
        expect(logApiEvent).toHaveBeenCalledWith('support', 'warning', 200, 'honeypot_triggered');
        expect(supabaseServer.from).not.toHaveBeenCalled();
    });

    it('should return 400 if the message length violates minimum boundaries', async () => {
        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: JSON.stringify({
                category: 'bug',
                message: 'short', // less than MIN_LEN (10)
            }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ ok: false, error: 'Invalid message length.' });
        expect(logApiEvent).toHaveBeenCalledWith('support', 'warning', 400, 'invalid_message_length');
    });

    it('should return 400 if the category is not recognized in allowed list', async () => {
        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: JSON.stringify({
                category: 'hacking_attempt',
                message: 'Valid message length that passes criteria.',
            }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body).toEqual({ ok: false, error: 'Invalid category.' });
        expect(logApiEvent).toHaveBeenCalledWith('support', 'warning', 400, 'invalid_category');
    });

    it('should return 429 if the device cooldown cookie is still active', async () => {
        const recentTimestamp = String(Date.now() - 30 * 1000); // 30 seconds ago (Cooldown is 120s)
        vi.mocked(unpackCookie).mockReturnValueOnce(recentTimestamp);

        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: JSON.stringify({
                category: 'feedback',
                message: 'Valid message length that passes criteria.',
            }),
        });
        req.cookies.set('spt_cd', 'packed_timestamp');

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(body.error).toBe('The Kido barrier is still recharging.');
        expect(body.retryAfter).toBeGreaterThan(0);
        expect(logApiEvent).toHaveBeenCalledWith('support', 'warning', 429, 'cooldown_active');
    });

    it('should return 429 if the IP network rate limit validation fails', async () => {
        vi.mocked(checkIpRateLimit).mockReturnValueOnce({ success: false, retryAfter: 120 });

        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: JSON.stringify({
                category: 'feedback',
                message: 'Valid message length that passes criteria.',
            }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(body.error).toBe('Too many tickets sent from this network. Please wait.');
        expect(logApiEvent).toHaveBeenCalledWith('support', 'warning', 429, 'ip_rate_limited');
    });

    it('should return 429 if the daily submission counter cookie reaches max limit', async () => {
        vi.mocked(unpackCookie)
            .mockReturnValueOnce(null) // for cooldown pass
            .mockReturnValueOnce('8:2026-07-16'); // 8 tickets submitted today (Max limit is 8)

        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: JSON.stringify({
                category: 'feedback',
                message: 'Valid message length that passes criteria.',
            }),
        });
        req.cookies.set('spt_ct', 'packed_counter');

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(429);
        expect(body.error).toBe('Daily report limit reached for this device.');
        expect(logApiEvent).toHaveBeenCalledWith('support', 'warning', 429, 'daily_limit_reached');
    });

    it('should return 500 if database validation or injection operation throws an internal error', async () => {
        const mockDbError = createMockFailureResponse('Database structure error');
        mockInsertFn.mockResolvedValueOnce(mockDbError);

        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: JSON.stringify({
                category: 'suggestion',
                message: 'Valid message length that passes criteria.',
            }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body).toEqual({ ok: false, error: 'Server error.' });
        expect(logApiEvent).toHaveBeenCalledWith('support', 'error', 500, 'Database structure error');
    });

    it('should successfully sanitize inputs, insert ticket to DB, set response cookies, and return 200', async () => {
        vi.mocked(unpackCookie)
            .mockReturnValueOnce(null) // cooldown empty
            .mockReturnValueOnce('2:2026-07-16'); // daily count was 2

        const req = new NextRequest('http://localhost/api/support', {
            method: 'POST',
            body: JSON.stringify({
                category: 'suggestion',
                message: 'Valid standard message.',
                clientRef: 'ref_1234567890_long_client_reference_identifier_string',
            }),
        });

        const res = await POST(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({ ok: true, cooldownSeconds: 120 });

        // Validate sanitize and strict data alignment
        expect(sanitizeInput).toHaveBeenCalledWith('Valid standard message.');
        expect(supabaseServer.from).toHaveBeenCalledWith('support_tickets');
        expect(mockInsertFn).toHaveBeenCalledWith({
            category: 'suggestion',
            message: 'sanitized_Valid standard message.',
            client_ref: 'ref_1234567890_long_client_reference_identifier_string', // preserved under 64 chars
        });

        // Validate Cookie dispatch mechanisms
        expect(res.cookies.get('spt_cd')).toBeDefined();
        expect(res.cookies.get('spt_ct')).toBeDefined();
        expect(packCookie).toHaveBeenCalledWith(expect.stringContaining('3:2026-07-16')); // incremented 2 -> 3
        expect(logApiEvent).toHaveBeenCalledWith('support', 'success', 200);
    });
});