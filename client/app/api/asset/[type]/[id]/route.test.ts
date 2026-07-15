// app/api/asset/[type]/[id]/route.test.ts
// pnpm --prefix client test app/api/asset/[type]/[id]/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import type { Stats, ReadStream } from 'fs';
import { Readable } from 'stream';

// ─── 🚀 INTERPRISE-GRADE HOISTED SPY LAYER ───────────────────────────────────
// การันตีการรันก่อนคำสั่ง Mock และ Import ใดๆ ในไฟล์ เพื่อเลี่ยง ReferenceError 100%
const { mockStat, mockCreateReadStream, mockResolveAssetPath } = vi.hoisted(() => {
    return {
        mockStat: vi.fn(),
        mockCreateReadStream: vi.fn(),
        mockResolveAssetPath: vi.fn(),
    };
});

// ─── 🚀 MODULE INTEROP ISOLATION MOCKS ────────────────────────────────────────
vi.mock('fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs/promises')>();
    const mockModule = {
        ...actual,
        stat: mockStat,
    };
    return {
        ...mockModule,
        default: mockModule, // ล็อกคอไม่ให้คอมไพเลอร์แอบวิ่งทะลุไปใช้ fs จริงบนดิสก์
    };
});

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    const mockModule = {
        ...actual,
        createReadStream: mockCreateReadStream,
    };
    return {
        ...mockModule,
        default: mockModule,
    };
});

vi.mock('@/src/lib/assets/resolveAssetPath', () => {
    return {
        resolveAssetPath: mockResolveAssetPath,
    };
});

