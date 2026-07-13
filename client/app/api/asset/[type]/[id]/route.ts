// src/app/api/asset/[type]/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { resolveAssetPath } from '@/src/lib/assets/resolveAssetPath';

const MIME: Record<string, string> = {
    png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg',
    jpeg: 'image/jpeg', mp3: 'audio/mpeg',
};

// เสียง/วิดีโอ ต้อง seek ได้ (Range) — รูปไม่จำเป็น แต่เปิดไว้ให้ทุก type ก็ไม่เสียหาย
function nodeStreamToWeb(nodeStream: NodeJS.ReadableStream): ReadableStream {
    return Readable.toWeb(nodeStream as Readable) as ReadableStream;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ type: string; id: string }> }
) {
    const { type, id } = await params;

    const filePath = await resolveAssetPath(type, id);
    if (!filePath) return new NextResponse('Not found', { status: 404 });

    let fileStat;
    try {
        fileStat = await stat(filePath);
    } catch {
        return new NextResponse('Not found', { status: 404 });
    }

    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';
    const fileSize = fileStat.size;

    const baseHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
        // 🆕 สำคัญที่สุดสำหรับ <audio>: ถ้าไม่มีตัวนี้ browser จะไม่ trust ว่า
        // seek แบบ byte-accurate ได้ แล้วจะ estimate ตำแหน่งเอง -> seek เพี้ยน
        // (อาการที่เจอ: ขอ 3s ได้จริง ~2s)
        'Accept-Ranges': 'bytes',
    };

    // ==========================================
    // 🆕 RANGE REQUEST SUPPORT (206 Partial Content)
    // ==========================================
    // เดิม readFile ทั้งไฟล์เข้า memory แล้วส่งทีเดียวไม่สน Range header
    // -> ทุก seek/replay ต้องรอโหลดทั้งไฟล์ใหม่ก่อนเล่นได้จริง (ดีเลย์)
    // -> และ browser seek ไม่แม่น เพราะไม่มี partial-content contract ให้เชื่อถือ
    const rangeHeader = req.headers.get('range');

    if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
        if (!match) {
            return new NextResponse('Invalid Range', {
                status: 416,
                headers: { 'Content-Range': `bytes */${fileSize}` },
            });
        }

        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

        if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || end >= fileSize) {
            return new NextResponse('Invalid Range', {
                status: 416,
                headers: { 'Content-Range': `bytes */${fileSize}` },
            });
        }

        const chunkSize = end - start + 1;
        const nodeStream = createReadStream(filePath, { start, end });

        return new NextResponse(nodeStreamToWeb(nodeStream), {
            status: 206,
            headers: {
                ...baseHeaders,
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': String(chunkSize),
            },
        });
    }

    const nodeStream = createReadStream(filePath);
    return new NextResponse(nodeStreamToWeb(nodeStream), {
        status: 200,
        headers: {
            ...baseHeaders,
            'Content-Length': String(fileSize),
        },
    });
}