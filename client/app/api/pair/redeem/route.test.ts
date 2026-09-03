// app/api/pair/redeem/route.test.ts
// pnpm --prefix client test app/api/pair/redeem/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { verifyTurnstileToken } from '@/src/lib/turnstile/verifyTurnstileToken';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import { edgeRateLimit, getClientIp, getRateLimitKey } from '@/src/lib/rateLimit';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ MOCK BUILDERS FOR DB TABLE QUERIES & RPC ──────────────────────────────
const mockRpcFn = vi.fn();
const mockPlayerStatsEqFn = vi.fn();
const mockPairingCodesMaybeSingleFn = vi.fn();
const mockPlayerDevicesMaybeSingleFn = vi.fn();

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

// Dynamic Mock Router for Supabase `from()` queries
const mockFromFn = vi.fn((table: string) => {
    if (table === 'player_stats') {
        return {
            select: vi.fn().mockReturnValue({
                eq: vi.fn((field, val) => mockPlayerStatsEqFn(field, val)),
            }),
        };
    }
    if (table === 'pairing_codes') {
        return {
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: mockPairingCodesMaybeSingleFn,
                }),
            }),
        };
    }
    if (table === 'player_devices') {
        return {
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: mockPlayerDevicesMaybeSingleFn,
                }),
            }),
        };
    }
    return {};
});

// ─── 🚀 MODULE MOCKS ──────────────────────────────────────────────────────────
vi.mock('@/src/lib/supabase/supabase-server', () => ({
    supabaseServer: {
        rpc: vi.fn((...args) => mockRpcFn(...args)),
        from: vi.fn((table: string) => mockFromFn(table)),
    },
}));

