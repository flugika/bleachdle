// app/(home)/page.tsx
import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { getTodayStr } from '@/src/lib/utils/format';
import HomePageClient from './HomePageClient';

// 🛡️ Cache HTML ของหน้านี้ทั้งหน้าไว้ 60 วินาที 
// (มีคนเข้าเว็บแสนคนใน 1 นาที ก็จะดึง Supabase แค่ 1 ครั้ง!)
export const revalidate = 60; 

export default async function Home() {
    const date = getTodayStr();
    
    // 💡 ดึงข้อมูลตรงๆ บน Server เลย ไม่ต้องยิง API fetch
    const { data, error } = await supabaseServer.rpc('get_daily_stats', { p_date: date });
    
    const initialStats = (!error && data) ? data : {};

    // 🚀 โยนข้อมูลที่ดึงเสร็จแล้ว ลงไปให้ Client Component เอาไปวาด UI ทันที
    // ส่ง `date` ต่อเป็น dateKey ให้ usePhenomenonState ด้วย เพื่อให้ hero
    // phenomenon กับ daily stats อ้างอิงวันเดียวกันเป๊ะๆ ไม่มีโอกาสเพี้ยน
    // ตอนใกล้เที่ยงคืน (server cutover กับ client local date คนละวันกัน)
    return <HomePageClient initialStats={initialStats} dateKey={date} />;
}