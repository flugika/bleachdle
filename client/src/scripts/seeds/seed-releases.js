// npx tsx --env-file=.env src/scripts/seeds/seed-releases.js

import { supabaseClient } from '@/src/lib/supabase/supabase-client'
import fs from 'fs';
import path from 'path';

async function seedReleases() {
    try {
        const jsonPath = path.resolve('src/data/releases.json');

        if (!fs.existsSync(jsonPath)) {
            throw new Error(`File not found: releases.json at location "${jsonPath}". Please ensure the file exists in the root directory.`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const releases = JSON.parse(rawData);

        // 🛡️ Strip nested `character` ก่อน insert เผื่อ releases.json บางรายการดันมี field นี้
        // แนบมา (เช่น copy จาก getReleasableItems() output) — ตาราง `releases` เก็บแค่
        // character_id (FK) ไม่มีคอลัมน์ character เป็น jsonb ดังนั้นถ้าส่ง key นี้ไปด้วย
        // Supabase จะ error ทันที ("Could not find the 'character' column of 'releases'")
        const rows = releases.map(({ character, ...rest }) => rest);

        console.log(`📡 Connecting to Supabase... Preparing to upload ${rows.length} releases.`);

        const { data, error } = await supabaseClient
            .from('releases')
            .insert(rows)
            .select('id, character_id, technique_name, release_type');

        if (error) {
            throw error;
        }

        console.log(`\n🎉 Success! Successfully inserted ${data.length} releases into the database.`);
        console.log(`📌 Sample Data [Index 0]: "${data[0].technique_name}" (${data[0].release_type}, Character ID: ${data[0].character_id})`);

    } catch (err) {
        console.error('\n❌ Critical Error during seeding process:');
        console.error(err.message || err);
    }
}

seedReleases();