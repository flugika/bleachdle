// app/api/sync/soul-name/route.test.ts
// pnpm --prefix client test app/api/sync/soul-name/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { resolvePlayerFromCookie } from '@/src/lib/auth/resolvePlayer';
import { edgeRateLimit, getRateLimitKey } from '@/src/lib/rateLimit';
import { verifySameOrigin } from '@/src/lib/auth/verifySameOrigin';
import { filterSoulName } from '@/src/lib/moderation/filterSoulName';
import type { PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ HOISTED MOCKS & HELPERS ──────────────────────────────────────────────
const { mockRpcFn, mockMaybeSingleFn, mockEqFn, mockSelectFn, mockFromFn } = vi.hoisted(() => {
    const mockRpcFn = vi.fn();
    const mockMaybeSingleFn = vi.fn();
    const mockEqFn = vi.fn(() => ({ maybeSingle: mockMaybeSingleFn }));
    const mockSelectFn = vi.fn(() => ({ eq: mockEqFn }));
    const mockFromFn = vi.fn(() => ({ select: mockSelectFn }));

    return {
        mockRpcFn,
        mockMaybeSingleFn,
        mockEqFn,
        mockSelectFn,
        mockFromFn,
    };
});

class MockPostgrestError extends Error {
    details = 'Database operation failed';
    hint = 'Check database constraints or table schema';
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
        from: mockFromFn,
        rpc: mockRpcFn,
    },
}));

vi.mock('@/src/lib/auth/resolvePlayer', () => ({
    resolvePlayerFromCookie: vi.fn(),
}));

vi.mock('@/src/lib/rateLimit', () => ({
    edgeRateLimit: vi.fn(),
    getRateLimitKey: vi.fn(),
}));

vi.mock('@/src/lib/auth/verifySameOrigin', () => ({
    verifySameOrigin: vi.fn(),
}));

