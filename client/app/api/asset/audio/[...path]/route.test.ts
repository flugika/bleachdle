// app/api/asset/audio/[...path]/route.test.ts
// pnpm --prefix client test app/api/asset/audio/[...path]/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import type { Stats, ReadStream } from 'fs';
import { Readable } from 'stream';
import path from 'path';

// ─── 🚀 VI.HOISTED (ลำดับการรันไทม์ที่ถูกต้อง) ───────────────────────────────────
const { mockStat, mockCreateReadStream } = vi.hoisted(() => {
    return {
        mockStat: vi.fn(),
        mockCreateReadStream: vi.fn(),
    };
});

// ─── 🚀 MODULE MOCKS (FIXED: ป้องกันไม่ให้ทะลุไปเรียกโมดูลจริงบน Disk) ───────────
vi.mock('fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs/promises')>();
    const mockModule = {
        ...actual,
        stat: mockStat,
    };
    return {
        ...mockModule,
        default: mockModule, // 💡 ชี้พอยเตอร์ไปที่ออบเจกต์ที่โดนครอบ Mock แล้ว
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
        default: mockModule, // 💡 ชี้พอยเตอร์ไปที่ออบเจกต์ที่โดนครอบ Mock แล้ว
    };
});

describe('GET /api/asset/audio/[...path]', () => {
    const ROOT = process.cwd();
    const AUDIO_ROOT = path.join(ROOT, 'assets-private', 'audio');
    const fakeFileSize = 10000;

    beforeEach(() => {
        vi.clearAllMocks();

        // 🛡️ SET GLOBAL HEALTHY DEFAULT STATE (ป้องกันการหลุดไป 404)
        // ทุกเทสต์จะมองเห็นเป็นไฟล์ปกติขนาด 10,000 bytes ยืนพื้นไว้ก่อนเสมอ
        mockStat.mockResolvedValue({
            isFile: () => true,
            size: fakeFileSize,
        } as unknown as Stats);

        mockCreateReadStream.mockReturnValue(
            Readable.from(['mock-binary']) as unknown as ReadStream
        );
    });

    // ==========================================
    // 🛡️ SECTION 1: PATH RESOLUTION & SECURITY GUARDS
    // ==========================================
    describe('Path Traversal & Absolute Isolation Guards', () => {
        it('should return 404 if path segments try to escape the assets-private container using dot-dot tokens', async () => {
            const targetParams = Promise.resolve({
                path: ['..', '..', 'public', 'secret.mp3'],
            });

            const req = new NextRequest('http://localhost/api/asset/audio/../../public/secret.mp3');
            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(404);
            expect(await res.text()).toBe('Not found');
            expect(mockStat).not.toHaveBeenCalled();
        });

        it('should correctly process legacy public structures (assets/audio/songs) but verify containment', async () => {
            const expectedTarget = path.join(AUDIO_ROOT, 'assets', 'audio', 'songs', 'track.mp3');

            const targetParams = Promise.resolve({
                path: ['assets', 'audio', 'songs', 'track.mp3'],
            });

            const req = new NextRequest('http://localhost/api/asset/audio/assets/audio/songs/track.mp3');
            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(200);
            expect(mockStat).toHaveBeenCalledWith(expectedTarget);
        });

        it('should return 404 if the resolved path points to a valid directory instead of an absolute file node', async () => {
            // Override เฉพาะเคสนี้ให้มองเห็นเป็นโฟลเดอร์แทนไฟล์
            mockStat.mockResolvedValueOnce({
                isFile: () => false,
                size: 0,
            } as unknown as Stats);

            const targetParams = Promise.resolve({
                path: ['songs'],
            });

            const req = new NextRequest('http://localhost/api/asset/audio/songs');
            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(404);
        });
    });

    // ==========================================
    // 🎵 SECTION 2: AUDIO STREAMING & BROWSER SEEKING (200 OK / 206 PARTIAL)
    // ==========================================
    describe('Streaming Engine & Range Protocol Actions', () => {
        it('should respond with 200 OK and complete file metadata when no Range Header is supplied', async () => {
            const targetParams = Promise.resolve({ path: ['songs', 'legacy_file.mp3'] });
            const req = new NextRequest('http://localhost/api/asset/audio/songs/legacy_file.mp3');

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
            expect(res.headers.get('Accept-Ranges')).toBe('bytes');
            expect(res.headers.get('Content-Length')).toBe(String(fakeFileSize));
            expect(mockCreateReadStream).toHaveBeenCalledWith(
                path.join(AUDIO_ROOT, 'songs', 'legacy_file.mp3')
            );
        });

        it('should return 206 Partial Content when a valid start-end Range slice is requested by the media player', async () => {
            const targetParams = Promise.resolve({ path: ['releases', 'album.wav'] });
            const req = new NextRequest('http://localhost/api/asset/audio/releases/album.wav', {
                headers: { range: 'bytes=2000-5000' },
            });

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(206);
            expect(res.headers.get('Content-Type')).toBe('audio/wav');
            expect(res.headers.get('Content-Range')).toBe(`bytes 2000-5000/${fakeFileSize}`);
            expect(res.headers.get('Content-Length')).toBe(String(5000 - 2000 + 1));

            expect(mockCreateReadStream).toHaveBeenCalledWith(
                path.join(AUDIO_ROOT, 'releases', 'album.wav'),
                { start: 2000, end: 5000 }
            );
        });

        it('should default start to 0 if the range header leaves the start segment empty', async () => {
            const targetParams = Promise.resolve({ path: ['songs', 'music.mp3'] });
            const req = new NextRequest('http://localhost/api/asset/audio/songs/music.mp3', {
                headers: { range: 'bytes=-4000' },
            });

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(206);
            expect(res.headers.get('Content-Range')).toBe(`bytes 0-4000/${fakeFileSize}`);
            expect(mockCreateReadStream).toHaveBeenCalledWith(expect.any(String), { start: 0, end: 4000 });
        });

        it('should fall back to Content Type application/octet-stream if file extension is unknown', async () => {
            const targetParams = Promise.resolve({ path: ['songs', 'secret_raw_file.xyz'] });
            const req = new NextRequest('http://localhost/api/asset/audio/songs/secret_raw_file.xyz');

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(200);
            expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
        });
    });

    // ==========================================
    // ❌ SECTION 3: ERROR HANDLING & INVALID STATE HANDLING
    // ==========================================
    describe('Error Resilience & Range Violation Responses', () => {
        it('should respond with 416 Range Not Satisfiable if the requested range parameter format is invalid', async () => {
            const targetParams = Promise.resolve({ path: ['songs', 'track.mp3'] });
            const req = new NextRequest('http://localhost/api/asset/audio/songs/track.mp3', {
                headers: { range: 'bytes=invalid-garbage-format' },
            });

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(416);
            expect(res.headers.get('Content-Range')).toBe(`bytes */${fakeFileSize}`);
        });

        it('should return 416 if the start byte position strictly exceeds the end byte position', async () => {
            const targetParams = Promise.resolve({ path: ['songs', 'track.mp3'] });
            const req = new NextRequest('http://localhost/api/asset/audio/songs/track.mp3', {
                headers: { range: 'bytes=3000-2000' },
            });

            const res = await GET(req, { params: targetParams });
            expect(res.status).toBe(416);
        });

        it('should return 416 if requested range limits go far beyond the boundaries of total file size', async () => {
            const targetParams = Promise.resolve({ path: ['songs', 'track.mp3'] });
            const req = new NextRequest('http://localhost/api/asset/audio/songs/track.mp3', {
                headers: { range: `bytes=0-${fakeFileSize + 500}` },
            });

            const res = await GET(req, { params: targetParams });
            expect(res.status).toBe(416);
        });

        it('should degrade gracefully to a 404 response if fs operations reject or encounter exceptions', async () => {
            // เจาะจงให้เคสนี้พังจำลอง Disk error / หาไฟล์ไม่เจอจริง ๆ
            mockStat.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

            const targetParams = Promise.resolve({ path: ['songs', 'missing.mp3'] });
            const req = new NextRequest('http://localhost/api/asset/audio/songs/missing.mp3');

            const res = await GET(req, { params: targetParams });

            expect(res.status).toBe(404);
            expect(await res.text()).toBe('Not found');
        });
    });
});