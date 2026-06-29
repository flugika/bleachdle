import fs from 'fs';
import path from 'path';

// 1. ระบุ Root ของโปรเจกต์ (ปรับจูนตามโครงสร้างจริงของคุณ)
// ถ้าไฟล์นี้อยู่ที่ src/lib/utils/scripts ต้องถอยหลังกลับไป 5 ระดับถึงจะเจอ Root ของ app
const projectRoot = path.resolve(process.cwd(), '../../../../../');

// 2. ระบุโฟลเดอร์ Assets และ Data
const ASSETS_DIR = path.join(projectRoot, 'public', 'assets');
const OUTPUT_DIR = path.join(projectRoot, 'app', 'src', 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'wallpapers.json');

// 3. ตรวจสอบและสร้างโฟลเดอร์ data ถ้ายังไม่มี (สำคัญมาก!)
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 4. กรองไฟล์
const files = fs.readdirSync(ASSETS_DIR).filter(file =>
    file.startsWith('bg_wallpaper_') && file.endsWith('.jpg')
);

// 5. สร้างข้อมูล
const data = {
    count: files.length,
    files: files
};

// 6. บันทึกไฟล์
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

console.log(`✅ Success! Found ${files.length} wallpapers.`);
console.log(`📍 File saved to: ${OUTPUT_PATH}`);