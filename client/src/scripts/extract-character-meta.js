// npx tsx src/scripts/extract-character-meta.js

import fs from 'fs';
import path from 'path';

// ใช้ path.resolve เพื่อความชัวร์เรื่องตำแหน่งไฟล์
const inputPath = path.resolve('app/src/data/characters.json');
const outputPath = path.resolve('app/src/data/characters-meta.json');

const rawData = fs.readFileSync(inputPath, 'utf8');
const characters = JSON.parse(rawData);

// ฟังก์ชันสำหรับแปลงชื่อให้เป็นรูปแบบไฟล์
const convertNameToImage = (name) => {
    // ใช้ regex /\s+/g เพื่อหาช่องว่างหนึ่งช่องหรือมากกว่า แล้วแทนที่ด้วย _
    return name.replace(/\s+/g, '_');
};

const metaData = characters.map(char => ({
    id: char.id,
    name: char.name,
    image: `${convertNameToImage(char.name)}.webp` // เพิ่ม .webp ต่อท้ายเพื่อให้พร้อมใช้งานใน public/assets
}));

fs.writeFileSync(outputPath, JSON.stringify(metaData, null, 2));
console.log('✅ Metadata extracted successfully with image mapping!');