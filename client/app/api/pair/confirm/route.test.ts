// app/api/pair/confirm/route.test.ts
// pnpm --prefix client test app/api/pair/confirm/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import {
    resolvePlayerFromCookie,
    DEVICE_SECRET_COOKIE,
} from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { generateDeviceSecret, hashDeviceSecret } from '@/src/lib/auth/hmac';
import { parseUserAgent } from '@/src/lib/auth/parseUserAgent';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ MOCK BUILDERS FOR CHAINED SUPABASE QUERY & RPC ────────────────────────
const mockMaybeSingleFn = vi.fn();
const mockEqFn = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFn });
const mockSelectFn = vi.fn().mockReturnValue({ eq: mockEqFn });
const mockFromFn = vi.fn().mockReturnValue({ select: mockSelectFn });
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
        from: vi.fn((...args) => mockFromFn(...args)),
        rpc: vi.fn((...args) => mockRpcFn(...args)),
    },
}));

vi.mock('@/src/lib/auth/resolvePlayer', () => ({
    resolvePlayerFromCookie: vi.fn(),
    DEVICE_ID_COOKIE: 'bleachdle_device_id',
    DEVICE_SECRET_COOKIE: 'bleachdle_device_secret',
    COOKIE_OPTS: { httpOnly: true, sameSite: 'lax', path: '/' },
}));

vi.mock('@/src/lib/auth/hmac', () => ({
    generateDeviceSecret: vi.fn(),
    hashDeviceSecret: vi.fn(),
}));

vi.mock('@/src/lib/auth/parseUserAgent', () => ({
    parseUserAgent: vi.fn(),
}));

vi.mock('@/src/lib/rateLimit', () => ({
    edgeRateLimit: vi.fn(),
    getRateLimitKey: vi.fn(),
}));