vi.mock('@/src/lib/moderation/filterSoulName', () => ({
    filterSoulName: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Soul Name API Suite (GET & POST /api/sync/soul-name)', () => {
    const MOCK_PLAYER_ID = 'player-uuid-soul-7777';
    const VALID_SOUL_NAME = 'Ichigo Kurosaki';

    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Implementations
        vi.mocked(verifySameOrigin).mockReturnValue(true);
        vi.mocked(edgeRateLimit).mockReturnValue(true);
        vi.mocked(getRateLimitKey).mockReturnValue('rate-key-soul-name');
        vi.mocked(resolvePlayerFromCookie).mockResolvedValue(MOCK_PLAYER_ID);
        vi.mocked(filterSoulName).mockImplementation((name: string) => ({
            ok: true,
            cleaned: name.trim(),
        }));
    });

    const createGetReq = () =>
        new NextRequest('http://localhost/api/sync/soul-name', {
            method: 'GET',
        });

    const createPostReq = (body: unknown) =>
        new NextRequest('http://localhost/api/sync/soul-name', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });

    // ==========================================
    // 📥 GET /api/sync/soul-name SUITE
    // ==========================================
    describe('GET /api/sync/soul-name', () => {
        it('should return 429 Rate Limited when GET rate limit capacity (20 req / 10s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const res = await GET(createGetReq());
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-soul-name', 20, 10000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if player cookie resolution fails', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const res = await GET(createGetReq());
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockFromFn).not.toHaveBeenCalled();
        });

        it('should return 500 internal error and log console error when Supabase select query fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockMaybeSingleFn.mockResolvedValueOnce(createDbFailure('Connection timeout'));

            const res = await GET(createGetReq());
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });
            expect(consoleSpy).toHaveBeenCalledWith(
                '[sync/soul-name GET] query failed:',
                expect.objectContaining({ message: 'Connection timeout' })
            );

            consoleSpy.mockRestore();
        });

        it('should return 200 OK with existing soulName when player has registered a name', async () => {
            mockMaybeSingleFn.mockResolvedValueOnce({
                data: { soul_name: 'Zangetsu' },
                error: null,
            });

            const res = await GET(createGetReq());
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ soulName: 'Zangetsu' });
            expect(mockFromFn).toHaveBeenCalledWith('players');
            expect(mockSelectFn).toHaveBeenCalledWith('soul_name');
            expect(mockEqFn).toHaveBeenCalledWith('id', MOCK_PLAYER_ID);
        });

        it('should return 200 OK with soulName: null when player does not have a registered name yet', async () => {
            mockMaybeSingleFn.mockResolvedValueOnce({
                data: null,
                error: null,
            });

            const res = await GET(createGetReq());
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ soulName: null });
        });
    });

    // ==========================================
    // 📤 POST /api/sync/soul-name SUITE
    // ==========================================
    describe('POST /api/sync/soul-name', () => {
        // ─── SECURITY & RATE LIMITING GUARDS ───
        it('should return 403 Forbidden when origin verification fails', async () => {
            vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

            const res = await POST(createPostReq({ soulName: VALID_SOUL_NAME }));
            const body = await res.json();

            expect(res.status).toBe(403);
            expect(body).toEqual({ error: 'invalid origin' });
            expect(edgeRateLimit).not.toHaveBeenCalled();
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 429 Rate Limited when POST rate limit capacity (10 req / 60s) is exceeded', async () => {
            vi.mocked(edgeRateLimit).mockReturnValueOnce(false);

            const res = await POST(createPostReq({ soulName: VALID_SOUL_NAME }));
            const body = await res.json();

            expect(res.status).toBe(429);
            expect(body).toEqual({ error: 'rate limited' });
            expect(edgeRateLimit).toHaveBeenCalledWith('rate-key-soul-name', 10, 60000);
            expect(resolvePlayerFromCookie).not.toHaveBeenCalled();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthenticated if player cookie resolution fails', async () => {
            vi.mocked(resolvePlayerFromCookie).mockResolvedValueOnce(null);

            const res = await POST(createPostReq({ soulName: VALID_SOUL_NAME }));
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthenticated' });
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        // ─── ZOD SCHEMA & PAYLOAD VALIDATION ───
        it('should return 400 Bad Request when JSON body is invalid or malformed', async () => {
            const req = new NextRequest('http://localhost/api/sync/soul-name', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: 'invalid-json-content',
            });

            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error).toBeDefined();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when soulName is empty or whitespace only', async () => {
            const req = createPostReq({ soulName: '   ' });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.soulName).toBeDefined();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request when soulName exceeds max length of 40 chars', async () => {
            const req = createPostReq({ soulName: 'a'.repeat(41) });
            const res = await POST(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error.fieldErrors.soulName).toBeDefined();
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        // ─── MODERATION FILTERING ───
        it('should return 400 Bad Request with custom reason when moderation filter rejects the soulName', async () => {
            vi.mocked(filterSoulName).mockReturnValueOnce({
                ok: false,
                cleaned: '',
                reason: 'contains inappropriate word',
            });

            const res = await POST(createPostReq({ soulName: 'InappropriateName' }));
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'contains inappropriate word' });
            expect(filterSoulName).toHaveBeenCalledWith('InappropriateName');
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request with fallback reason "invalid name" when moderation fails without explicit reason', async () => {
            vi.mocked(filterSoulName).mockReturnValueOnce({
                ok: false,
                cleaned: '',
                reason: 'invalid name',
            });

            const res = await POST(createPostReq({ soulName: 'BadName' }));
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ error: 'invalid name' });
            expect(mockRpcFn).not.toHaveBeenCalled();
        });

        // ─── DATABASE RPC FAILURE HANDLING ───
        it('should return 500 internal error and log console error when register_soul_name RPC fails', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockResolvedValueOnce(createDbFailure('Unique constraint violation'));

            const res = await POST(createPostReq({ soulName: VALID_SOUL_NAME }));
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ error: 'internal' });
            expect(consoleSpy).toHaveBeenCalledWith(
                '[sync/soul-name POST] rpc failed:',
                expect.objectContaining({ message: 'Unique constraint violation' })
            );

            consoleSpy.mockRestore();
        });

        // ─── HAPPY PATH ───
        it('should successfully filter name, call RPC, and return updated player & soulName payload', async () => {
            const mockCleanedName = 'Sanitized Soul Name';
            vi.mocked(filterSoulName).mockReturnValueOnce({
                ok: true,
                cleaned: mockCleanedName,
            });

            const mockDbPlayerData = {
                id: MOCK_PLAYER_ID,
                soul_name: mockCleanedName,
                updated_at: '2026-08-16T00:00:00Z',
            };

            mockRpcFn.mockResolvedValueOnce({
                data: mockDbPlayerData,
                error: null,
            });

            const res = await POST(createPostReq({ soulName: '  Sanitized Soul Name  ' }));
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({
                player: mockDbPlayerData,
                soulName: mockCleanedName,
            });

            expect(filterSoulName).toHaveBeenCalledWith('Sanitized Soul Name');
            expect(mockRpcFn).toHaveBeenCalledWith('register_soul_name', {
                p_player_id: MOCK_PLAYER_ID,
                p_soul_name: mockCleanedName,
            });
        });
    });
});