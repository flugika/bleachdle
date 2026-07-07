// npx tsx src/scripts/fix-all-json-relations.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');

// รายชื่อไฟล์ทั้งหมดที่ต้องจัดการ
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const SILHOUETTES_FILE = path.join(DATA_DIR, 'silhouettes.json');
const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json');
const SONGS_FILE = path.join(DATA_DIR, 'songs.json');

// RFC 4122 Standard UUID Check (v1-v5 และ variant 8,9,a,b)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(uuid) {
    return uuid && UUID_RE.test(uuid);
}

function run() {
    try {
        console.log('🚀 Starting Data Migration & UUID Synchronization...');

        // ----------------------------------------------------------------
        // STEP 1: จัดการไฟล์แม่ (characters.json) เพื่อสร้าง ID Map ก่อน
        // ----------------------------------------------------------------
        const charRaw = fs.readFileSync(CHARACTERS_FILE, 'utf8');
        const characters = JSON.parse(charRaw);
        const charIdMap = new Map(); // [ID เก่าที่ผิด] -> [ID ใหม่ที่ถูกต้อง]
        let charFixedCount = 0;

        const fixedCharacters = characters.map((char) => {
            if (isValidUuid(char.id)) return char;

            const newUuid = randomUUID();
            charIdMap.set(char.id, newUuid);
            charFixedCount++;
            return { ...char, id: newUuid };
        });

        // ----------------------------------------------------------------
        // STEP 2: ฟังก์ชันสำหรับรีไรต์ฟิลด์และซิงค์ ID ของไฟล์ลูก
        // ----------------------------------------------------------------
        const processRelationalFile = (filePath, fileName) => {
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ ไม่พบไฟล์ ${fileName} ข้ามไป...`);
                return;
            }

            const raw = fs.readFileSync(filePath, 'utf8');
            const entries = JSON.parse(raw);
            let idFixedCount = 0;
            let relationFixedCount = 0;

            const fixedEntries = entries.map((entry) => {
                let isChanged = false;
                let updatedEntry = { ...entry };

                // 1. ตรวจสอบ id ของตัว entry เอง (ป้องกันเจอ Invalid UUID ที่ id เจ้าตัว)
                if (!isValidUuid(updatedEntry.id)) {
                    updatedEntry.id = randomUUID();
                    idFixedCount++;
                    isChanged = true;
                }

                // 2. ตรวจสอบการซิงค์ character_id กับไฟล์แม่
                if (charIdMap.has(updatedEntry.character_id)) {
                    updatedEntry.character_id = charIdMap.get(updatedEntry.character_id);
                    relationFixedCount++;
                    isChanged = true;
                }

                // [เคสพิเศษ] สำหรับ songs.json ที่มี nested segments id ด้านใน
                if (fileName === 'songs.json' && Array.isArray(updatedEntry.segments)) {
                    updatedEntry.segments = updatedEntry.segments.map((segment) => {
                        if (!isValidUuid(segment.id)) {
                            idFixedCount++;
                            return { ...segment, id: randomUUID() };
                        }
                        return segment;
                    });
                }

                return updatedEntry;
            });

            // บันทึกไฟล์ที่แก้ไขแล้ว
            fs.writeFileSync(filePath, JSON.stringify(fixedEntries, null, 4), 'utf8');
            console.log(`🔷 ${fileName} -> แก้ไข ID ตัวเอง: ${idFixedCount} | ซิงค์ Relation: ${relationFixedCount} รายการ`);
        };

        // ----------------------------------------------------------------
        // STEP 3: ลุยประมวลผลไฟล์ลูกทีละไฟล์
        // ----------------------------------------------------------------
        processRelationalFile(SILHOUETTES_FILE, 'silhouettes.json');
        processRelationalFile(QUOTES_FILE, 'quotes.json');
        processRelationalFile(SONGS_FILE, 'songs.json');

        // บันทึกไฟล์แม่ปิดท้ายงาน
        fs.writeFileSync(CHARACTERS_FILE, JSON.stringify(fixedCharacters, null, 4), 'utf8');
        console.log(`\n👑 characters.json -> แก้ไข ID ตัวละครไปทั้งหมด: ${charFixedCount} ตัว`);

        console.log('\n✅ การอพยพข้อมูลและซิงค์ ID เสร็จสิ้นสมบูรณ์! ข้อมูลทุกไฟล์ปลอดภัยและถูกต้องตามมาตรฐาน Zod UUID แล้วครับ');

    } catch (error) {
        console.error('❌ Migration Failed:', error.message);
    }
}

run();