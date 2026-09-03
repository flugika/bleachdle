// client/src/test/setup.ts
import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'mock-service-role-key';
process.env.NEXT_PUBLIC_SITE_URL ||= 'http://localhost:3000';

beforeEach(() => {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({}),
        } as Response)
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
});