vi.mock('@/src/lib/auth/verifySameOrigin', () => ({
    verifySameOrigin: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Pairing Confirmation API Endpoint Suite (POST /api/pair/confirm)', () => {
    const MOCK_PLAYER_A_ID = 'player-a-uuid-1111';
    const MOCK_PLAYER_B_ID = 'player-b-uuid-2222';
    const MOCK_DEVICE_B_ID = 'device-b-uuid-9999';
    const MOCK_RAW_SECRET = 'mock-generated-secret-xyz123';
    const MOCK_SECRET_HASH = 'mock-hashed-secret-abc567';
    const MOCK_USER_AGENT_LABEL = 'Chrome 128 on macOS';
    const VALID_PAIRING_CODE = '123456';

    const MOCK_FUTURE_EXPIRATION = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const MOCK_PAST_EXPIRATION = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Behaviors
        vi.mocked(verifySameOrigin).mockReturnValue(true);
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-pair-confirm');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_B_ID);
        vi.mocked(generateDeviceSecret).mockReturnValue(MOCK_RAW_SECRET);
        vi.mocked(hashDeviceSecret).mockReturnValue(MOCK_SECRET_HASH);
        vi.mocked(parseUserAgent).mockReturnValue(MOCK_USER_AGENT_LABEL);

        // Supabase Default Code Lookup
        mockMaybeSingleFn.mockResolvedValue({
            data: {
                player_id: MOCK_PLAYER_A_ID,
                consumed_at: null,
                expires_at: MOCK_FUTURE_EXPIRATION,
                attempt_count: 0,
                max_attempts: 5,
            },
            error: null,
        });

        // Supabase Default RPC Responses
        mockRpcFn.mockImplementation((rpcName: string) => {
            if (rpcName === 'carry_over_pairing_data') return Promise.resolve({ error: null });
            if (rpcName === 'confirm_pairing') return Promise.resolve({ data: MOCK_PLAYER_A_ID, error: null });
            return Promise.resolve({ data: null, error: null });
        });
    });

    // ==========================================
    // 🛡️ SECURITY & RATE LIMITING GUARDS
    // ==========================================
    describe('Security & Edge Rate Limiting Guards', () => {
        it('should return 403 Forbidden when origin verification check fails', async () => {
            vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/pair/confirm', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'invalid origin' });
            expect(edgeRateLimit).not.toHaveBeenCalled();
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 429 Rate Limited when edge rate limit (5 req / 60s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/pair/confirm', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-pair-confirm', 5, 60000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔑 AUTHENTICATION & COOKIE GUARDS
    // ==========================================
    describe('Authentication & Cookie Guards', () => {
        it('should return 401 Unauthenticated if player B cookie cannot be resolved', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = new NextRequest('http://localhost/api/pair/confirm', {
                method: 'POST',
                headers: { cookie: `${DEVICE_ID_COOKIE}=${MOCK_DEVICE_B_ID}` },
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if DEVICE_ID_COOKIE is missing from request', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(MOCK_PLAYER_B_ID);

            const req = new NextRequest('http://localhost/api/pair/confirm', { method: 'POST' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 📋 ZOD SCHEMA PAYLOAD VALIDATION
    // ==========================================
    describe('Payload Validation (Zod Schema)', () => {
        const buildAuthReq = (body: unknown) =>
            new NextRequest('http://localhost/api/pair/confirm', {
                method: 'POST',
                headers: {
                    cookie: `${DEVICE_ID_COOKIE}=${MOCK_DEVICE_B_ID}`,
                    'content-type': 'application/json',
                },
                body: JSON.stringify(body),
            });

        it('should return 400 when body is invalid JSON or empty', async () => {
            const req = new NextRequest('http://localhost/api/pair/confirm', {
                method: 'POST',
                headers: { cookie: `${DEVICE_ID_COOKIE}=${MOCK_DEVICE_B_ID}` },
                body: 'invalid-json',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error).toBeDefined();
        });

        it('should return 400 when pairing code is not exactly 6 digits', async () => {
            const req = buildAuthReq({
                code: '12345', // Only 5 digits
                keepChoices: [],
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.code).toBeDefined();
        });

        it('should return 400 when keepChoices contains invalid enum values', async () => {
            const req = buildAuthReq({
                code: '123456',
                keepChoices: [
                    { gameMode: 'classic', gameType: 'invalid_type', keep: 'A' },
                    { gameMode: 'classic', gameType: 'daily', keep: 'C' },
                ],
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.keepChoices).toBeDefined();
        });
    });

    // ==========================================
    // ⏳ PAIRING CODE VALIDATION & LIFECYCLE
    // ==========================================
    describe('Pairing Code Validation & Lifecycle', () => {
        const createValidReq = () =>
            new NextRequest('http://localhost/api/pair/confirm', {
                method: 'POST',
                headers: {
                    cookie: `${DEVICE_ID_COOKIE}=${MOCK_DEVICE_B_ID}`,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({ code: VALID_PAIRING_CODE, keepChoices: [] }),
            });

        it('should return 400 when pairing code does not exist or DB error occurs', async () => {
            mockMaybeSingleFn.mockResolvedValueOnce({ data: null, error: createDbFailure('Not found').error });

            const res = await POST(createValidReq());
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'invalid or expired code' });
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 when pairing code has already been consumed', async () => {
            mockMaybeSingleFn.mockResolvedValueOnce({
                data: {
                    player_id: MOCK_PLAYER_A_ID,
                    consumed_at: new Date().toISOString(),
                    expires_at: MOCK_FUTURE_EXPIRATION,
                    attempt_count: 0,
                    max_attempts: 5,
                },
                error: null,
            });

            const res = await POST(createValidReq());
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'invalid or expired code' });
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 when pairing code is expired', async () => {
            mockMaybeSingleFn.mockResolvedValueOnce({
                data: {
                    player_id: MOCK_PLAYER_A_ID,
                    consumed_at: null,
                    expires_at: MOCK_PAST_EXPIRATION,
                    attempt_count: 0,
                    max_attempts: 5,
                },
                error: null,
            });

            const res = await POST(createValidReq());
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'invalid or expired code' });
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 when code is locked due to maximum attempt count exceeded', async () => {
            mockMaybeSingleFn.mockResolvedValueOnce({
                data: {
                    player_id: MOCK_PLAYER_A_ID,
                    consumed_at: null,
                    expires_at: MOCK_FUTURE_EXPIRATION,
                    attempt_count: 5,
                    max_attempts: 5,
                },
                error: null,
            });

            const res = await POST(createValidReq());
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'code locked after too many attempts' });
            expect(mockRpcFn).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 🔄 RPC CARRY-OVER & CONFIRMATION PAIRING
    // ==========================================
    describe('RPC Data Carry-Over & Confirmation Execution', () => {
        const createValidPayloadReq = () =>
            new NextRequest('http://localhost/api/pair/confirm', {
                method: 'POST',
                headers: {
                    cookie: `${DEVICE_ID_COOKIE}=${MOCK_DEVICE_B_ID}`,
                    'user-agent': MOCK_USER_AGENT_LABEL,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    code: VALID_PAIRING_CODE,
                    keepChoices: [
                        { gameMode: 'classic', gameType: 'daily', keep: 'B' },
                        { gameMode: 'quote', gameType: 'unlimited', keep: 'A' },
                        { gameMode: 'ability', gameType: 'daily', keep: 'B' },
                    ],
                }),
            });

        it('should return 500 when carry_over_pairing_data RPC execution fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockImplementationOnce((rpcName) => {
                if (rpcName === 'carry_over_pairing_data') {
                    return Promise.resolve(createDbFailure('RPC execution failed'));
                }
                return Promise.resolve({ data: null, error: null });
            });

            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(mockRpcFn).toHaveBeenCalledWith('carry_over_pairing_data', {
                p_player_a_id: MOCK_PLAYER_A_ID,
                p_player_b_id: MOCK_PLAYER_B_ID,
                p_keep_b_modes: [
                    { gameMode: 'classic', gameType: 'daily' },
                    { gameMode: 'ability', gameType: 'daily' },
                ],
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[pair/confirm] carry-over failed:',
                expect.objectContaining({ message: 'RPC execution failed' })
            );

            consoleSpy.mockRestore();
        });

        it('should return 409 Conflict when confirm_pairing RPC execution fails or returns null ID', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockImplementation((rpcName) => {
                if (rpcName === 'carry_over_pairing_data') return Promise.resolve({ error: null });
                if (rpcName === 'confirm_pairing') return Promise.resolve({ data: null, error: null });
                return Promise.resolve({ data: null, error: null });
            });

            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(409);
            expect(body).toEqual({ error: 'pairing failed, please try again' });

            expect(consoleSpy).toHaveBeenCalledWith('[pair/confirm] link failed:', null);
            consoleSpy.mockRestore();
        });

        it('should execute full carry-over, confirm pairing, set new secret cookie, and hide player_id (Happy Path)', async () => {
            const res = await POST(createValidPayloadReq());
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ status: 'linked' });
            // Strict check: player_id must NEVER leak to the client response body
            expect(body.playerId).toBeUndefined();
            expect(body.player_id).toBeUndefined();

            // 1. Verify carry_over_pairing_data RPC payload (Only 'B' keep choices must be filtered)
            expect(mockRpcFn).toHaveBeenNthCalledWith(1, 'carry_over_pairing_data', {
                p_player_a_id: MOCK_PLAYER_A_ID,
                p_player_b_id: MOCK_PLAYER_B_ID,
                p_keep_b_modes: [
                    { gameMode: 'classic', gameType: 'daily' },
                    { gameMode: 'ability', gameType: 'daily' },
                ],
            });

            // 2. Verify crypto secret generation & hashing
            expect(generateDeviceSecret).toHaveBeenCalled();
            expect(hashDeviceSecret).toHaveBeenCalledWith(MOCK_RAW_SECRET);
            expect(parseUserAgent).toHaveBeenCalled();

            // 3. Verify confirm_pairing RPC payload
            expect(mockRpcFn).toHaveBeenNthCalledWith(2, 'confirm_pairing', {
                p_code: VALID_PAIRING_CODE,
                p_device_b_id: MOCK_DEVICE_B_ID,
                p_device_b_secret_hash: MOCK_SECRET_HASH,
                p_device_b_label: MOCK_USER_AGENT_LABEL,
            });

            // 4. Verify auth cookie update
            const secretCookie = res.cookies.get(DEVICE_SECRET_COOKIE);
            expect(secretCookie?.value).toBe(MOCK_RAW_SECRET);
        });
    });
});