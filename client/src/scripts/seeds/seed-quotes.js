// npx tsx --env-file=.env src/scripts/seeds/seed-quotes.js

import { supabaseClient } from '@/src/lib/supabase/supabase-client'
import fs from 'fs';
import path from 'path';

async function seedQuotes() {
    try {
        // 2. Resolve JSON file path safely for ES Modules
        const jsonPath = path.resolve('src/data/quotes.json');

        if (!fs.existsSync(jsonPath)) {
            throw new Error(`File not found: quotes.json at location "${jsonPath}". Please ensure the file exists in the root directory.`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const quotes = JSON.parse(rawData);

        console.log(`📡 Connecting to Supabase... Preparing to upload ${quotes.length} quotes.`);

        // 3. Bulk Insert into 'quotes' table
        const { data, error } = await supabaseClient
            .from('quotes')
            .insert(quotes)
            .select('id, character_id, text');

        if (error) {
            throw error;
        }

        console.log(`\n🎉 Success! Successfully inserted ${data.length} quotes into the database.`);
        console.log(`📌 Sample Data [Index 0]: "${data[0].text}" (Character ID: ${data[0].character_id})`);

    } catch (err) {
        console.error('\n❌ Critical Error during seeding process:');
        console.error(err.message || err);
    }
}

seedQuotes();