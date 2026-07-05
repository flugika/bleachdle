// npx tsx --env-file=.env src/scripts/seeds/daily/seed-characters.js

import { supabase } from '@/src/lib/supabase/supabase'
import fs from 'fs';
import path from 'path';

async function seedCharacters() {
    try {
        // 2. Resolve JSON file path safely for ES Modules
        const jsonPath = path.resolve('src/data/characters.json');

        if (!fs.existsSync(jsonPath)) {
            throw new Error(`File not found: characters.json at location "${jsonPath}". Please ensure the file exists in the root directory.`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const characters = JSON.parse(rawData);

        console.log(`📡 Connecting to Supabase... Preparing to upload ${characters.length} characters.`);

        // 3. Bulk Insert into 'characters' table
        const { data, error } = await supabase
            .from('characters')
            .insert(characters)
            .select('id, name');

        if (error) {
            throw error;
        }

        console.log(`\n🎉 Success! Successfully inserted ${data.length} characters into the database.`);
        console.log(`📌 Sample Data [Index 0]: ${data[0].name} (ID: ${data[0].id})`);

    } catch (err) {
        console.error('\n❌ Critical Error during seeding process:');
        console.error(err.message || err);
    }
}

seedCharacters();