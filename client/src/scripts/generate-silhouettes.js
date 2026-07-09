// npx tsx src/scripts/generate-silhouettes.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const SILHOUETTES_FILE = path.join(DATA_DIR, 'silhouettes.json');

// 🖼️ รูป silhouette อยู่ที่ /assets/character_silhouette/ ทั้งหมด
// ชื่อไฟล์จริง = {ชื่อ}_cutout_silhouette.webp เช่น Aisslinger_Wernarr_cutout_silhouette.webp
// char.image ใช้ร่วมกับ /assets/characters/ (คนละโฟลเดอร์) เผื่อมีนามสกุลติดมาแล้วต้องตัดทิ้งก่อน กัน double extension
function toSilhouetteFilename(baseImage) {
    const withoutExt = baseImage.replace(/\.(webp|png|jpe?g)$/i, '');
    return `${withoutExt}_cutout_silhouette.webp`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function run() {
    try {
        const charactersData = fs.readFileSync(CHARACTERS_FILE, 'utf8');
        const characters = JSON.parse(charactersData);

        let existingSilhouettes = [];
        if (fs.existsSync(SILHOUETTES_FILE)) {
            const raw = fs.readFileSync(SILHOUETTES_FILE, 'utf8').trim();
            if (raw) existingSilhouettes = JSON.parse(raw);
        }

        const existingMap = new Map(existingSilhouettes.map(s => [s.character_id, s]));

        let createdCount = 0;
        let keptCount = 0;
        let backfilledIdCount = 0; // 🆕 entry เก่าก่อนมี field id เลยเติมให้ระหว่างทาง

        const nextSilhouettes = characters.map(char => {
            const existing = existingMap.get(char.id);

            if (existing) {
                keptCount++;
                if (!existing.id || !UUID_RE.test(existing.id)) {
                    backfilledIdCount++;
                    return { id: randomUUID(), ...existing };
                }
                return existing;
            }

            createdCount++;
            return {
                id: randomUUID(),                          // 🆕 primary key ของ entry
                character_id: char.id,
                image: toSilhouetteFilename(char.image),    // 🆕 baked-in filename เต็ม พร้อม suffix จริง
            };
        });

        const currentCharacterIds = new Set(characters.map(c => c.id));
        const orphanedCount = existingSilhouettes.filter(s => !currentCharacterIds.has(s.character_id)).length;

        fs.writeFileSync(SILHOUETTES_FILE, JSON.stringify(nextSilhouettes, null, 4), 'utf8');

        console.log('✅ ประมวลผลเสร็จสิ้น เขียนไฟล์ silhouettes.json แล้ว!');
        console.log(`สร้างใหม่ (id + default focus/scale): ${createdCount} รายการ`);
        console.log(`คงค่าเดิมไว้: ${keptCount} รายการ`);
        if (backfilledIdCount > 0) console.log(`🆕 เติม id ให้ entry เก่า: ${backfilledIdCount} รายการ`);
        if (orphanedCount > 0) console.warn(`⚠️ พบ ${orphanedCount} entry orphan (character_id ไม่ตรง characters.json ปัจจุบัน) — ถูกตัดออก`);
        console.log(`ไฟล์ที่อัปเดต: ${SILHOUETTES_FILE}`);
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
}

run();