// npx tsx src/scripts/extract-character.js

import fs from 'fs';
import path from 'path';

// กำหนดตำแหน่งไฟล์
const filePath = path.resolve('app/src/data/characters.json');

// อ่านไฟล์
const rawData = fs.readFileSync(filePath, 'utf8');
const characters = JSON.parse(rawData);

// ฟังก์ชันแปลงชื่อเป็นชื่อไฟล์ (Space เป็น _)
const convertNameToImage = (name) => {
    return name.replace(/\s+/g, '_');
};

// Map ข้อมูลเดิมและเพิ่มฟิลด์ image เข้าไป
const updatedCharacters = characters.map(char => ({
    ...char, // ดึงข้อมูลเดิมมาทั้งหมด
    image: `${convertNameToImage(char.name)}.webp` // เพิ่มฟิลด์ใหม่
}));

// เขียนทับไฟล์เดิม (หรือเปลี่ยน outputPath ถ้าไม่อยากเขียนทับ)
fs.writeFileSync(filePath, JSON.stringify(updatedCharacters, null, 2));

console.log('✅ characters.json updated with image field successfully!');