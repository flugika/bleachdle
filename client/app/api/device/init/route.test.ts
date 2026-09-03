// app/api/device/init/route.test.ts
// pnpm --prefix client test app/api/device/init/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import {
    resolvePlayerFromCookie,
    provisionNewPlayerDevice,
    DEVICE_SECRET_COOKIE,
} from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { hashIp } from '@/src/lib/auth/hmac';
import { parseUserAgent } from '@/src/lib/auth/parseUserAgent';
import { verifyTurnstileToken } from '@/src/lib/turnstile/verifyTurnstileToken';
import { edgeRateLimit, getClientIp, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import type { PostgrestSingleResponse, PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ ENTERPRISE TYPE-SAFE RPC & DB MOCK BUILDERS ─────────────────────────
const mockRpcFn = vi.fn();
const mockIsFn = vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null }));
const mockEqFn = vi.fn().mockReturnValue({ is: mockIsFn });
const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockEqFn });
const mockFromFn = vi.fn().mockReturnValue({ update: mockUpdateFn });

// ─── 🛡️ MOCK ERROR CLASS (BULLETPROOF AGAINST TYPE INFERENCE) ────────────────
class MockPostgrestError extends Error {
    details: string = 'Database execution failed internally.';
    hint: string = 'Check database schema and constraints.';
    code: string = 'P0001';

    constructor(message: string) {
        super(message);
        this.name = 'PostgrestError';
    }

    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            details: this.details,
            hint: this.hint,
            code: this.code,
        };
    }
}

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
    const postgrestError = new MockPostgrestError(message) as unknown as PostgrestError;

    return {
        data: null,
        error: postgrestError,
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
        from: vi.fn((...args) => mockFromFn(...args)),
    },
}));

vi.mock('@/src/lib/auth/resolvePlayer', () => ({
    resolvePlayerFromCookie: vi.fn(),
    provisionNewPlayerDevice: vi.fn(),
    DEVICE_ID_COOKIE: 'bleachdle_device_id',
    DEVICE_SECRET_COOKIE: 'bleachdle_device_secret',
    COOKIE_OPTS: { httpOnly: true, sameSite: 'lax', path: '/' },
}));

vi.mock('@/src/lib/auth/hmac', () => ({
    hashIp: vi.fn(),
}));

vi.mock('@/src/lib/auth/parseUserAgent', () => ({
    parseUserAgent: vi.fn(),
}));

vi.mock('@/src/lib/turnstile/verifyTurnstileToken', () => ({
    verifyTurnstileToken: vi.fn(),
}));

vi.mock('@/src/lib/rateLimit', () => ({
    edgeRateLimit: vi.fn(),
    getClientIp: vi.fn(),
    getRateLimitKey: vi.fn(),
}));

