// npx tsx --env-file=.env src/scripts/seeds/seed-emojis.js

import { supabaseClient } from '@/src/lib/supabase/supabase-client'
import fs from 'fs';
import path from 'path';

async function seedEmojis() {
    try {
        // 2. Resolve JSON file path safely for ES Modules
        const jsonPath = path.resolve('src/data/emojis.json');

        if (!fs.existsSync(jsonPath)) {
            throw new Error(`File not found: emojis.json at location "${jsonPath}". Please ensure the file exists in the root directory.`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const emojiSets = JSON.parse(rawData);

        // 🛡️ กันเคสข้อมูลพังก่อนยิงขึ้น Supabase — emoji_list ต้องมีเป๊ะ 4 ตัวเสมอ
        // (เหมือน EmojiSetSchema ฝั่ง app แต่เช็คแบบเบาๆ ไม่พึ่ง zod ในสคริปต์ seed)
        const invalidSets = emojiSets.filter(
            (set) => !Array.isArray(set.emoji_list) || set.emoji_list.length !== 4
        );

        if (invalidSets.length > 0) {
            throw new Error(
                `Found ${invalidSets.length} emoji set(s) with invalid emoji_list (must be exactly 4 emojis). ` +
                `Offending id(s): ${invalidSets.map(s => s.id).join(', ')}`
            );
        }

        console.log(`📡 Connecting to Supabase... Preparing to upload ${emojiSets.length} emoji sets.`);

        // 3. Bulk Insert into 'emojis' table (⚠️ table จริงชื่อ emojis ไม่ใช่ emoji_sets)
        const { data, error } = await supabaseClient
            .from('emojis')
            .insert(emojiSets)
            .select('id, character_id, emoji_list');

        if (error) {
            throw error;
        }

        console.log(`\n🎉 Success! Successfully inserted ${data.length} emoji sets into the database.`);
        console.log(`📌 Sample Data [Index 0]: ${data[0].emoji_list.join(' ')} (Character ID: ${data[0].character_id})`);

    } catch (err) {
        console.error('\n❌ Critical Error during seeding process:');
        console.error(err.message || err);
    }
}

seedEmojis();