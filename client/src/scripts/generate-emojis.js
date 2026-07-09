// Scaffold (mock-friendly):  npx tsx src/scripts/generate-emojis.js
// Commit (swap name -> id):  npx tsx src/scripts/generate-emojis.js --commit

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const EMOJIS_FILE = path.join(DATA_DIR, 'emojis.json');
const EMOJIS_BACKUP_FILE = path.join(DATA_DIR, 'emojis.backup.json');
const EMOJI_LIST_FILE = path.join(DATA_DIR, 'emoji-list.json');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMOJI_COUNT = 4;

const PLACEHOLDER_EMOJI = ['❓', '❓', '❓', '❓'];
const REF_ID_FIELD = '_character_ref_id';

function resolveRealCharacterId(entry, validCharacterIds) {
    if (entry[REF_ID_FIELD] && validCharacterIds.has(entry[REF_ID_FIELD])) {
        return entry[REF_ID_FIELD];
    }
    if (entry.character_id && validCharacterIds.has(entry.character_id)) {
        return entry.character_id;
    }
    return null;
}

function loadEmojiSets() {
    if (!fs.existsSync(EMOJIS_FILE)) return [];
    const raw = fs.readFileSync(EMOJIS_FILE, 'utf8').trim();
    return raw ? JSON.parse(raw) : [];
}

function loadCharacters() {
    const charactersData = fs.readFileSync(CHARACTERS_FILE, 'utf8');
    return JSON.parse(charactersData);
}

