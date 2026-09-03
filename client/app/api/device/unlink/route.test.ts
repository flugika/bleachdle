// app/api/device/unlink/route.test.ts
// pnpm --prefix client test app/api/device/unlink/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import {
    resolvePlayerFromCookie,
    provisionNewPlayerDevice,
    DEVICE_SECRET_COOKIE,
} from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ ENTERPRISE TYPE-SAFE RPC & DB MOCK BUILDERS ─────────────────────────
const mockEqFn = vi.fn();
const mockDeleteFn = vi.fn().mockReturnValue({ eq: mockEqFn });
const mockFromFn = vi.fn().mockReturnValue({ delete: mockDeleteFn });

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

function createDbFailure(message: string): { error: PostgrestError } {
    const postgrestError = new MockPostgrestError(message) as unknown as PostgrestError;
    return { error: postgrestError };
}

function createDbSuccess(): { error: null } {
    return { error: null };
}

// ─── 🚀 MODULE MOCKS ──────────────────────────────────────────────────────────
vi.mock('@/src/lib/supabase/supabase-server', () => ({
    supabaseServer: {
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

vi.mock('@/src/lib/rateLimit', () => ({
    edgeRateLimit: vi.fn(),
    getRateLimitKey: vi.fn(),
}));

vi.mock('@/src/lib/auth/verifySameOrigin', () => ({
    verifySameOrigin: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Device Unlink API Endpoint Suite (POST /api/device/unlink)', () => {
    const MOCK_EXISTING_PLAYER_ID = 'player-uuid-1111';
    const MOCK_EXISTING_DEVICE_ID = 'device-uuid-9999';

    beforeEach(() => {
        vi.clearAllMocks();

        // Standard Default Mock Implementations
        vi.mocked(verifySameOrigin).mockReturnValue(true);
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-unlink-123');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_EXISTING_PLAYER_ID);
        mockEqFn.mockResolvedValue(createDbSuccess());
    });

    // ==========================================
    // 🛡️ SECURITY & RATE LIMITING BLOCKS
    // ==========================================
    describe('Security & Edge Rate Limiting Guards', () => {
        it('should return 403 Forbidden when origin verification check fails', async () => {
            vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/device/unlink', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'invalid origin' });
            expect(edgeRateLimit).not.toHaveBeenCalled();
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 429 Rate Limited when edge rate limit capacity (5 req / 60s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/device/unlink', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-unlink-123', 5, 60000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔑 AUTHENTICATION & COOKIE GUARDS
    // ==========================================
    describe('Authentication & Identity Validation', () => {
        it('should return 401 Unauthenticated if resolvePlayerFromCookie returns null', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = new NextRequest('http://localhost/api/device/unlink', {
                method: 'POST',
                headers: { cookie: `${DEVICE_ID_COOKIE}=${MOCK_EXISTING_DEVICE_ID}` },
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if DEVICE_ID_COOKIE is missing from request cookies', async () => {
            // Player is resolved, but device_id cookie is missing
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(MOCK_EXISTING_PLAYER_ID);

            const req = new NextRequest('http://localhost/api/device/unlink', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 💥 DATABASE EXECUTION FAILURES
    // ==========================================
    describe('Database Execution Errors', () => {
        it('should return 500 internal error and log console error if Supabase delete query fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockEqFn.mockResolvedValueOnce(createDbFailure('Foreign key constraint violation'));

            const req = new NextRequest('http://localhost/api/device/unlink', {
                method: 'POST',
                headers: { cookie: `${DEVICE_ID_COOKIE}=${MOCK_EXISTING_DEVICE_ID}` },
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(mockFromFn).toHaveBeenCalledWith('player_devices');
            expect(mockDeleteFn).toHaveBeenCalled();
            expect(mockEqFn).toHaveBeenCalledWith('device_id', MOCK_EXISTING_DEVICE_ID);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[device/unlink] delete failed:',
                expect.objectContaining({ message: 'Foreign key constraint violation' })
            );

            expect(provisionNewPlayerDevice).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    // ==========================================
    // 🔄 REPROVISIONING & COOKIE DISPATCH
    // ==========================================
    describe('Reprovisioning & Cookie Management', () => {
        it('should delete existing device row, provision a fresh identity, and issue new auth cookies (Happy Path)', async () => {
            const freshPlayerId = 'fresh-player-uuid-2222';
            const freshDeviceId = 'fresh-device-uuid-8888';
            const freshDeviceSecret = 'fresh-secret-key-7777';

            vi.mocked(provisionNewPlayerDevice).mockResolvedValueOnce({
                playerId: freshPlayerId,
                deviceId: freshDeviceId,
                deviceSecret: freshDeviceSecret,
            });

            const req = new NextRequest('http://localhost/api/device/unlink', {
                method: 'POST',
                headers: { cookie: `${DEVICE_ID_COOKIE}=${MOCK_EXISTING_DEVICE_ID}` },
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ status: 'unlinked' });

            // Verify database deletion was triggered correctly
            expect(mockFromFn).toHaveBeenCalledWith('player_devices');
            expect(mockEqFn).toHaveBeenCalledWith('device_id', MOCK_EXISTING_DEVICE_ID);

            // Verify immediate reprovisioning
            expect(provisionNewPlayerDevice).toHaveBeenCalledWith();

            // Verify response sets fresh auth cookies
            expect(res.cookies.get(DEVICE_ID_COOKIE)?.value).toBe(freshDeviceId);
            expect(res.cookies.get(DEVICE_SECRET_COOKIE)?.value).toBe(freshDeviceSecret);
        });

        it('should handle reprovisioning failure gracefully: return 500 error and purge dead cookies', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const fatalError = new Error('Provisioning crypto failure');
            vi.mocked(provisionNewPlayerDevice).mockRejectedValueOnce(fatalError);

            const req = new NextRequest('http://localhost/api/device/unlink', {
                method: 'POST',
                headers: { cookie: `${DEVICE_ID_COOKIE}=${MOCK_EXISTING_DEVICE_ID}` },
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'unlinked but reprovision failed, reload the page' });

            expect(consoleSpy).toHaveBeenCalledWith('[device/unlink] reprovision failed:', fatalError);

            // Verify that broken cookies are explicitly deleted to prevent infinite 401 loops
            const deviceIdCookieHeader = res.cookies.get(DEVICE_ID_COOKIE);
            const deviceSecretCookieHeader = res.cookies.get(DEVICE_SECRET_COOKIE);

            // Next.js Response Cookie deletion sets value to empty string or expires in past
            expect(deviceIdCookieHeader?.value === '' || deviceIdCookieHeader?.maxAge === 0).toBe(true);
            expect(deviceSecretCookieHeader?.value === '' || deviceSecretCookieHeader?.maxAge === 0).toBe(true);

            consoleSpy.mockRestore();
        });
    });
});