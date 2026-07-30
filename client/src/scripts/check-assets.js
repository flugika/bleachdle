// src/scripts/check-assets.js
// npx tsx src/scripts/check-assets.js

import fs from 'node:fs';
import path from 'node:path';

// ==========================================
// 1. CONFIGURATION & ENVIRONMENT SETUP
// ==========================================

const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';
const ROOT_DIR = process.cwd();

const PATHS = {
    data: fs.existsSync(path.resolve(ROOT_DIR, 'src/data'))
        ? path.resolve(ROOT_DIR, 'src/data')
        : path.resolve(ROOT_DIR, 'data'),
    assetsBase: path.resolve(ROOT_DIR, 'assets-private'),
};

// เพิ่ม Key รูปแบบต่างๆ รวมถึง audio_url
const CANDIDATE_KEYS = [
    'audio_url', 'image_url', 'file_url', 'src_url', 'silhouette_url',
    'image', 'audio', 'file', 'sound', 'src', 'silhouette', 'filename', 'url', 'path'
];

// นามสกุลไฟล์สื่อที่พบบ่อยสำหรับ Fallback Auto-Detection
const KNOWN_MEDIA_EXTENSIONS = new Set([
    '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a',
    '.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif'
]);

// ==========================================
// 2. LOGGER & REPORTING HELPER (CI Friendly)
// ==========================================

const fmt = {
    red: (str) => `\x1b[31m${str}\x1b[0m`,
    green: (str) => `\x1b[32m${str}\x1b[0m`,
    yellow: (str) => `\x1b[33m${str}\x1b[0m`,
    cyan: (str) => `\x1b[36m${str}\x1b[0m`,
    bold: (str) => `\x1b[1m${str}\x1b[0m`,
};

function logError(message, filePath = '') {
    if (IS_GITHUB_ACTIONS) {
        const fileArg = filePath ? ` file=${filePath}` : '';
        console.error(`::error${fileArg}::${message}`);
    } else {
        console.error(`  ${fmt.red('❌')} ${message}`);
    }
}

function logWarning(message) {
    if (IS_GITHUB_ACTIONS) {
        console.warn(`::warning::${message}`);
    } else {
        console.warn(`  ${fmt.yellow('⚠️')} ${message}`);
    }
}

// ==========================================
// 3. UTILITY FUNCTIONS
// ==========================================

/**
 * โหลดและ Parse JSON File อย่างปลอดภัย
 * @param {string} filename 
 * @returns {unknown | null}
 */
function loadJson(filename) {
    const filePath = path.join(PATHS.data, filename);
    if (!fs.existsSync(filePath)) return null;

    try {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(rawContent);
    } catch (err) {
        logError(`Failed to parse JSON file "${filename}": ${err.message}`, filePath);
        return null;
    }
}

/**
 * ดึงชื่อไฟล์จาก Object หรือ String (พร้อม Smart Fallback)
 * @param {unknown} item 
 * @returns {string | null}
 */
function extractFilename(item) {
    if (!item) return null;
    if (typeof item === 'string') return path.basename(item);
    if (typeof item !== 'object') return null;

    // 1. ตรวจสอบตาม Candidate Keys หลักก่อน
    for (const key of CANDIDATE_KEYS) {
        const val = item[key];
        if (val && typeof val === 'string') {
            return path.basename(val);
        }
    }

    // 2. Smart Fallback: วนลูปเช็ค Property ทั้งหมดที่ลงท้ายด้วย นามสกุลไฟล์ หรือ Key ที่มี _url
    for (const [key, val] of Object.entries(item)) {
        if (typeof val === 'string' && val.trim().length > 0) {
            const ext = path.extname(val).toLowerCase();
            if (KNOWN_MEDIA_EXTENSIONS.has(ext) || key.endsWith('_url') || key.endsWith('_path')) {
                return path.basename(val);
            }
        }
    }

    return null;
}

// ==========================================
// 4. ASSET SPECIFICATIONS (Strategy Pattern)
// ==========================================

/**
 * @typedef {Object} AssetSpec
 * @property {string} name
 * @property {string} dir
 * @property {string} jsonFile
 * @property {string} [fallbackJson]
 * @property {Set<string>} ignoredFiles
 * @property {((data: unknown) => Set<string>) | null} [customResolver]
 */