// ─────────────────────────────────────────────────────────────
// 🆕 ฟังก์ชันดูดข้อมูลจาก emoji-list.json (ปรับปรุงการเทียบชื่อให้ยืดหยุ่นขึ้น)
// ─────────────────────────────────────────────────────────────
function applyCuratedEmojis(emojiSets) {
    if (!fs.existsSync(EMOJI_LIST_FILE)) return emojiSets;

    const raw = fs.readFileSync(EMOJI_LIST_FILE, 'utf8');
    const curatedMap = new Map();

    // Regex ค้นหาชื่อและ Array อีโมจิ
    const blockRegex = /(?:"([^"]+)"|([^:\n]+))\s*:\s*\[([\s\S]*?)\]/g;
    let match;

    while ((match = blockRegex.exec(raw)) !== null) {
        // ดึงชื่อออกมา ลบเครื่องหมายคำพูดส่วนเกินออกถ้ามี
        let name = (match[1] || match[2]).trim();
        name = name.replace(/^["']|["']$/g, '').trim();

        const content = match[3];
        // ดึงเอาเฉพาะตัว emoji ข้างในเครื่องหมายคำพูด
        const emojis = [...content.matchAll(/"([^"]+)"/g)].map(m => m[1]);

        if (emojis.length > 0) {
            // เพื่อความชัวร์: ใช้ คีย์เป็นตัวพิมพ์เล็ก (Normalized Key) เพื่อให้แมตช์ง่ายขึ้น
            curatedMap.set(name.toLowerCase(), emojis);
        }
    }

    if (curatedMap.size === 0) {
        console.warn(`⚠️ ไม่สามารถดึงข้อมูลอีโมจิจากไฟล์ emoji-list.json ได้เลย ตรวจสอบฟอร์แมตไฟล์อีกครั้ง`);
        return emojiSets;
    }

    console.log(`📥 เจอข้อมูลเตรียมไว้ใน emoji-list.json จำนวน ${curatedMap.size} ตัวละคร`);
    let appliedCount = 0;

    const updatedSets = emojiSets.map(entry => {
        // ชื่อตัวละครจากฟิลด์ character_id (ตอนอยู่ในโหมด Scaffold จะเป็นชื่อ เช่น "Orihime Inoue")
        const currentName = String(entry.character_id || '').trim().toLowerCase();

        if (curatedMap.has(currentName)) {
            appliedCount++;
            return { ...entry, emoji_list: curatedMap.get(currentName) };
        }
        return entry;
    });

    console.log(`✨ ยัด Emoji ใส่สำเร็จ ${appliedCount} รายการ\n`);
    return updatedSets;
}

// ─────────────────────────────────────────────────────────────
// SCAFFOLD MODE
// ─────────────────────────────────────────────────────────────
function runScaffold() {
    const characters = loadCharacters();
    const validCharacterIds = new Set(characters.map(c => c.id));
    const existingEmojiSets = loadEmojiSets();

    const existingMap = new Map();
    for (const entry of existingEmojiSets) {
        const realId = resolveRealCharacterId(entry, validCharacterIds);
        if (realId) existingMap.set(realId, entry);
    }

    let createdCount = 0;
    let keptCount = 0;
    let backfilledIdCount = 0;
    let fixedLengthCount = 0;
    let renamedCount = 0;
    const needsCuration = [];

    const nextEmojiSets = characters.map(char => {
        const existing = existingMap.get(char.id);

        if (existing) {
            keptCount++;
            let list = Array.isArray(existing.emoji_list) ? [...existing.emoji_list] : [];
            if (list.length !== EMOJI_COUNT) {
                fixedLengthCount++;
                while (list.length < EMOJI_COUNT) list.push('❓');
                list = list.slice(0, EMOJI_COUNT);
            }

            const isPlaceholder = list.every(e => e === '❓');
            if (isPlaceholder) needsCuration.push(char.name);

            const hasValidId = existing.id && UUID_RE.test(existing.id);
            if (!hasValidId) backfilledIdCount++;

            if (existing.character_id !== char.name) renamedCount++;

            return {
                id: hasValidId ? existing.id : randomUUID(),
                character_id: char.name,
                [REF_ID_FIELD]: char.id,
                emoji_list: list,
            };
        }

        createdCount++;
        needsCuration.push(char.name);
        return {
            id: randomUUID(),
            character_id: char.name,
            [REF_ID_FIELD]: char.id,
            emoji_list: [...PLACEHOLDER_EMOJI],
        };
    });

    const orphanedCount = existingEmojiSets.filter(e => !resolveRealCharacterId(e, validCharacterIds)).length;

    fs.writeFileSync(EMOJIS_FILE, JSON.stringify(nextEmojiSets, null, 4), 'utf8');

    console.log('✅ ประมวลผลเสร็จสิ้น เขียนไฟล์ emojis.json แล้ว! (MOCK MODE)');
    console.log(`สร้างใหม่: ${createdCount} | คงเดิม: ${keptCount}`);
    if (orphanedCount > 0) console.warn(`⚠️ พบ ${orphanedCount} entry orphan — ถูกตัดออก`);
    if (needsCuration.length > 0) {
        console.warn(`\n📝 ต้อง curate emoji_list เอง จำนวน ${needsCuration.length} ตัวละคร`);
    }
    console.log(`\n⚠️ ไฟล์นี้ยังใช้เล่นจริงไม่ได้ — ให้โยนข้อมูลลง emoji-list.json แล้วรัน --commit`);
}

// ─────────────────────────────────────────────────────────────
// COMMIT MODE
// ─────────────────────────────────────────────────────────────
function runCommit() {
    const characters = loadCharacters();
    const validCharacterIds = new Set(characters.map(c => c.id));
    const nameById = new Map(characters.map(c => [c.id, c.name]));

    let existingEmojiSets = loadEmojiSets();
    if (existingEmojiSets.length === 0) {
        console.warn('⚠️ emojis.json ว่างเปล่าหรือไม่พบไฟล์ — ไม่มีอะไรให้ commit');
        return;
    }

    // 🛟 backup ไว้ก่อน
    fs.writeFileSync(EMOJIS_BACKUP_FILE, JSON.stringify(existingEmojiSets, null, 4), 'utf8');

    // 1. นำข้อมูลจาก emoji-list.json มาแมตช์และอัปเดตลงตระกูลสแกฟโฟลด์ก่อน
    existingEmojiSets = applyCuratedEmojis(existingEmojiSets);

    let committedCount = 0;
    let alreadyCommittedCount = 0;
    let unresolvedCount = 0;
    let skippedPlaceholderCount = 0;
    const removedNames = [];

    // 2. คัดกรอง: ตัวไหนที่อัปเดตแล้ว แต่ยังคงเป็น ❓ ทั้งหมด (ไม่ได้รับการอัปเดตจากขั้นตอนที่ 1) ให้คัดออก
    const filteredSets = existingEmojiSets.filter(entry => {
        const list = Array.isArray(entry.emoji_list) ? entry.emoji_list : [];
        const isPlaceholder = list.every(e => e === '❓') || list.length === 0;

        if (isPlaceholder) {
            skippedPlaceholderCount++;
            const realId = resolveRealCharacterId(entry, validCharacterIds);
            if (realId) {
                removedNames.push(nameById.get(realId) || realId);
            }
            return false;
        }
        return true;
    });

    // 3. แปลงโครงสร้างเปลี่ยนจากชื่อตัวละครมาใช้ _character_ref_id (UUID จริง)
    const committed = filteredSets.map(entry => {
        const realId = resolveRealCharacterId(entry, validCharacterIds);

        if (!realId) {
            unresolvedCount++;
            console.warn(`⚠️ ข้าม entry id=${entry.id} — หา real character_id ไม่เจอ`);
            return entry;
        }

        const hadRefField = Object.prototype.hasOwnProperty.call(entry, REF_ID_FIELD);
        if (hadRefField) committedCount++;
        else alreadyCommittedCount++;

        const { [REF_ID_FIELD]: _drop, ...rest } = entry;
        return { ...rest, character_id: realId };
    });

    fs.writeFileSync(EMOJIS_FILE, JSON.stringify(committed, null, 4), 'utf8');

    console.log('✅ Commit เสร็จสิ้น — นำเข้า Emoji, ลบตัวที่ยังไม่พร้อม และสลับกลับเป็น UUID แล้ว');
    console.log(`ประมวลผลเป็น real id สำเร็จ: ${committedCount} รายการ`);

    if (skippedPlaceholderCount > 0) {
        console.log(`\n🛑 ตัดข้อมูลที่เป็น placeholder ❓ ออกชั่วคราว: ${skippedPlaceholderCount} รายการ`);
        if (removedNames.length <= 10) {
            console.log(`[ ${removedNames.join(', ')} ]`);
        } else {
            console.log(`(ซ่อนรายชื่อที่เหลือเนื่องจากยาวเกินไป...)`);
        }
    }
}

function run() {
    try {
        const isCommit = process.argv.includes('--commit');
        if (isCommit) {
            runCommit();
        } else {
            runScaffold();
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
}

run();