// npx tsx src/scripts/precompute-silhouette-cells.mjs

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const GRID_SIZE = 5; // ต้องตรงกับ GRID_SIZE ใน silhouette.ts
const ALPHA_THRESHOLD = 10;            // alpha > นี้ = ถือว่ามีเนื้อ ไม่ใช่โปร่งใส
const OCCUPIED_RATIO_THRESHOLD = 0.02; // ช่องต้องมีเนื้อ (ไม่โปร่งใส) >= 2% ของพื้นที่ช่อง ถึงนับ occupied

// --- ตัวกรองเพิ่ม: cell ที่ทึบสนิท (เนื้อเต็มช่อง ~100%) คือใจกลางเงาดำ ไม่มี "ขอบ" ให้เห็นเลย ---
// เดิมกรองด้วยความมืด (luminance) แต่ silhouette ทุกภาพเป็นสีดำล้วน ทำให้ darkRatio ~1.00
// เกือบทุก cell ที่มีเนื้อ ผลคือถูกตัดออกหมด -> occupied ว่างเปล่าทั้งไฟล์ (บั๊กเดิม)
// ตัวชี้วัดที่ถูกต้องกว่า: cell มี "ขอบเงา" หรือไม่ (มีทั้งส่วนทึบและส่วนโปร่งใสปนกันในช่องเดียว)
// เพราะ cell ที่ทึบเต็ม 100% ไม่มีขอบให้เห็น ไม่ช่วยให้ทายรูปทรงตัวละคร ควรตัดออกจาก occupied
const MAX_OCCUPIED_RATIO = 0.97; // เนื้อเต็มช่อง >= 97% ถือว่าไม่มีขอบให้เห็น -> ไม่นับ occupied

// --- ไฟล์ที่ไม่ใช่ silhouette ของตัวละครจริง (เช่น contact sheet รวมภาพ) ให้ข้ามไปเลย ---
const SKIP_FILE_PATTERN = /^_/; // ไฟล์ที่ขึ้นต้นด้วย _ เช่น _contact_sheet.webp

const SILHOUETTE_DIR = path.resolve('public/assets/character_silhouette');
const OUTPUT_PATH = path.resolve('src/data/silhouette-cells.json');
const DEBUG_STATS_PATH = path.resolve('src/data/silhouette-cells.debug.json');

async function getOccupiedCellsForImage(filePath) {
    const { data, info } = await sharp(filePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const cellW = width / GRID_SIZE;
    const cellH = height / GRID_SIZE;
    const occupied = [];
    const cellDebug = []; // เก็บไว้ debug/tune threshold ทีหลัง

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const x0 = Math.floor(col * cellW), x1 = Math.floor((col + 1) * cellW);
            const y0 = Math.floor(row * cellH), y1 = Math.floor((row + 1) * cellH);

            let filled = 0, total = 0;

            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    const idx = (y * width + x) * channels;
                    const alpha = channels === 4 ? data[idx + 3] : 255;
                    total++;
                    if (alpha > ALPHA_THRESHOLD) filled++;
                }
            }

            const occupiedRatio = filled / total;

            const isTransparentEnough = occupiedRatio >= OCCUPIED_RATIO_THRESHOLD;
            const isFullySolid = occupiedRatio > MAX_OCCUPIED_RATIO; // ไม่มีขอบเงาให้เห็น
            const isUsable = isTransparentEnough && !isFullySolid;

            const cellIndex = row * GRID_SIZE + col;
            if (isUsable) occupied.push(cellIndex);

            cellDebug.push({
                cell: cellIndex,
                occupiedRatio: Number(occupiedRatio.toFixed(3)),
                skippedReason: !isTransparentEnough ? 'too_transparent' : isFullySolid ? 'fully_solid_no_edge' : null,
            });
        }
    }
    return { occupied, cellDebug };
}

async function main() {
    const files = (await fs.readdir(SILHOUETTE_DIR))
        .filter(f => /\.(png|webp)$/i.test(f))
        .filter(f => !SKIP_FILE_PATTERN.test(f)); // ข้าม _contact_sheet.webp และไฟล์ระบบอื่น ๆ ที่ไม่ใช่ตัวละคร
    const result = {};
    const debugResult = {};

    for (const file of files) {
        const { occupied, cellDebug } = await getOccupiedCellsForImage(path.join(SILHOUETTE_DIR, file));
        result[file] = occupied;
        debugResult[file] = cellDebug;

        const skippedSolid = cellDebug.filter((c) => c.skippedReason === 'fully_solid_no_edge').length;
        const skippedTransparent = cellDebug.filter((c) => c.skippedReason === 'too_transparent').length;
        console.log(
            `✓ ${file}: ${occupied.length}/${GRID_SIZE * GRID_SIZE} occupied` +
            (skippedSolid ? ` | ${skippedSolid} skipped (fully solid, no edge)` : '') +
            (skippedTransparent ? ` | ${skippedTransparent} skipped (too transparent)` : '')
        );
    }

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));
    await fs.writeFile(DEBUG_STATS_PATH, JSON.stringify(debugResult, null, 2));
    console.log(`\n📦 saved -> ${OUTPUT_PATH}`);
    console.log(`🔍 debug stats -> ${DEBUG_STATS_PATH}`);
}

main().catch(console.error);