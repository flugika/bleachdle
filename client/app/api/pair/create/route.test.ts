// app/api/pair/create/route.test.ts
// pnpm --prefix client test app/api/pair/create/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { verifyTurnstileToken } from '@/src/lib/turnstile/verifyTurnstileToken';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import { edgeRateLimit, getClientIp, getRateLimitKey } from '@/src/lib/rateLimit';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ MOCK BUILDERS FOR SUPABASE RPC ────────────────────────────────────────
const mockRpcFn = vi.fn();

class MockPostgrestError extends Error {
    details = 'Database execution failed internally.';
    hint = 'Check database constraints.';
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
    DEVICE_ID_COOKIE: 'bleachdle_device_id',
}));

vi.mock('@/src/lib/turnstile/verifyTurnstileToken', () => ({
    verifyTurnstileToken: vi.fn(),
}));

vi.mock('@/src/lib/auth/verifySameOrigin', () => ({
    verifySameOrigin: vi.fn(),
}));

vi.mock('@/src/lib/rateLimit', () => ({
    edgeRateLimit: vi.fn(),
    getClientIp: vi.fn(),
    getRateLimitKey: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Pairing Code Creation API Endpoint Suite (POST /api/pair/create)', () => {
    const MOCK_PLAYER_ID = 'player-uuid-1111';
    const MOCK_DEVICE_ID = 'device-uuid-9999';
    const MOCK_CLIENT_IP = '203.0.113.195';
    const MOCK_TURNSTILE_TOKEN = 'mock-valid-turnstile-token-abc';
    const MOCK_PAIRING_CODE = '654321';
    const MOCK_EXPIRES_AT = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Implementations
        vi.mocked(verifySameOrigin).mockReturnValue(true);
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-pair-create');
        vi.mocked(getClientIp).mockReturnValue(MOCK_CLIENT_IP);
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
        vi.mocked(verifyTurnstileToken).mockResolvedValue(true);

        mockRpcFn.mockResolvedValue({
            data: [{ code: MOCK_PAIRING_CODE, expires_at: MOCK_EXPIRES_AT }],
            error: null,
        });
    });

    const createValidAuthReq = (body: unknown) =>
        new NextRequest('http://localhost/api/pair/create', {
            method: 'POST',
            headers: {
                cookie: `${DEVICE_ID_COOKIE}=${MOCK_DEVICE_ID}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });

    // ==========================================
    // 🛡️ SECURITY & EDGE RATE LIMITING
    // ==========================================
    describe('Security & Edge Rate Limiting Guards', () => {
        it('should return 403 Forbidden when origin verification check fails', async () => {
            vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/pair/create', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'invalid origin' });
            expect(edgeRateLimit).not.toHaveBeenCalled();
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 429 Rate Limited when edge rate limit capacity (5 req / 60s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/pair/create', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-pair-create', 5, 60000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔑 AUTHENTICATION & COOKIE GUARDS
    // ==========================================
    describe('Authentication & Identity Guards', () => {
        it('should return 401 Unauthenticated if resolvePlayerFromCookie returns null', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = createValidAuthReq({ turnstileToken: MOCK_TURNSTILE_TOKEN });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if DEVICE_ID_COOKIE is missing from request', async () => {
            const req = new NextRequest('http://localhost/api/pair/create', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ turnstileToken: MOCK_TURNSTILE_TOKEN }),
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🤖 PAYLOAD VALIDATION & TURNSTILE GUARDS
    // ==========================================
    describe('Payload Validation & Turnstile Challenge', () => {
        it('should return 400 when body is invalid JSON or empty', async () => {
            const req = new NextRequest('http://localhost/api/pair/create', {
                method: 'POST',
                headers: { cookie: `${DEVICE_ID_COOKIE}=${MOCK_DEVICE_ID}` },
                body: 'invalid-json-body',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'verification required' });
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('should return 400 when turnstileToken is empty or missing from body', async () => {
            const req = createValidAuthReq({ turnstileToken: '' });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'verification required' });
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('should return 403 when verifyTurnstileToken fails validation check', async () => {
            vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);

            const req = createValidAuthReq({ turnstileToken: 'invalid-token' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'verification failed' });
            expect(getClientIp).toHaveBeenCalledWith(req);
            expect(verifyTurnstileToken).toHaveBeenCalledWith('invalid-token', MOCK_CLIENT_IP);
            expect(mockRpcFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 💥 DATABASE & RPC FAILURE MODES
    // ==========================================
    describe('Database RPC Failures & Quota Guards', () => {
        it('should return 429 when RPC fails with "too many pairing codes" error message', async () => {
            mockRpcFn.mockResolvedValueOnce(
                createDbFailure('RPC error: too many pairing codes created recently')
            );

            const req = createValidAuthReq({ turnstileToken: MOCK_TURNSTILE_TOKEN });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({
                error: 'too many pairing codes created recently — please try again later',
            });
        });

        it('should return 500 internal error and log console error when generic RPC failure occurs', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockResolvedValueOnce(createDbFailure('Fatal database connection error'));

            const req = createValidAuthReq({ turnstileToken: MOCK_TURNSTILE_TOKEN });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[pair/create] rpc failed:',
                expect.objectContaining({ message: 'Fatal database connection error' })
            );

            consoleSpy.mockRestore();
        });

        it('should return 500 internal error when RPC execution returns empty array or null data', async () => {
            mockRpcFn.mockResolvedValueOnce({ data: [], error: null });

            const req = createValidAuthReq({ turnstileToken: MOCK_TURNSTILE_TOKEN });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });
        });
    });

    // ==========================================
    // 🔄 SUCCESSFUL CREATION (HAPPY PATH)
    // ==========================================
    describe('Successful Pairing Code Creation', () => {
        it('should verify turnstile token, call create_pairing_code RPC, and return code with expiration (Happy Path)', async () => {
            const req = createValidAuthReq({ turnstileToken: MOCK_TURNSTILE_TOKEN });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({
                code: MOCK_PAIRING_CODE,
                expiresAt: MOCK_EXPIRES_AT,
            });

            // 1. Verify Turnstile call with client IP
            expect(getClientIp).toHaveBeenCalledWith(req);
            expect(verifyTurnstileToken).toHaveBeenCalledWith(MOCK_TURNSTILE_TOKEN, MOCK_CLIENT_IP);

            // 2. Verify RPC parameters match exact player and device IDs
            expect(mockRpcFn).toHaveBeenCalledWith('create_pairing_code', {
                p_player_id: MOCK_PLAYER_ID,
                p_device_id: MOCK_DEVICE_ID,
            });
        });
    });
});