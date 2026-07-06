// npx tsx src/scripts/map-character-quote.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. สร้าง __dirname ขึ้นมาใช้ใน ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. กำหนด Path ชี้ไปที่โฟลเดอร์ src/data
// สคริปต์อยู่ที่ src/scripts/ ดังนั้นต้องถอยกลับไป 1 ขั้น (../) แล้วเข้า data/
const DATA_DIR = path.join(__dirname, '../data');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const SONGS_FILE = path.join(DATA_DIR, 'quotes.json');

function run() {
    try {
        // 3. อ่านข้อมูลจากไฟล์ JSON
        const charactersData = fs.readFileSync(CHARACTERS_FILE, 'utf8');
        const songsData = fs.readFileSync(SONGS_FILE, 'utf8');

        const characters = JSON.parse(charactersData);
        const songs = JSON.parse(songsData);

        // 4. สร้าง Map เพื่อเก็บคู่ของ "ชื่อแบบ slug" -> "UUID"
        const characterIdMap = new Map();

        characters.forEach(char => {
            if (char.name && char.id) {
                // แปลงชื่อเป็นตัวเล็กและเปลี่ยนช่องว่างเป็นขีดลบ
                const slug = char.name.toLowerCase().replace(/\s+/g, '-');
                characterIdMap.set(slug, char.id);
            }
        });

        // 5. วนลูปอัปเดตข้อมูลใน song.json
        let updatedCount = 0;
        let notFoundCount = 0;

        const updatedSongs = songs.map(song => {
            const currentId = song.character_id;
            const uuid = characterIdMap.get(currentId);

            if (uuid) {
                updatedCount++;
                // คืนค่า object เดิม แต่เปลี่ยน character_id เป็น UUID
                return {
                    ...song,
                    character_id: uuid
                };
            } else {
                notFoundCount++;
                console.warn(`⚠️ ไม่พบ UUID สำหรับตัวละคร: ${currentId}`);
                // ถ้าหาไม่เจอให้คงค่าเดิมไว้
                return song;
            }
        });

        // 6. บันทึกข้อมูลลง "ไฟล์เดิม" (เขียนทับ song.json)
        fs.writeFileSync(SONGS_FILE, JSON.stringify(updatedSongs, null, 4), 'utf8');

        console.log('✅ ประมวลผลเสร็จสิ้นและเขียนทับไฟล์เดิมแล้ว!');
        console.log(`อัปเดตสำเร็จ: ${updatedCount} รายการ`);
        console.log(`หาไม่พบ/ข้าม: ${notFoundCount} รายการ`);
        console.log(`ไฟล์ที่อัปเดต: ${SONGS_FILE}`);

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
}

run();