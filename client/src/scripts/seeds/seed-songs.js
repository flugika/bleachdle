// npx tsx --env-file=.env src/scripts/seeds/seed-songs.js

import { supabaseClient } from '@/src/lib/supabase/supabase-client'
import fs from 'fs';
import path from 'path';

async function seedSongs() {
    try {
        const jsonPath = path.resolve('src/data/songs.json');

        if (!fs.existsSync(jsonPath)) {
            throw new Error(`File not found: songs.json at location "${jsonPath}". Please ensure the file exists.`);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const songsData = JSON.parse(rawData);

        console.log(`📡 Connecting to Supabase... Preparing to process ${songsData.length} songs.`);

        // 1. เตรียมข้อมูลเพื่อบันทึกลงตาราง 'songs' (ลบคีย์ segments ออกก่อนเพราะไม่มีคอลัมน์นี้ในเบส)
        const songsToInsert = songsData.map(({ segments, ...songProperties }) => songProperties);

        // 2. เตรียมข้อมูลเพื่อบันทึกลงตาราง 'song_segments'
        const segmentsToInsert = [];
        songsData.forEach(song => {
            if (song.segments && Array.isArray(song.segments)) {
                song.segments.forEach(segment => {
                    segmentsToInsert.push({
                        id: segment.id,
                        song_id: song.id, // โยงความสัมพันธ์กลับมาหาตารางเพลงหลัก
                        segment_name: segment.segment_name,
                        start_time_ms: segment.start_time_ms,
                        difficulty_level: segment.difficulty_level || 'normal'
                    });
                });
            }
        });

        // 3. ทำการ Bulk Insert เข้าไปที่ตาราง 'songs' ก่อน
        console.log(`🎵 Uploading songs into 'songs' table...`);
        const { data: insertedSongs, error: songsError } = await supabaseClient
            .from('songs')
            .insert(songsToInsert)
            .select('id, title');

        if (songsError) throw songsError;
        console.log(`🎉 Success! Successfully inserted ${insertedSongs.length} songs.`);

        // 4. ทำการ Bulk Insert เซกเมนต์ทั้งหมดเข้าไปที่ตาราง 'song_segments' ตามมา
        if (segmentsToInsert.length > 0) {
            console.log(`🎼 Uploading song segments into 'song_segments' table...`);
            const { data: insertedSegments, error: segmentsError } = await supabaseClient
                .from('song_segments')
                .insert(segmentsToInsert)
                .select('id');

            if (segmentsError) throw segmentsError;
            console.log(`🎉 Success! Successfully inserted ${insertedSegments.length} segments.`);
        }

    } catch (err) {
        console.error('\n❌ Critical Error during seeding process:');
        console.error(err.message || err);
    }
}

seedSongs();