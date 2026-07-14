-- เปิดใช้งาน extension สำหรับทำ cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ตั้งเวลาให้ระบบรันฟังก์ชันตรวจสอบและเจนคิวทุกวันเวลาเที่ยงคืน
SELECT cron.schedule(
    'daily-schedule-generator', -- ชื่อ Job
    '0 0 * * *',                -- เที่ยงคืนของทุกวัน (Cron Syntax)
    'SELECT generate_daily_schedule();'
);