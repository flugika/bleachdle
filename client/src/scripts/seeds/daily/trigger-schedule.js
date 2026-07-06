// npx tsx --env-file=.env src/scripts/seeds/daily/trigger-schedule.js

import { supabaseClient } from '@/src/lib/supabase/supabase-client';

async function triggerDatabaseSchedule() {
    try {
        console.log('📡 RPC Trigger: Invoking "generate_daily_schedule" function inside Supabase...');

        // Execute PostgreSQL function remotely via Remote Procedure Call (RPC)
        const { data, error } = await supabaseClient.rpc('generate_daily_schedule');

        if (error) {
            throw error;
        }

        console.log('\n================================================================');
        console.log(`🎉 Database Response: ${data}`);
        console.log('================================================================');

    } catch (err) {
        console.error('\n❌ Critical Error during RPC execution:');
        console.error(err.message || err);
    }
}

triggerDatabaseSchedule();