// src/scripts/seeds/lib/supabase-admin.ts
// ⚠️ ใช้เฉพาะใน standalone Node scripts (seed/migration) เท่านั้น
// ห้าม import ไฟล์นี้จากภายใน Next.js app (route/component ใดๆ)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. ' +
        'Seed scripts require the service role key to bypass RLS.'
    );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
});