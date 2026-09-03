// app/api/pair/devices/route.test.ts
// pnpm --prefix client test app/api/pair/devices/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, DELETE } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { DEVICE_ID_COOKIE } from '@/src/const/auth';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ MOCK BUILDERS FOR CHAINED SUPABASE QUERIES ────────────────────────────
// GET Chain: from().select().eq().order()
const mockOrderFn = vi.fn();
const mockSelectEqFn = vi.fn().mockReturnValue({ order: mockOrderFn });
const mockSelectFn = vi.fn().mockReturnValue({ eq: mockSelectEqFn });

// DELETE Chain: from().delete().eq().eq()
const mockDeleteEqPlayerFn = vi.fn();
const mockDeleteEqDeviceFn = vi.fn().mockReturnValue({ eq: mockDeleteEqPlayerFn });
const mockDeleteFn = vi.fn().mockReturnValue({ eq: mockDeleteEqDeviceFn });

const mockFromFn = vi.fn().mockReturnValue({
    select: mockSelectFn,
    delete: mockDeleteFn,
});

class MockPostgrestError extends Error {
    details = 'Database execution failed internally.';
    hint = 'Check database schema and constraints.';
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
    },
}));

vi.mock('@/src/lib/auth/resolvePlayer', () => ({
    resolvePlayerFromCookie: vi.fn(),
    DEVICE_ID_COOKIE: 'bleachdle_device_id',
}));

vi.mock('@/src/lib/rateLimit', () => ({
    edgeRateLimit: vi.fn(),
    getRateLimitKey: vi.fn(),
}));