vi.mock('@/src/lib/auth/verifySameOrigin', () => ({
    verifySameOrigin: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Device Initialization API Endpoint Suite (POST /api/device/init)', () => {
    const MOCK_CLIENT_IP = '203.0.113.195';
    const MOCK_IP_HASH = 'hashed_ip_abc123';
    const MOCK_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0';
    const MOCK_PARSED_LABEL = 'Chrome 120 (Windows)';

    beforeEach(() => {
        vi.clearAllMocks();

        // Standard Default Mock Implementations
        vi.mocked(verifySameOrigin).mockReturnValue(true);
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-123');
        vi.mocked(getClientIp).mockReturnValue(MOCK_CLIENT_IP);
        vi.mocked(parseUserAgent).mockReturnValue(MOCK_PARSED_LABEL);
        vi.mocked(hashIp).mockReturnValue(MOCK_IP_HASH);
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(null);
        vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
        mockRpcFn.mockResolvedValue(createRpcSuccess(true));
        mockIsFn.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    });

    // ==========================================
    // 🛡️ SECURITY & RATE LIMITING BLOCKS
    // ==========================================
    describe('Security & Edge Rate Limiting Guards', () => {
        it('should return 403 Forbidden when origin verification check fails', async () => {
            vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/device/init', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'invalid origin' });
            expect(edgeRateLimit).not.toHaveBeenCalled();
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 429 Rate Limited when edge rate limit capacity is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/device/init', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔄 RETURNING VISITORS & BACKFILL BLOCKS
    // ==========================================
    describe('Returning Visitors & Opportunistic Device Label Backfill', () => {
        it('should return 200 status existing and trigger opportunistic label backfill when existing device cookie is present', async () => {
            const existingDeviceId = 'dev-uuid-9999';
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce('player-uuid-1111');

            const req = new NextRequest('http://localhost/api/device/init', {
                method: 'POST',
                headers: {
                    'user-agent': MOCK_USER_AGENT,
                    cookie: `${DEVICE_ID_COOKIE}=${existingDeviceId}`,
                },
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ status: 'existing' });

            // Verify Backfill DB Call Logic
            expect(mockFromFn).toHaveBeenCalledWith('player_devices');
            expect(mockUpdateFn).toHaveBeenCalledWith({ device_label: MOCK_PARSED_LABEL });
            expect(mockEqFn).toHaveBeenCalledWith('device_id', existingDeviceId);
            expect(mockIsFn).toHaveBeenCalledWith('device_label', null);

            // Ensure Turnstile / Provisioning are skipped
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
            expect(provisionNewPlayerDevice).not.toHaveBeenCalled();
        });

        it('should return 200 status existing without triggering DB backfill if device cookie is missing', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce('player-uuid-1111');

            const req = new NextRequest('http://localhost/api/device/init', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ status: 'existing' });

            // Verify DB update was NOT called because device_id cookie wasn't provided
            expect(mockFromFn).not.toHaveBeenCalled();
            expect(provisionNewPlayerDevice).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🧩 TWO-PHASE TURNSTILE CHALLENGE BLOCKS
    // ==========================================
    describe('Two-Phase Turnstile Bot Defense Engine', () => {
        it('should return 400 turnstile_required when new device sends no token (Phase 1 Challenge)', async () => {
            const req = new NextRequest('http://localhost/api/device/init', {
                method: 'POST',
                body: JSON.stringify({}),
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'turnstile_required' });
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
            expect(provisionNewPlayerDevice).not.toHaveBeenCalled();
        });

        it('should return 400 turnstile_required when request payload is empty or unparseable JSON', async () => {
            const req = new NextRequest('http://localhost/api/device/init', {
                method: 'POST',
                body: '{ corrupted_json_payload ',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'turnstile_required' });
        });

        it('should return 403 verification failed when Turnstile token validation fails (Phase 2)', async () => {
            vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);

            const req = new NextRequest('http://localhost/api/device/init', {
                method: 'POST',
                body: JSON.stringify({ turnstileToken: 'invalid_turnstile_token' }),
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'verification failed' });
            expect(verifyTurnstileToken).toHaveBeenCalledWith('invalid_turnstile_token', MOCK_CLIENT_IP);
            expect(mockRpcFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🛑 NETWORK IP CAP & DB CHECKS
    // ==========================================
    describe('Network Level Provisioning Cap Control', () => {
        it('should return 500 internal error and log message when RPC provision cap check throws DB error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockResolvedValueOnce(createRpcFailure('Database lock timeout'));

            const req = new NextRequest('http://localhost/api/device/init', {
                method: 'POST',
                body: JSON.stringify({ turnstileToken: 'valid_token' }),
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });
            expect(mockRpcFn).toHaveBeenCalledWith('check_and_log_provision_attempt', {
                p_ip_hash: MOCK_IP_HASH,
            });
            expect(consoleSpy).toHaveBeenCalledWith(
                '[device/init] provisioning cap check failed:',
                expect.objectContaining({ message: 'Database lock timeout' })
            );

            consoleSpy.mockRestore();
        });

        it('should return 429 rate limited when IP network cap limit is exceeded (allowed = false)', async () => {
            mockRpcFn.mockResolvedValueOnce(createRpcSuccess(false));

            const req = new NextRequest('http://localhost/api/device/init', {
                method: 'POST',
                body: JSON.stringify({ turnstileToken: 'valid_token' }),
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({
                error: 'too many new devices from this network recently, please try again later',
            });
            expect(provisionNewPlayerDevice).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🚀 NEW DEVICE PROVISIONING & COOKIE BLOCKS
    // ==========================================
    describe('New Device Provisioning & Cookie Dispatch (Happy Path)', () => {
        it('should successfully provision a new device, set secure auth cookies, and return 200 created', async () => {
            const newDeviceId = 'new-device-id-001';
            const newDeviceSecret = 'new-device-secret-key-999';
            const newPlayerId = 'new-player-id-001';

            vi.mocked(provisionNewPlayerDevice).mockResolvedValueOnce({
                deviceId: newDeviceId,
                deviceSecret: newDeviceSecret,
                playerId: newPlayerId,
            });

            const req = new NextRequest('http://localhost/api/device/init', {
                method: 'POST',
                headers: { 'user-agent': MOCK_USER_AGENT },
                body: JSON.stringify({ turnstileToken: 'valid_turnstile_token' }),
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ status: 'created' });

            // Verify Service Call Parameters
            expect(provisionNewPlayerDevice).toHaveBeenCalledWith(MOCK_PARSED_LABEL);

            // Verify Auth Cookie Setters
            expect(res.cookies.get(DEVICE_ID_COOKIE)?.value).toBe(newDeviceId);
            expect(res.cookies.get(DEVICE_SECRET_COOKIE)?.value).toBe(newDeviceSecret);
        });

        it('should return 500 internal error and log stack trace when provisionNewPlayerDevice throws an exception', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const fatalError = new Error('Crypto secret generation failure');
            vi.mocked(provisionNewPlayerDevice).mockRejectedValueOnce(fatalError);

            const req = new NextRequest('http://localhost/api/device/init', {
                method: 'POST',
                body: JSON.stringify({ turnstileToken: 'valid_turnstile_token' }),
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });
            expect(consoleSpy).toHaveBeenCalledWith('[device/init] provisioning failed:', fatalError);

            consoleSpy.mockRestore();
        });
    });
});