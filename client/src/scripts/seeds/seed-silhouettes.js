// npx tsx --env-file=.env src/scripts/seeds/seed-silhouettes.js

import { supabaseClient } from '@/src/lib/supabase/supabase-client'
import fs from 'fs';
import path from 'path';

async function seedSilhouettes() {
    try {
        // 2. Resolve JSON file path safely for ES Modules
        const jsonPath = path.resolve('src/data/silhouettes.json');

        if (!fs.existsSync(jsonPath)) {
            throw new Error(`File not found: silhouettes.json at location "${jsonPath}". Please ensure the file exists in the root directory.`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const silhouettes = JSON.parse(rawData);

        console.log(`📡 Connecting to Supabase... Preparing to upload ${silhouettes.length} silhouettes.`);

        // 3. Bulk Insert into 'silhouettes' table
        const { data, error } = await supabaseClient
            .from('silhouettes')
            .insert(silhouettes)
            .select('id, character_id, image');

        if (error) {
            throw error;
        }

        console.log(`\n🎉 Success! Successfully inserted ${data.length} silhouettes into the database.`);
        console.log(`📌 Sample Data [Index 0]: "${data[0].image}" (Character ID: ${data[0].character_id})`);

    } catch (err) {
        console.error('\n❌ Critical Error during seeding process:');
        console.error(err.message || err);
    }
}

seedSilhouettes();