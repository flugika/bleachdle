// client/src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// server-only จะ throw ถ้าถูก import นอก RSC context (เช่นใน jsdom test env)
vi.mock('server-only', () => ({}));

// ค่า mock สำหรับ Supabase client constructor เท่านั้น —
// MSW จะเป็นคนดักจับ HTTP request จริงๆ ไม่ได้ยิงไปหา Supabase จริง
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'mock-service-role-key';