// ─── 🧪 MAIN ENTERPRISE TEST SUITE ───────────────────────────────────────────
describe('GET /api/asset/[type]/[id]', () => {
    const fakeFileSize = 25000;
    const defaultMockPath = '/absolute/secure/vault/assets/audio-sample.mp3';

    beforeEach(() => {
        vi.clearAllMocks();

        // 🛡️ SET GLOBAL HEALTHY DEFAULT STATE (ทุกเทสต์จะยืนพื้นบนสถานะที่ใช้ได้เสมอ)
        mockResolveAssetPath.mockResolvedValue(defaultMockPath);

        mockStat.mockResolvedValue({
            isFile: () => true,
            size: fakeFileSize,
        } as unknown as Stats);

        // ใช้ Real Readable Stream เพื่อให้ฟังก์ชัน Readable.toWeb ทำงานได้อย่างสมบูรณ์แบบไม่เกิด Exception
        mockCreateReadStream.mockReturnValue(
            Readable.from([Buffer.from('enterprise-binary-stream')]) as unknown as ReadStream
        );
    });

    // ==========================================
    // 🛡️ SECTION 1: RESOLUTION & VALIDATION GUARDS
    // ==========================================
    describe('Asset Resolution & Filesystem Security Guards', () => {
        it('should return 404 Not Found if the core business logic fails to resolve the asset mapping', async () => {
            mockResolveAssetPath.mockResolvedValueOnce(null);

            const targetParams = Promise.resolve({ type: 'audio', id: 'invalid-id' });
            const req = new NextRequest('http://localhost/api/asset/audio/invalid-id');

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(404);
            expect(await res.text()).toBe('Not found');
            expect(mockStat).not.toHaveBeenCalled();
        });

        it('should intercept filesystem exceptions gracefully and degrade to 404', async () => {
            mockStat.mockRejectedValueOnce(new Error('ENOENT: no such file or directory, stat'));

            const targetParams = Promise.resolve({ type: 'image', id: 'corrupted-node' });
            const req = new NextRequest('http://localhost/api/asset/image/corrupted-node');

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(404);
            expect(await res.text()).toBe('Not found');
        });
    });

    // ==========================================
    // 🎵 SECTION 2: STANDARD CONTENT DELIVERY (200 OK)
    // ==========================================
    describe('Standard Content Infrastructure Delivery (HTTP 200 OK)', () => {
        it('should fulfill full data pipelines with status 200 when no Range constraints are declared', async () => {
            const targetParams = Promise.resolve({ type: 'audio', id: 'track-01' });
            const req = new NextRequest('http://localhost/api/asset/audio/track-01');

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
            expect(res.headers.get('Cache-Control')).toBe('private, no-store');
            expect(res.headers.get('Accept-Ranges')).toBe('bytes');
            expect(res.headers.get('Content-Length')).toBe(String(fakeFileSize));
            expect(mockCreateReadStream).toHaveBeenCalledWith(defaultMockPath);
        });

        it('should fall back onto application/octet-stream for unregistered file mutations', async () => {
            mockResolveAssetPath.mockResolvedValueOnce('/vault/assets/unknown-data.xyz');

            const targetParams = Promise.resolve({ type: 'binary', id: 'raw-node' });
            const req = new NextRequest('http://localhost/api/asset/binary/raw-node');

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
        });

        it('should correctly parse image mutations such as webp types', async () => {
            mockResolveAssetPath.mockResolvedValueOnce('/vault/assets/hero.webp');

            const targetParams = Promise.resolve({ type: 'image', id: 'hero' });
            const req = new NextRequest('http://localhost/api/asset/image/hero');

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toBe('image/webp');
        });
    });

    // ==========================================
    // ⚡ SECTION 3: RANGE PIPELINES & 206 PARTIAL CONTRACTS
    // ==========================================
    describe('Range Engine Protocols & Selective Byte Streaming (HTTP 206 Partial Content)', () => {
        it('should stream chunks accurately under standard media player seeking requirements', async () => {
            const targetParams = Promise.resolve({ type: 'audio', id: 'seekable-track' });
            const req = new NextRequest('http://localhost/api/asset/audio/seekable-track', {
                headers: { range: 'bytes=5000-15000' },
            });

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(206);
            expect(res.headers.get('Content-Range')).toBe(`bytes 5000-15000/${fakeFileSize}`);
            expect(res.headers.get('Content-Length')).toBe(String(15000 - 5000 + 1));
            expect(mockCreateReadStream).toHaveBeenCalledWith(defaultMockPath, { start: 5000, end: 15000 });
        });

        it('should assign fallback starting bytes automatically if the initial range block is omitted', async () => {
            const targetParams = Promise.resolve({ type: 'audio', id: 'omitted-start' });
            const req = new NextRequest('http://localhost/api/asset/audio/omitted-start', {
                headers: { range: 'bytes=-8000' },
            });

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(206);
            expect(res.headers.get('Content-Range')).toBe(`bytes 0-8000/${fakeFileSize}`);
            expect(mockCreateReadStream).toHaveBeenCalledWith(defaultMockPath, { start: 0, end: 8000 });
        });
    });

    // ==========================================
    // ❌ SECTION 4: PROTOCOL EXCEPTION HANDLING (416)
    // ==========================================
    describe('Error Resilience & Boundary Violations (HTTP 416 Range Not Satisfiable)', () => {
        it('should block malformed or garbled HTTP Range declarations with 416 responses', async () => {
            const targetParams = Promise.resolve({ type: 'audio', id: 'bad-syntax' });
            const req = new NextRequest('http://localhost/api/asset/audio/bad-syntax', {
                headers: { range: 'bytes=corrupted-string' },
            });

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(416);
            expect(res.headers.get('Content-Range')).toBe(`bytes */${fakeFileSize}`);
            expect(await res.text()).toBe('Invalid Range');
        });

        it('should reject requests where the starting index logically conflicts with the ending index', async () => {
            const targetParams = Promise.resolve({ type: 'audio', id: 'inverted-range' });
            const req = new NextRequest('http://localhost/api/asset/audio/inverted-range', {
                headers: { range: 'bytes=12000-10000' },
            });

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(416);
            expect(res.headers.get('Content-Range')).toBe(`bytes */${fakeFileSize}`);
        });

        it('should intercept bounds crossing when the requested size matches or exceeds the real file boundary', async () => {
            const targetParams = Promise.resolve({ type: 'audio', id: 'out-of-bounds' });
            const req = new NextRequest('http://localhost/api/asset/audio/out-of-bounds', {
                headers: { range: `bytes=0-${fakeFileSize + 2000}` },
            });

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(416);
            expect(res.headers.get('Content-Range')).toBe(`bytes */${fakeFileSize}`);
        });
    });
});