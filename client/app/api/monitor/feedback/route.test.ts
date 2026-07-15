// app/api/monitor/feedback/route.test.ts
// pnpm --prefix client test app/api/monitor/feedback/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { isAuthorizedForMonitor } from '@/src/features/admin/monitorAuth';
import { logApiEvent } from '@/src/services/monitor/logEvent';
import type { PostgrestSingleResponse, PostgrestError } from '@supabase/supabase-js';

// ─── 🛡️ ENTERPRISE TYPE-SAFE RPC RESPONSE BUILDERS ───────────────────────────
const mockRpcFn = vi.fn();

// ─── 🛡️ MOCK ERROR CLASS (BULLETPROOF AGAINST TYPE INFERENCE) ────────────────
class MockPostgrestError extends Error {
    details: string = 'Database execution failed internally.';
    hint: string = 'Check database schema and constraints.';
    code: string = 'P0001';

    constructor(message: string) {
        super(message);
        this.name = 'PostgrestError';
    }

    // Explicitly annotate return type to destroy TS7023 once and for all
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
    // 💡 ปลอดภัย 100% ผ่านทั้ง Type-level และ Runtime instanceof check
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
    },
}));

vi.mock('@/src/features/admin/monitorAuth', () => ({
    isAuthorizedForMonitor: vi.fn(),
}));

