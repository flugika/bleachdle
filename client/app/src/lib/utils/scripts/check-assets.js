// npx tsx check-assets.js

import fs from 'fs';
import path from 'path';
import { getCharacters } from '../character.ts'; // ปรับ path ตามโปรเจกต์คุณ

const ASSETS_DIR = path.resolve(process.cwd(), '../../../../../public/assets/characters');

function checkAssets() {
    const characters = getCharacters();
    const missingFiles = [];

    console.log(`🔍 Checking image files for ${characters.length} characters...`);

    characters.forEach((char) => {
        const filePath = path.join(ASSETS_DIR, char.image);

        if (!fs.existsSync(filePath)) {
            missingFiles.push(`❌ [404] File not found: ${char.image} (Character: ${char.name})`);
        }
    });

    if (missingFiles.length > 0) {
        console.log('\n--- Missing Files Summary ---');
        missingFiles.forEach(err => console.error(err));
        console.log(`\n⚠️ Total missing files found: ${missingFiles.length}`);
    } else {
        console.log('\n✅ Congratulations! All character images are present.');
    }
}

checkAssets();