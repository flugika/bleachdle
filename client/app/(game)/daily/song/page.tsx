// app/(game)/daily/song/page.tsx

import DailySongWrapper from "@/src/features/song/components/daily/DailySongWrapper";
import { getDailySong } from "@/src/services/getDailySchedule/song";

export const dynamic = 'force-dynamic';

export default async function DailySongGame() {
    const dailyData = await getDailySong();

    if (!dailyData) {
        return (
            <></>
        );
    }

    // dailyData ตรงนี้คือ BleachSong | null แล้วครับ (pattern เดียวกับ daily/character เป๊ะ)
    return <DailySongWrapper initialTarget={dailyData.song} initialSegmentId={dailyData.segmentId} />;
}