// npx tsx src/scripts/fix-duplicate-ids.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// 1. สร้าง __dirname ขึ้นมาใช้ใน ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. กำหนด Path ชี้ไปที่โฟลเดอร์ src/data
const DATA_DIR = path.join(__dirname, '../data');
const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json');

function run() {
    try {
        // 3. อ่านข้อมูลจากไฟล์ JSON
        const quotesData = fs.readFileSync(QUOTES_FILE, 'utf8');
        const quotes = JSON.parse(quotesData);

        // 4. นับจำนวนการเจอของแต่ละ id (เพื่อรู้ว่าตัวไหนซ้ำ)
        const idOccurrences = new Map(); // id -> count
        quotes.forEach(q => {
            if (!q.id) return;
            idOccurrences.set(q.id, (idOccurrences.get(q.id) || 0) + 1);
        });

        // 5. วนลูป: ตัวแรกของ id ที่ซ้ำให้คงเดิม ตัวที่เหลือ (ลำดับที่ 2 เป็นต้นไป) ได้ UUID ใหม่
        const seenOnce = new Set(); // id ที่เจอไปแล้วอย่างน้อย 1 ครั้ง
        const remapLog = []; // เก็บ mapping เก่า -> ใหม่ สำหรับ debug/ตามแก้ reference
        let duplicateCount = 0;

        const updatedQuotes = quotes.map(quote => {
            const currentId = quote.id;

            if (!currentId) {
                console.warn('⚠️ พบ quote ที่ไม่มี id เลย:', quote);
                return quote;
            }

            const totalCount = idOccurrences.get(currentId);
            const isDuplicateId = totalCount > 1;

            if (!isDuplicateId) {
                return quote; // id ไม่ซ้ำ ไม่ต้องแตะ
            }

            if (!seenOnce.has(currentId)) {
                // เจอครั้งแรกของ id ที่ซ้ำ -> ให้คงค่าเดิมไว้ (ตัวตั้งต้น)
                seenOnce.add(currentId);
                return quote;
            }

            // เจอซ้ำครั้งที่ 2 เป็นต้นไป -> สุ่ม UUID ใหม่
            const newId = randomUUID();
            duplicateCount++;
            remapLog.push({ old_id: currentId, new_id: newId, quote_text: quote.quote ?? quote.text ?? null });

            return {
                ...quote,
                id: newId,
            };
        });

        // 6. บันทึกไฟล์เดิม (เขียนทับ quotes.json)
        fs.writeFileSync(QUOTES_FILE, JSON.stringify(updatedQuotes, null, 4), 'utf8');

        console.log('✅ ประมวลผลเสร็จสิ้นและเขียนทับไฟล์เดิมแล้ว!');
        console.log(`id ที่ซ้ำและถูกสุ่มใหม่: ${duplicateCount} รายการ`);
        console.log(`ไฟล์ที่อัปเดต: ${QUOTES_FILE}`);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
}

run();