vi.mock('@/src/lib/auth/verifySameOrigin', () => ({
    verifySameOrigin: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Pair Devices API Endpoint Suite (/api/pair/devices)', () => {
    const MOCK_PLAYER_ID = 'player-uuid-1111';
    const MOCK_CURRENT_DEVICE_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
    const MOCK_OTHER_DEVICE_ID = '550e8400-e29b-41d4-a716-446655440000';

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Implementations
        vi.mocked(verifySameOrigin).mockReturnValue(true);
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-pair-devices');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
    });

    // ==========================================================================
    // 📖 GET METHOD (List Devices)
    // ==========================================================================
    describe('GET /api/pair/devices (List Devices)', () => {
        it('should return 429 Rate Limited when GET rate limit (20 req / 10s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/pair/devices', { method: 'GET' });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-pair-devices', 20, 10000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if player cookie cannot be resolved', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = new NextRequest('http://localhost/api/pair/devices', { method: 'GET' });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 500 internal error and log console error when database query fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockOrderFn.mockResolvedValueOnce(createDbFailure('Table query failed'));

            const req = new NextRequest('http://localhost/api/pair/devices', { method: 'GET' });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[pair/devices GET] query failed:',
                expect.objectContaining({ message: 'Table query failed' })
            );

            consoleSpy.mockRestore();
        });

        it('should query devices for the current player, order by last_seen_at DESC, and calculate isCurrentDevice correctly', async () => {
            const rawDbDevices = [
                {
                    device_id: MOCK_CURRENT_DEVICE_ID,
                    device_label: 'Chrome · macOS',
                    linked_at: '2026-01-01T00:00:00.000Z',
                    last_seen_at: '2026-08-16T00:00:00.000Z',
                },
                {
                    device_id: MOCK_OTHER_DEVICE_ID,
                    device_label: 'Safari · iPhone',
                    linked_at: '2026-02-01T00:00:00.000Z',
                    last_seen_at: '2026-08-10T00:00:00.000Z',
                },
            ];

            mockOrderFn.mockResolvedValueOnce({ data: rawDbDevices, error: null });

            const req = new NextRequest('http://localhost/api/pair/devices', {
                method: 'GET',
                headers: { cookie: `${DEVICE_ID_COOKIE}=${MOCK_CURRENT_DEVICE_ID}` },
            });

            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(mockFromFn).toHaveBeenCalledWith('player_devices');
            expect(mockSelectFn).toHaveBeenCalledWith('device_id, device_label, linked_at, last_seen_at');
            expect(mockSelectEqFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
            expect(mockOrderFn).toHaveBeenCalledWith('last_seen_at', { ascending: false });

            // Assert mapping of isCurrentDevice flag
            expect(body.devices).toEqual([
                {
                    device_id: MOCK_CURRENT_DEVICE_ID,
                    device_label: 'Chrome · macOS',
                    linked_at: '2026-01-01T00:00:00.000Z',
                    last_seen_at: '2026-08-16T00:00:00.000Z',
                    isCurrentDevice: true,
                },
                {
                    device_id: MOCK_OTHER_DEVICE_ID,
                    device_label: 'Safari · iPhone',
                    linked_at: '2026-02-01T00:00:00.000Z',
                    last_seen_at: '2026-08-10T00:00:00.000Z',
                    isCurrentDevice: false,
                },
            ]);
        });

        it('should handle missing device_id cookie gracefully and set isCurrentDevice to false for all items', async () => {
            const rawDbDevices = [
                {
                    device_id: MOCK_OTHER_DEVICE_ID,
                    device_label: 'Safari · iPhone',
                    linked_at: '2026-02-01T00:00:00.000Z',
                    last_seen_at: '2026-08-10T00:00:00.000Z',
                },
            ];

            mockOrderFn.mockResolvedValueOnce({ data: rawDbDevices, error: null });

            // Request without DEVICE_ID_COOKIE
            const req = new NextRequest('http://localhost/api/pair/devices', { method: 'GET' });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.devices[0].isCurrentDevice).toBe(false);
        });

        it('should return empty devices array when DB returns null data', async () => {
            mockOrderFn.mockResolvedValueOnce({ data: null, error: null });

            const req = new NextRequest('http://localhost/api/pair/devices', { method: 'GET' });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ devices: [] });
        });
    });

    // ==========================================================================
    // 🗑️ DELETE METHOD (Remove Other Device)
    // ==========================================================================
    describe('DELETE /api/pair/devices (Remove Device)', () => {
        const createDeleteReq = (body: unknown, deviceCookie = MOCK_CURRENT_DEVICE_ID) =>
            new NextRequest('http://localhost/api/pair/devices', {
                method: 'DELETE',
                headers: {
                    cookie: `${DEVICE_ID_COOKIE}=${deviceCookie}`,
                    'content-type': 'application/json',
                },
                body: JSON.stringify(body),
            });

        it('should return 403 Forbidden when origin verification check fails', async () => {
            vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

            const req = createDeleteReq({ deviceId: MOCK_OTHER_DEVICE_ID });
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'invalid origin' });
            expect(edgeRateLimit).not.toHaveBeenCalled();
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 429 Rate Limited when DELETE rate limit (10 req / 60s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const req = createDeleteReq({ deviceId: MOCK_OTHER_DEVICE_ID });
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-pair-devices', 10, 60000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if resolvePlayerFromCookie returns null', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const req = createDeleteReq({ deviceId: MOCK_OTHER_DEVICE_ID });
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when JSON body is invalid or deviceId is not a valid UUID', async () => {
            const req = createDeleteReq({ deviceId: 'not-a-valid-uuid' });
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.deviceId).toBeDefined();
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when attempting to delete the device making the request (Self-Deletion Guard)', async () => {
            // Attempting to delete MOCK_CURRENT_DEVICE_ID which matches the cookie
            const req = createDeleteReq({ deviceId: MOCK_CURRENT_DEVICE_ID });
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({
                error: 'cannot remove the device you are currently using — use device/unlink instead',
            });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 500 internal error and log console error when database delete query fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockDeleteEqPlayerFn.mockResolvedValueOnce(createDbFailure('Deadlock error'));

            const req = createDeleteReq({ deviceId: MOCK_OTHER_DEVICE_ID });
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[pair/devices DELETE] delete failed:',
                expect.objectContaining({ message: 'Deadlock error' })
            );

            consoleSpy.mockRestore();
        });

        it('should return 404 Not Found when count is 0 (device does not belong to player or does not exist)', async () => {
            mockDeleteEqPlayerFn.mockResolvedValueOnce({ error: null, count: 0 });

            const req = createDeleteReq({ deviceId: MOCK_OTHER_DEVICE_ID });
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(404);
            expect(body).toEqual({ error: 'device not found on this account' });

            expect(mockFromFn).toHaveBeenCalledWith('player_devices');
            expect(mockDeleteFn).toHaveBeenCalledWith({ count: 'exact' });
            expect(mockDeleteEqDeviceFn).toHaveBeenCalledWith('device_id', MOCK_OTHER_DEVICE_ID);
            expect(mockDeleteEqPlayerFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
        });

        it('should successfully delete target device and return status removed (Happy Path)', async () => {
            mockDeleteEqPlayerFn.mockResolvedValueOnce({ error: null, count: 1 });

            const req = createDeleteReq({ deviceId: MOCK_OTHER_DEVICE_ID });
            const res = await DELETE(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ status: 'removed' });

            expect(mockFromFn).toHaveBeenCalledWith('player_devices');
            expect(mockDeleteFn).toHaveBeenCalledWith({ count: 'exact' });
            expect(mockDeleteEqDeviceFn).toHaveBeenCalledWith('device_id', MOCK_OTHER_DEVICE_ID);
            expect(mockDeleteEqPlayerFn).toHaveBeenCalledWith('player_id', MOCK_PLAYER_ID);
        });
    });
});