import { createClient } from '@supabase/supabase-js';

// ตรวจสอบว่ามีตัวแปรเหล่านี้ใน .env ของคุณ
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Warning: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// สร้าง client สำหรับใช้งานใน Server
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);