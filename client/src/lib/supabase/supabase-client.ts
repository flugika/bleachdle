import { createClient } from '@supabase/supabase-js';

// ตรวจสอบว่ามีตัวแปรเหล่านี้ใน .env ของคุณ
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file!');
    console.error('Please verify that the environment variables are correctly defined and spelled.');
}

// สร้าง client สำหรับใช้งานใน Server
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);