vi.mock('@/src/lib/auth/resolvePlayer', () => ({
    resolvePlayerFromCookie: vi.fn(),
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
describe('Pairing Code Redeem API Endpoint Suite (POST /api/pair/redeem)', () => {
    const MOCK_PLAYER_A_ID = 'player-a-uuid-1111';
    const MOCK_PLAYER_B_ID = 'player-b-uuid-2222';
    const MOCK_DEVICE_A_ID = 'device-a-uuid-9999';
    const MOCK_CLIENT_IP = '203.0.113.50';
    const MOCK_TURNSTILE_TOKEN = 'mock-valid-turnstile-token-xyz';
    const VALID_PAIRING_CODE = '654321';

    const MOCK_STATS_A = [{ game_mode: 'classic', wins: 10, total_played: 15 }];
    const MOCK_STATS_B = [{ game_mode: 'ability', wins: 5, total_played: 8 }];

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Security & Auth Implementations
        vi.mocked(verifySameOrigin).mockReturnValue(true);
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-pair-redeem');
        vi.mocked(getClientIp).mockReturnValue(MOCK_CLIENT_IP);
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_B_ID);
        vi.mocked(verifyTurnstileToken).mockResolvedValue(true);

        // RPC Check Pairing Code Default Success
        mockRpcFn.mockResolvedValue({ data: MOCK_PLAYER_A_ID, error: null });

        // Default DB Table Mock Implementations
        mockPlayerStatsEqFn.mockImplementation((field, playerId) => {
            if (playerId === MOCK_PLAYER_A_ID) return Promise.resolve({ data: MOCK_STATS_A, error: null });
            if (playerId === MOCK_PLAYER_B_ID) return Promise.resolve({ data: MOCK_STATS_B, error: null });
            return Promise.resolve({ data: [], error: null });
        });

        mockPairingCodesMaybeSingleFn.mockResolvedValue({
            data: { created_by_device_id: MOCK_DEVICE_A_ID },
            error: null,
        });

        mockPlayerDevicesMaybeSingleFn.mockResolvedValue({
            data: { device_label: 'Chrome · Windows' },
            error: null,
        });
    });

    const createValidReq = (body: unknown) =>
        new NextRequest('http://localhost/api/pair/redeem', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });

    // ==========================================
    // 🛡️ SECURITY & EDGE RATE LIMITING
    // ==========================================
    describe('Security & Edge Rate Limiting Guards', () => {
        it('should return 403 Forbidden when origin verification check fails', async () => {
            vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/pair/redeem', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'invalid origin' });
            expect(edgeRateLimit).not.toHaveBeenCalled();
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 429 Rate Limited when edge rate limit capacity (8 req / 60s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/pair/redeem', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-pair-redeem', 8, 60000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔑 AUTHENTICATION & COOKIE GUARDS
    // ==========================================
    describe('Authentication & Identity Guards', () => {
        it('should return 401 Unauthenticated if resolvePlayerFromCookie returns null', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = createValidReq({
                code: VALID_PAIRING_CODE,
                turnstileToken: MOCK_TURNSTILE_TOKEN,
            });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 📋 PAYLOAD VALIDATION & TURNSTILE GUARDS
    // ==========================================
    describe('Payload Validation & Turnstile Challenge', () => {
        it('should return 400 when request body is invalid JSON or empty', async () => {
            const req = new NextRequest('http://localhost/api/pair/redeem', {
                method: 'POST',
                body: 'invalid-json-body',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error).toBeDefined();
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('should return 400 when code is not exactly 6 numeric digits', async () => {
            const req = createValidReq({
                code: '12345', // Only 5 digits
                turnstileToken: MOCK_TURNSTILE_TOKEN,
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.code).toBeDefined();
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('should return 400 when turnstileToken is empty string', async () => {
            const req = createValidReq({
                code: VALID_PAIRING_CODE,
                turnstileToken: '',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.turnstileToken).toBeDefined();
            expect(verifyTurnstileToken).not.toHaveBeenCalled();
        });

        it('should return 403 Forbidden when verifyTurnstileToken validation fails', async () => {
            vi.mocked(verifyTurnstileToken).mockResolvedValueOnce(false);

            const req = createValidReq({
                code: VALID_PAIRING_CODE,
                turnstileToken: 'invalid-turnstile-token',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'verification failed' });
            expect(getClientIp).toHaveBeenCalledWith(req);
            expect(verifyTurnstileToken).toHaveBeenCalledWith('invalid-turnstile-token', MOCK_CLIENT_IP);
            expect(mockRpcFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // ⏳ RPC CODE CHECK & SELF-PAIRING GUARDS
    // ==========================================
    describe('Pairing Code Check & Self-Pairing Guard', () => {
        const createValidPayloadReq = () =>
            createValidReq({
                code: VALID_PAIRING_CODE,
                turnstileToken: MOCK_TURNSTILE_TOKEN,
            });

        it('should return 500 internal error and log console error when check_pairing_code RPC fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockRpcFn.mockResolvedValueOnce(createDbFailure('Database statement timeout'));

            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[pair/redeem] rpc failed:',
                expect.objectContaining({ message: 'Database statement timeout' })
            );

            consoleSpy.mockRestore();
        });

        it('should return 400 when check_pairing_code RPC returns null (code invalid or expired)', async () => {
            mockRpcFn.mockResolvedValueOnce({ data: null, error: null });

            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'invalid or expired code' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when player attempts to pair a device with itself (playerAId === playerBId)', async () => {
            // Mock RPC returning playerAId equal to the current user (playerBId)
            mockRpcFn.mockResolvedValueOnce({ data: MOCK_PLAYER_B_ID, error: null });

            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'cannot pair a device with itself' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔄 STATS & DEVICE METADATA RETRIEVAL
    // ==========================================
    describe('Stats & Device Metadata Retrieval (Happy Path & Fallbacks)', () => {
        const createValidPayloadReq = () =>
            createValidReq({
                code: VALID_PAIRING_CODE,
                turnstileToken: MOCK_TURNSTILE_TOKEN,
            });

        it('should fetch stats and device label, returning full pairing preview payload (Happy Path)', async () => {
            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({
                valid: true,
                code: VALID_PAIRING_CODE,
                deviceA: {
                    stats: MOCK_STATS_A,
                    deviceLabel: 'Chrome · Windows',
                },
                deviceB: {
                    stats: MOCK_STATS_B,
                },
            });

            // Verify RPC call
            expect(mockRpcFn).toHaveBeenCalledWith('check_pairing_code', { p_code: VALID_PAIRING_CODE });

            // Verify DB Queries were performed for both players and pairing code
            expect(mockFromFn).toHaveBeenCalledWith('player_stats');
            expect(mockFromFn).toHaveBeenCalledWith('pairing_codes');
            expect(mockFromFn).toHaveBeenCalledWith('player_devices');
        });

        it('should fallback deviceLabel to null when codeRow has no created_by_device_id', async () => {
            mockPairingCodesMaybeSingleFn.mockResolvedValueOnce({
                data: { created_by_device_id: null },
                error: null,
            });

            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.deviceA.deviceLabel).toBeNull();
            // Should not query player_devices table if created_by_device_id is missing
            expect(mockFromFn).not.toHaveBeenCalledWith('player_devices');
        });

        it('should fallback deviceLabel to null when device row is not found in player_devices', async () => {
            mockPlayerDevicesMaybeSingleFn.mockResolvedValueOnce({
                data: null,
                error: null,
            });

            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.deviceA.deviceLabel).toBeNull();
        });

        it('should fallback stats to empty arrays [] when DB returns null stats', async () => {
            mockPlayerStatsEqFn.mockResolvedValue({ data: null, error: null });

            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.deviceA.stats).toEqual([]);
            expect(body.deviceB.stats).toEqual([]);
        });
    });
});