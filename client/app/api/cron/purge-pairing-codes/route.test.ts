// app/api/cron/purge-pairing-codes/route.test.ts
// pnpm --prefix client test app/api/cron/purge-pairing-codes/route.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
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

// ─── 🧪 TEST SUITE ────────────────────────────────────────────────────────────
describe('Cron Purge Pairing Codes API Endpoint Suite', () => {
    const ORIGINAL_ENV = process.env;
    const MOCK_CRON_SECRET = 'test-enterprise-cron-secret-key-999';

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...ORIGINAL_ENV, CRON_SECRET: MOCK_CRON_SECRET };
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    // Helper setup RPC mock implementations based on RPC names
    // 🟢 เปลี่ยน any เป็น unknown พร้อม type-check เพื่อแก้ no-explicit-any warning
    const setupRpcMockResolutions = (overrides: Record<string, unknown> = {}) => {
        mockRpcFn.mockImplementation((rpcName: string) => {
            if (rpcName in overrides) {
                const override = overrides[rpcName];
                if (
                    override instanceof Error ||
                    (typeof override === 'object' && override !== null && (override as { isRejected?: boolean }).isRejected)
                ) {
                    const reason = (override as { reason?: unknown }).reason;
                    return Promise.reject(reason || override);
                }
                return Promise.resolve(override);
            }
            return Promise.resolve(createRpcSuccess({ affected: 5 }));
        });
    };

    // ==========================================
    // 🔒 AUTHENTICATION & SECURITY BLOCKS
    // ==========================================
    describe('Authentication & Security Layer', () => {
        it('should return 401 Unauthorized when Authorization header is missing', async () => {
            const req = new NextRequest('http://localhost/api/cron/purge-pairing-codes');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthorized' });
            expect(supabaseServer.rpc).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthorized when Bearer token is invalid', async () => {
            const req = new NextRequest('http://localhost/api/cron/purge-pairing-codes', {
                headers: { authorization: 'Bearer invalid-wrong-token' },
            });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(401);
            expect(body).toEqual({ error: 'unauthorized' });
            expect(supabaseServer.rpc).not.toHaveBeenCalled();
        });

        it('should bypass auth check and execute normally if CRON_SECRET is not configured in env', async () => {
            delete process.env.CRON_SECRET;
            setupRpcMockResolutions();

            const req = new NextRequest('http://localhost/api/cron/purge-pairing-codes');
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.status).toBe('ok');
            expect(supabaseServer.rpc).toHaveBeenCalledTimes(3);
        });
    });

    // ==========================================
    // ⚡ SUCCESSFUL PARALLEL EXECUTION BLOCKS
    // ==========================================
    describe('Parallel RPC Purge Executions (Happy Path)', () => {
        it('should trigger all 3 purge RPC jobs concurrently and return 200 OK with ISO timestamp', async () => {
            setupRpcMockResolutions();

            const req = new NextRequest('http://localhost/api/cron/purge-pairing-codes', {
                headers: { authorization: `Bearer ${MOCK_CRON_SECRET}` },
            });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.status).toBe('ok');
            expect(typeof body.ranAt).toBe('string');
            expect(new Date(body.ranAt).getTime()).not.toBeNaN();

            // Verify all 3 exact RPCs were called
            expect(mockRpcFn).toHaveBeenCalledWith('purge_expired_pairing_codes');
            expect(mockRpcFn).toHaveBeenCalledWith('purge_old_result_events');
            expect(mockRpcFn).toHaveBeenCalledWith('purge_old_provision_log');
            expect(mockRpcFn).toHaveBeenCalledTimes(3);
        });
    });

    // ==========================================
    // 💥 ERROR & PARTIAL FAILURE HANDLING BLOCKS
    // ==========================================
    describe('Error Handling & Partial Failure Recovery', () => {
        it('should handle single RPC database error and return 500 status partial_failure', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            setupRpcMockResolutions({
                purge_expired_pairing_codes: createRpcFailure('Deadlock detected during purge'),
            });

            const req = new NextRequest('http://localhost/api/cron/purge-pairing-codes', {
                headers: { authorization: `Bearer ${MOCK_CRON_SECRET}` },
            });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({
                status: 'partial_failure',
                failed: ['pairing_codes'],
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[cron/purge] pairing_codes failed:',
                expect.objectContaining({ message: 'Deadlock detected during purge' })
            );

            consoleSpy.mockRestore();
        });

        it('should handle multiple RPC failures and aggregate failed job names correctly', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            setupRpcMockResolutions({
                purge_old_result_events: createRpcFailure('Table locked'),
                purge_old_provision_log: createRpcFailure('Timeout constraint violation'),
            });

            const req = new NextRequest('http://localhost/api/cron/purge-pairing-codes', {
                headers: { authorization: `Bearer ${MOCK_CRON_SECRET}` },
            });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({
                status: 'partial_failure',
                failed: ['result_events', 'provision_log'],
            });

            expect(consoleSpy).toHaveBeenCalledTimes(2);
            consoleSpy.mockRestore();
        });

        it('should gracefully handle unhandled promise rejection in RPC network transport level', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const fatalNetworkError = new Error('Fatal socket connection loss');
            setupRpcMockResolutions({
                purge_old_provision_log: { isRejected: true, reason: fatalNetworkError },
            });

            const req = new NextRequest('http://localhost/api/cron/purge-pairing-codes', {
                headers: { authorization: `Bearer ${MOCK_CRON_SECRET}` },
            });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({
                status: 'partial_failure',
                failed: ['provision_log'],
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[cron/purge] provision_log failed:',
                fatalNetworkError
            );

            consoleSpy.mockRestore();
        });

        it('should list all 3 jobs in failed array if all RPC execution tasks crash simultaneously', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            setupRpcMockResolutions({
                purge_expired_pairing_codes: createRpcFailure('Error 1'),
                purge_old_result_events: createRpcFailure('Error 2'),
                purge_old_provision_log: createRpcFailure('Error 3'),
            });

            const req = new NextRequest('http://localhost/api/cron/purge-pairing-codes', {
                headers: { authorization: `Bearer ${MOCK_CRON_SECRET}` },
            });
            const res = await GET(req);
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body).toEqual({
                status: 'partial_failure',
                failed: ['pairing_codes', 'result_events', 'provision_log'],
            });

            expect(consoleSpy).toHaveBeenCalledTimes(3);
            consoleSpy.mockRestore();
        });
    });
});