// src/app/api/asset/audio/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

// 🔒 ไฟล์เสียงอยู่ที่ /assets-private/audio (ระดับเดียวกับ public/, นอก webroot)
const AUDIO_ROOT = path.join(process.cwd(), 'assets-private', 'audio');

const CONTENT_TYPES: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
};

// 🆕 แปลง Node Readable -> Web ReadableStream ให้ NextResponse ใช้ได้
function nodeStreamToWeb(nodeStream: NodeJS.ReadableStream): ReadableStream {
    return Readable.toWeb(nodeStream as Readable) as ReadableStream;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path: segments } = await params;

    // 🛡️ path traversal guard: resolve แล้วต้องยังอยู่ใต้ AUDIO_ROOT เท่านั้น
    const requestedPath = path.join(AUDIO_ROOT, ...segments);
    const resolved = path.resolve(requestedPath);
    if (!resolved.startsWith(AUDIO_ROOT + path.sep)) {
        return new NextResponse('Not found', { status: 404 });
    }

    try {
        const fileStat = await stat(resolved);
        if (!fileStat.isFile()) {
            return new NextResponse('Not found', { status: 404 });
        }

        const ext = path.extname(resolved).toLowerCase();
        const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
        const fileSize = fileStat.size;

        const baseHeaders: Record<string, string> = {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            // 🆕 บอก browser ตรงๆ ว่า endpoint นี้ seek ได้แบบ byte-range
            // ถ้าไม่มี header นี้ <audio> จะไม่กล้าไว้ใจว่า seek แม่น อาจ estimate ตำแหน่งเอาเอง
            'Accept-Ranges': 'bytes',
        };

        // ==========================================
        // 🆕 RANGE REQUEST SUPPORT (206 Partial Content)
        // ==========================================
        // เดิม: readFile ทั้งไฟล์แล้วส่งเป็นก้อนเดียว ไม่สน Range header ที่ <audio>
        // ส่งมาตอน seek/scrub เลย ทำให้ seek ไม่แม่น (browser ต้อง "เดา" ตำแหน่งจาก
        // ข้อมูลที่ estimate ไว้ แทนที่จะโหลด byte offset ที่ต้องการจริงๆ)
        // และทุกครั้งที่ play ต้องรอโหลดทั้งไฟล์ก่อน -> ดีเลย์
        const rangeHeader = req.headers.get('range');

        if (rangeHeader) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
            if (!match) {
                return new NextResponse('Invalid Range', {
                    status: 416,
                    headers: { 'Content-Range': `bytes */${fileSize}` },
                });
            }

            const startStr = match[1];
            const endStr = match[2];

            let start = startStr ? parseInt(startStr, 10) : 0;
            let end = endStr ? parseInt(endStr, 10) : fileSize - 1;

            if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || end >= fileSize) {
                return new NextResponse('Invalid Range', {
                    status: 416,
                    headers: { 'Content-Range': `bytes */${fileSize}` },
                });
            }

            const chunkSize = end - start + 1;
            const nodeStream = createReadStream(resolved, { start, end });

            return new NextResponse(nodeStreamToWeb(nodeStream), {
                status: 206,
                headers: {
                    ...baseHeaders,
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Content-Length': String(chunkSize),
                },
            });
        }

        // ไม่มี Range header (เช่น request แรกสุดจาก HEAD/prefetch) -> ส่งทั้งไฟล์ปกติ
        // แต่ยังคง Accept-Ranges: bytes ไว้ เพื่อให้ request ถัดไป (ตอน seek) ใช้ Range ได้
        const nodeStream = createReadStream(resolved);
        return new NextResponse(nodeStreamToWeb(nodeStream), {
            status: 200,
            headers: {
                ...baseHeaders,
                'Content-Length': String(fileSize),
            },
        });
    } catch {
        return new NextResponse('Not found', { status: 404 });
    }
}