// npx tsx src/scripts/precompute-silhouette-cells.mjs

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const GRID_SIZE = 5;
const ALPHA_THRESHOLD = 10;
const OCCUPIED_RATIO_THRESHOLD = 0.02;
const MAX_OCCUPIED_RATIO = 0.97;
const SKIP_FILE_PATTERN = /^_/;

// 🩹 เกณฑ์ขั้นต่ำของ gradient magnitude ที่จะนับเป็น "edge pixel" จริง (หน่วยเดียวกับ alpha 0-255)
// ต่ำพอที่จะจับขอบ antialiased ได้ แต่สูงพอกันสัญญาณรบกวนจาก rounding error ในพื้นที่ทึบ/โปร่งใสล้วน
const EDGE_DIRECTION_MIN_MAGNITUDE = 15;

// น้ำหนักรวมระหว่าง "ความซับซ้อนของเส้นขอบ" กับ "ระยะห่างจากศูนย์กลางมวล"
// contourComplexity ได้น้ำหนักมากกว่า เพราะเป็นตัวชี้ "เอกลักษณ์" โดยตรง (เส้นหยัก vs เส้นตรง)
// ส่วน extremity เป็นแค่ proxy คร่าวๆ ของ "ส่วนที่ยื่นออกจากลำตัว" — ยังมีประโยชน์แต่หยาบกว่า
// ⚠️ ค่านี้ยังเป็นจุดเริ่มต้น ต้องดู debug output จริงกับตัวละคร 5-10 ตัวที่รู้ทรงชัดก่อนฟันธง
const CONTOUR_WEIGHT = 0.7;
const EXTREMITY_WEIGHT = 0.3;

const SILHOUETTE_DIR = path.resolve('assets-private/character_silhouette');
const OUTPUT_PATH = path.resolve('src/data/silhouette-cells.json');
const DEBUG_STATS_PATH = path.resolve('src/data/silhouette-cells.debug.json');

// 🩹 normalize แบบ relative min-max ของภาพนั้นๆ เท่านั้น (ไม่ anchor สเกลสัมบูรณ์)
// เพราะการสุ่มเลือกเกิดขึ้น "ภายในภาพเดียวกัน" เท่านั้น ไม่เคยเทียบข้ามภาพ
// ถ้า range แคบเกินไป (cell ในภาพนี้คะแนนใกล้เคียงกันหมด) → คืนน้ำหนักเท่ากันหมด
// กันไม่ให้ noise เล็กๆ ถูกขยายเป็นความต่างปลอมๆ
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

    // --- STEP 1: centroid ของเงา (ถ่วงน้ำหนักด้วย alpha) สำหรับวัด extremity ---
    let sumX = 0, sumY = 0, massTotal = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (alphaAt(x, y) > ALPHA_THRESHOLD) {
                sumX += x;
                sumY += y;
                massTotal++;
            }
        }
    }
    const centroidX = massTotal > 0 ? sumX / massTotal : width / 2;
    const centroidY = massTotal > 0 ? sumY / massTotal : height / 2;
    const maxPossibleDist = Math.hypot(width, height) / 2;

    // --- STEP 2: ต่อ cell — occupiedRatio (เดิม) + contour complexity (ใหม่) + extremity ---
    const occupied = [];
    const cellDebug = [];
    const contourScores = [];
    const extremityScores = [];
    const cellIndices = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const x0 = Math.floor(col * cellW), x1 = Math.floor((col + 1) * cellW);
            const y0 = Math.floor(row * cellH), y1 = Math.floor((row + 1) * cellH);

            let filled = 0, total = 0;

            // 🆕 สถิติทิศทาง gradient แบบถ่วงน้ำหนักด้วย magnitude (weighted circular mean)
            // เก็บ sumCos/sumSin ของ edge pixel เท่านั้น (magnitude ผ่านเกณฑ์ขั้นต่ำ)
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
            const isTransparentEnough = occupiedRatio >= OCCUPIED_RATIO_THRESHOLD;
            const isFullySolid = occupiedRatio > MAX_OCCUPIED_RATIO;
            const isUsable = isTransparentEnough && !isFullySolid;

            const cellIndex = row * GRID_SIZE + col;

            let contourComplexity = 0;
            let directionVariance = 0;
            if (isUsable) {
                occupied.push(cellIndex);
                cellIndices.push(cellIndex);

                if (edgePixelCount > 0) {
                    // circular variance: R=1 ทิศทางเดียวกันหมด (เส้นตรง) -> variance=0
                    //                    R=0 ทิศทางกระจัดกระจาย (หยัก/ซับซ้อน) -> variance=1
                    const meanCos = sumCos / sumMagnitude;
                    const meanSin = sumSin / sumMagnitude;
                    const R = Math.hypot(meanCos, meanSin);
                    directionVariance = 1 - R;

                    // ถ่วงด้วยความหนาแน่นของ edge signal ใน cell — กัน cell ที่มี edge pixel
                    // น้อยมาก (อาจเป็น noise) ได้ variance สูงลอยๆ โดยไม่มี edge จริงรองรับพอ
                    const magnitudeDensity = sumMagnitude / total;
                    contourComplexity = magnitudeDensity * directionVariance;
                }
                contourScores.push(contourComplexity);

                const cellCenterX = (x0 + x1) / 2;
                const cellCenterY = (y0 + y1) / 2;
                const dist = Math.hypot(cellCenterX - centroidX, cellCenterY - centroidY);
                extremityScores.push(dist / maxPossibleDist);
            }

            cellDebug.push({
                cell: cellIndex,
                occupiedRatio: Number(occupiedRatio.toFixed(3)),
                contourComplexity: Number(contourComplexity.toFixed(4)),
                skippedReason: !isTransparentEnough ? 'too_transparent' : isFullySolid ? 'fully_solid_no_edge' : null,
            });
        }
    }

    const normContour = normalize(contourScores);
    const normExtremity = normalize(extremityScores);

    const weights = {};
    cellIndices.forEach((cellIndex, i) => {
        const w = normContour[i] * CONTOUR_WEIGHT + normExtremity[i] * EXTREMITY_WEIGHT;
        weights[cellIndex] = Number(w.toFixed(4));
    });

    return { occupied, weights, cellDebug };
}

async function main() {
    const files = (await fs.readdir(SILHOUETTE_DIR))
        .filter((f) => /\.(png|webp)$/i.test(f))
        .filter((f) => !SKIP_FILE_PATTERN.test(f));

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