/** @type {AssetSpec[]} */
const ASSET_SPECS = [
    {
        name: 'Character Images',
        dir: path.join(PATHS.assetsBase, 'characters'),
        jsonFile: 'characters.json',
        ignoredFiles: new Set(['_contact_sheet.webp', '.DS_Store']),
    },
    {
        name: 'Character Silhouettes',
        dir: path.join(PATHS.assetsBase, 'character_silhouette'),
        jsonFile: 'silhouettes.json',
        fallbackJson: 'characters.json',
        ignoredFiles: new Set(['_contact_sheet_silhouette.webp', '_contact_sheet.webp', '.DS_Store']),
        customResolver: (data) => {
            const expected = new Set();
            if (Array.isArray(data)) {
                data.forEach((item) => {
                    const fname = extractFilename(item);
                    if (fname) expected.add(fname);
                });
            }

            if (expected.size === 0) {
                const charData = loadJson('characters.json');
                if (Array.isArray(charData)) {
                    charData.forEach((char) => {
                        if (char.image) {
                            const baseName = path.parse(char.image).name;
                            expected.add(`${baseName}_cutout_silhouette.webp`);
                        }
                    });
                }
            }
            return expected;
        }
    },
    {
        name: 'Releases Audio',
        dir: path.join(PATHS.assetsBase, 'audio', 'releases'),
        jsonFile: 'releases.json',
        ignoredFiles: new Set(['.DS_Store']),
    },
    {
        name: 'Songs Audio',
        dir: path.join(PATHS.assetsBase, 'audio', 'songs'),
        jsonFile: 'songs.json',
        ignoredFiles: new Set(['.DS_Store']),
    }
];

// ==========================================
// 5. CORE VALIDATION ENGINE
// ==========================================

/**
 * ตรวจสอบความถูกต้องของ Asset แต่ละประเภท
 * @param {AssetSpec} spec 
 * @returns {{ name: string, totalExpected: number, missing: string[], errorCount: number }}
 */
function validateCategory(spec) {
    console.log(`\n📁 Checking [${fmt.bold(spec.name)}] in: ${fmt.cyan(spec.dir)}`);

    const result = {
        name: spec.name,
        totalExpected: 0,
        missing: [],
        errorCount: 0,
    };

    // 1. ตรวจสอบว่า Directory มีอยู่จริงหรือไม่
    if (!fs.existsSync(spec.dir)) {
        logError(`Directory missing: ${spec.dir}`);
        result.errorCount++;
        return result;
    }

    // 2. โหลดข้อมูล JSON (พร้อม Fallback)
    let rawData = loadJson(spec.jsonFile);
    if (!rawData && spec.fallbackJson) {
        rawData = loadJson(spec.fallbackJson);
    }

    if (!rawData) {
        logWarning(`No data found in ${spec.jsonFile} or fallback.`);
        return result;
    }

    // 3. คำนวณรายการไฟล์ที่คาดหวัง (Expected Files)
    let expectedFiles = new Set();
    if (spec.customResolver) {
        expectedFiles = spec.customResolver(rawData);
    } else if (Array.isArray(rawData)) {
        rawData.forEach((item) => {
            const fname = extractFilename(item);
            if (fname) expectedFiles.add(fname);
        });
    }

    result.totalExpected = expectedFiles.size;

    // 4. ตรวจสอบไฟล์บน Disk
    expectedFiles.forEach((filename) => {
        if (spec.ignoredFiles.has(filename)) return;

        const targetPath = path.join(spec.dir, filename);
        if (!fs.existsSync(targetPath)) {
            result.missing.push(filename);
            logError(`Missing asset: ${filename}`, targetPath);
        }
    });

    // 5. รายงานผลลัพธ์ย่อยประจำหมวด
    if (result.missing.length === 0) {
        console.log(`  ${fmt.green('✅')} All ${result.totalExpected} expected assets verified.`);
    } else {
        logWarning(`Missing ${result.missing.length} / ${result.totalExpected} assets.`);
    }

    return result;
}

// ==========================================
// 6. MAIN EXECUTION ENTRYPOINT
// ==========================================

function runPipeline() {
    console.log(fmt.bold('🚀 Asset Integrity Pipeline Initialization...\n'));

    const summaries = ASSET_SPECS.map(validateCategory);

    const totalMissing = summaries.reduce((sum, item) => sum + item.missing.length, 0);
    const totalErrors = summaries.reduce((sum, item) => sum + item.errorCount, 0);
    const overallFailures = totalMissing + totalErrors;

    console.log('\n' + '='.repeat(50));
    console.log(fmt.bold('📊 ASSET CHECK SUMMARY'));
    console.log('='.repeat(50));

    summaries.forEach((s) => {
        const status = s.missing.length === 0 && s.errorCount === 0 
            ? fmt.green('PASS') 
            : fmt.red('FAIL');
        console.log(`- ${s.name.padEnd(25)} : [${status}] (${s.missing.length} missing / ${s.totalExpected} total)`);
    });

    console.log('-'.repeat(50));

    if (overallFailures > 0) {
        console.error(`\n${fmt.red('💥 BUILD FAILED:')} Found ${overallFailures} asset validation issue(s).`);
        process.exitCode = 1;
    } else {
        console.log(`\n${fmt.green('🎉 BUILD SUCCESS:')} All static assets are present and validated.`);
    }
}

// Execute Script
runPipeline();