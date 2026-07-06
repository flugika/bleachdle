// src/services/character.ts
import 'server-only'

import { supabaseServer } from '@/src/lib/supabase/supabase-server';
import { Character } from '@/src/entities/character/schema';

export async function getDailyCharacter() {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    // ระบุ Type ของผลลัพธ์จาก Supabase ให้ชัดเจน
    const { data, error } = await supabaseServer
        .from('daily_schedule')
        .select(`
            characters:character_id (
                id, name, gender, race, affiliation, height_cm, age, eye_color, 
                hair_color, first_appearance_chapter, weapon, release, 
                primary_ability, image
            )
        `)
        .eq('date', todayStr)
        .maybeSingle(); // ใช้ maybeSingle เพื่อดึงมาแค่ Object เดียว

    if (error || !data) return null;

    // Supabase จะคืนค่า characters ออกมาเป็น Array ถ้า relation เป็น one-to-many
    // เราต้องมั่นใจว่าเราดึงมาตัวเดียว (ใช้ [0])
    const characterData = Array.isArray(data.characters)
        ? data.characters[0]
        : data.characters;

    return characterData as Character | null;
}