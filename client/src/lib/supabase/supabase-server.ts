import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Warning: Missing SUPABASE_SERVICE_ROLE_KEY in environment variables');
    }
}

// รวม Fallback ค่าหลอกไว้ เพื่อไม่ให้ next build หรือ CI พังขณะ Compile Static Pages
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        persistSession: false, // ปิด Session Persistence สำหรับ Server-side Service Role
    },
});