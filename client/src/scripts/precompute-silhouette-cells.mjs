// npx tsx src/scripts/precompute-silhouette-cells.mjs

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const GRID_SIZE = 5;
const ALPHA_THRESHOLD = 15;

// 🎯 1. บีบช่วงพื้นที่เงาให้แคบลง (ตัดช่องทึบเกิน / โล่งเกินออกอย่างเด็ดขาด)
// 🎯 ค่าที่แนะนำสำหรับเกมทายเงา (ตาราง 5x5)
const MIN_OCCUPIED_RATIO = 0.03;       // 3% (เก็บหมดแม้กระทั่งปลายดาบ/ปลายผม)
const MAX_OCCUPIED_RATIO = 0.98;       // 98% (เก็บช่วงลำตัวทึบๆ ไว้ด้วย ไม่ทิ้งกลางตัว)
const MIN_EDGE_PIXEL_COUNT = 3;        // 3 pixels (ลดลงเพื่อไม่ให้พลาดขอบเล็กๆ)
const EDGE_DIRECTION_MIN_MAGNITUDE = 10;// 10 (ดักจับขอบภาพที่เบลอหรือมนนิดๆ ได้ดีขึ้น)

const SILHOUETTE_DIR = path.resolve('assets-private/character_silhouette');
const OUTPUT_PATH = path.resolve('src/data/silhouette-cells.json');
const DEBUG_STATS_PATH = path.resolve('src/data/silhouette-cells.debug.json');

function normalize(values) {
    if (values.length === 0) return [];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;
    if (range < 1e-6) {
        return values.map(() => 0.5);
    }
    return values.map((v) => (v - min) / range);
}

async function getWeightedCellsForImage(filePath) {
    const { data, info } = await sharp(filePath)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const cellW = width / GRID_SIZE;
    const cellH = height / GRID_SIZE;

    const alphaAt = (x, y) => {
        const cx = Math.min(Math.max(x, 0), width - 1);
        const cy = Math.min(Math.max(y, 0), height - 1);
        const idx = (cy * width + cx) * channels;
        return channels === 4 ? data[idx + 3] : 255;
    };

    const occupied = [];
    const cellDebug = [];
    const contourScores = [];
    const balanceScores = [];
    const cellIndices = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const x0 = Math.floor(col * cellW), x1 = Math.floor((col + 1) * cellW);
            const y0 = Math.floor(row * cellH), y1 = Math.floor((row + 1) * cellH);

            let filled = 0, total = 0;
            let sumCos = 0, sumSin = 0, sumMagnitude = 0, edgePixelCount = 0;

            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    const a = alphaAt(x, y);
                    total++;
                    if (a > ALPHA_THRESHOLD) filled++;

                    const gx = alphaAt(x + 1, y) - alphaAt(x - 1, y);
                    const gy = alphaAt(x, y + 1) - alphaAt(x, y - 1);
                    const magnitude = Math.hypot(gx, gy);

                    if (magnitude > EDGE_DIRECTION_MIN_MAGNITUDE) {
                        const theta = Math.atan2(gy, gx);
                        sumCos += Math.cos(theta) * magnitude;
                        sumSin += Math.sin(theta) * magnitude;
                        sumMagnitude += magnitude;
                        edgePixelCount++;
                    }
                }
            }

            const occupiedRatio = filled / total;

            const isTransparentEnough = occupiedRatio >= MIN_OCCUPIED_RATIO;
            const isNotTooSolid = occupiedRatio <= MAX_OCCUPIED_RATIO;
            const hasEnoughEdgePixels = edgePixelCount >= MIN_EDGE_PIXEL_COUNT;

            const isUsable = isTransparentEnough && isNotTooSolid && hasEnoughEdgePixels;
            const cellIndex = row * GRID_SIZE + col;

            let contourComplexity = 0;

            if (isUsable) {
                occupied.push(cellIndex);
                cellIndices.push(cellIndex);

                if (edgePixelCount > 0) {
                    const meanCos = sumCos / sumMagnitude;
                    const meanSin = sumSin / sumMagnitude;
                    const R = Math.hypot(meanCos, meanSin);
                    const directionVariance = 1 - R;
                    const magnitudeDensity = sumMagnitude / total;
                    contourComplexity = magnitudeDensity * directionVariance;
                }
                contourScores.push(contourComplexity);

                // 🎯 2. คำนวณ Balance Score (ยิ่งเข้าใกล้ 50% / 0.5 คะแนนยิ่งสูง)
                const balance = 1 - 4 * Math.pow(occupiedRatio - 0.5, 2);
                balanceScores.push(Math.max(0, balance));
            }

            cellDebug.push({
                cell: cellIndex,
                occupiedRatio: Number(occupiedRatio.toFixed(3)),
                edgePixelCount,
                contourComplexity: Number(contourComplexity.toFixed(4)),
                isUsable,
                skippedReason: !isTransparentEnough
                    ? 'too_transparent'
                    : !isNotTooSolid
                        ? 'too_solid'
                        : !hasEnoughEdgePixels
                            ? 'insufficient_edges'
                            : null,
            });
        }
    }

    const normContour = normalize(contourScores);

    const weights = {};
    cellIndices.forEach((cellIndex, i) => {
        // 🎯 3. รวมน้ำหนัก: ความซับซ้อนของขอบ (60%) + ความสมดุลไม่ทึบ/โล่งเกินไป (40%)
        // 🎯 ปรับสัดส่วนน้ำหนัก: เน้นลายละเอียดขอบ 80% + ความทึบ 20%
        const w = normContour[i] * 0.8 + balanceScores[i] * 0.2;
        weights[cellIndex] = Number(w.toFixed(4));
    });

    return { occupied, weights, cellDebug };
}

async function main() {
    const files = (await fs.readdir(SILHOUETTE_DIR))
        .filter((f) => /\.(png|webp)$/i.test(f))
        .filter((f) => !path.basename(f).startsWith('_'));

    const result = {};
    const debugResult = {};

    for (const file of files) {
        const { occupied, weights, cellDebug } = await getWeightedCellsForImage(path.join(SILHOUETTE_DIR, file));

        result[file] = { occupied, weights };
        debugResult[file] = cellDebug;

        const topCells = Object.entries(weights)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cell, w]) => `${cell}(${w.toFixed(2)})`)
            .join(', ');

        console.log(`✓ ${file}: ${occupied.length}/${GRID_SIZE * GRID_SIZE} occupied | top cells: ${topCells}`);
    }

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));
    await fs.writeFile(DEBUG_STATS_PATH, JSON.stringify(debugResult, null, 2));
    console.log(`\n📦 saved -> ${OUTPUT_PATH}`);
    console.log(`🔍 debug stats -> ${DEBUG_STATS_PATH}`);
}

main().catch(console.error);