vi.mock('@/src/services/monitor/logEvent', () => ({
    logApiEvent: vi.fn(),
}));

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Feedback API Endpoint Monitor Suite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default permission setup: Granted
        vi.mocked(isAuthorizedForMonitor).mockReturnValue(true);
    });

    // ==========================================
    // 🔍 GET METHOD TESTING BLOCKS
    // ==========================================
    describe('GET /api/monitor/feedback', () => {
        it('should return 401 Unauthorized if authorization guard check fails', async () => {
            vi.mocked(isAuthorizedForMonitor).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/monitor/feedback');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ ok: false, error: 'Unauthorized.' });
            expect(supabaseServer.rpc).not.toHaveBeenCalled();
        });

        it('should fall back to standard default parameters when query strings are omitted', async () => {
            const mockDbPayload = { tickets: [{ id: '123', category: 'bug' }], count: 1 };
            mockRpcFn.mockResolvedValueOnce(createRpcSuccess(mockDbPayload));

            const req = new NextRequest('http://localhost/api/monitor/feedback');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ ok: true, ...mockDbPayload });
            expect(mockRpcFn).toHaveBeenCalledWith('get_support_tickets', {
                p_status: null,
                p_category: null,
                p_limit: 50,
                p_offset: 0,
            });
        });

        it('should properly capture and pass valid custom criteria filters to RPC', async () => {
            mockRpcFn.mockResolvedValueOnce(createRpcSuccess({ tickets: [] }));

            const url = 'http://localhost/api/monitor/feedback?status=seen&category=feedback&limit=10&offset=20';
            const req = new NextRequest(url);
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.ok).toBe(true);
            expect(mockRpcFn).toHaveBeenCalledWith('get_support_tickets', {
                p_status: 'seen',
                p_category: 'feedback',
                p_limit: 10,
                p_offset: 20,
            });
        });

        it('should reset compromised or non-whitelisted enum arrays to null fallback states safely', async () => {
            mockRpcFn.mockResolvedValueOnce(createRpcSuccess({ tickets: [] }));

            // passing invalid enum items for status and category
            const url = 'http://localhost/api/monitor/feedback?status=malicious_drop&category=invalid_cat';
            const req = new NextRequest(url);
            await GET(req);

            expect(mockRpcFn).toHaveBeenCalledWith('get_support_tickets', {
                p_status: null,
                p_category: null,
                p_limit: 50,
                p_offset: 0,
            });
        });

        it('should fire 500 Internal Failure response and log events when RPC returns a DB layer error', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockResolvedValueOnce(createRpcFailure('Database connection lost'));

            const req = new NextRequest('http://localhost/api/monitor/feedback');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ ok: false, error: 'Server error.' });
            expect(consoleSpy).toHaveBeenCalled();
            expect(logApiEvent).toHaveBeenCalledWith('monitor.feedback', 'error', 500, 'Database connection lost');

            consoleSpy.mockRestore();
        });
    });

    // ==========================================
    // 🛠️ PATCH METHOD TESTING BLOCKS
    // ==========================================
    describe('PATCH /api/monitor/feedback', () => {
        it('should return 401 Unauthorized if authorization guard check fails', async () => {
            vi.mocked(isAuthorizedForMonitor).mockReturnValueOnce(false);

            const req = new NextRequest('http://localhost/api/monitor/feedback', { method: 'PATCH' });
            const res = await PATCH(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ ok: false, error: 'Unauthorized.' });
        });

        it('should return 400 Bad Request if the body content contains corrupted or invalid JSON', async () => {
            const req = new NextRequest('http://localhost/api/monitor/feedback', {
                method: 'PATCH',
                body: '{ unclosed-broken-json ',
            });
            const res = await PATCH(req);
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body).toEqual({ ok: false, error: 'Invalid id or status.' });
            expect(supabaseServer.rpc).not.toHaveBeenCalled();
        });

        it('should return 400 Bad Request if validation fields are structurally flawed or missing variables', async () => {
            // Case 1: missing status, invalid id type
            const req1 = new NextRequest('http://localhost/api/monitor/feedback', {
                method: 'PATCH',
                body: JSON.stringify({ id: 12345 }), // Should be string
            });
            const res1 = await PATCH(req1);
            expect(res1.status).toBe(400);

            // Case 2: status value not in allowed array whitelist
            const req2 = new NextRequest('http://localhost/api/monitor/feedback', {
                method: 'PATCH',
                body: JSON.stringify({ id: 'uuid-string', status: 'deleted_permanently' }),
            });
            const res2 = await PATCH(req2);
            expect(res2.status).toBe(400);
        });

        it('should return 404 Not Found if input passes checks but ticket entity is missing from rows', async () => {
            // Supabase RPC execution returns null data for non-existent target
            mockRpcFn.mockResolvedValueOnce(createRpcSuccess(null));

            const req = new NextRequest('http://localhost/api/monitor/feedback', {
                method: 'PATCH',
                body: JSON.stringify({ id: 'missing-id', status: 'resolved' }),
            });
            const res = await PATCH(req);
            const body = await res.json();

            expect(res.status).toBe(404);
            expect(body).toEqual({ ok: false, error: 'Ticket not found.' });
            expect(mockRpcFn).toHaveBeenCalledWith('update_ticket_status', {
                p_id: 'missing-id',
                p_status: 'resolved',
            });
        });

        it('should run successfully, execute mutations, log transactions, and dispatch data rows', async () => {
            const updatedTicket = { id: 'ticket-77', status: 'resolved', category: 'bug' };
            mockRpcFn.mockResolvedValueOnce(createRpcSuccess(updatedTicket));

            const req = new NextRequest('http://localhost/api/monitor/feedback', {
                method: 'PATCH',
                body: JSON.stringify({ id: 'ticket-77', status: 'resolved' }),
            });
            const res = await PATCH(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual({ ok: true, ticket: updatedTicket });
            expect(logApiEvent).toHaveBeenCalledWith('monitor.feedback', 'success', 200, 'status->resolved');
        });

        it('should intercept execution exceptions, log stacktraces, and throw standard 500 error outputs', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockRpcFn.mockResolvedValueOnce(createRpcFailure('Deadlock row mutation failure'));

            const req = new NextRequest('http://localhost/api/monitor/feedback', {
                method: 'PATCH',
                body: JSON.stringify({ id: 'ticket-99', status: 'seen' }),
            });
            const res = await PATCH(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({ ok: false, error: 'Server error.' });
            expect(logApiEvent).toHaveBeenCalledWith('monitor.feedback', 'error', 500, 'Deadlock row mutation failure');

            consoleSpy.mockRestore();
        });
    });
});