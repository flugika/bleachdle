import { BleachSong } from "@/src/entities/song/schema";
import DailySongWrapper from "@/src/features/song/components/daily/DailySongWrapper";
import { getDailySong } from "@/src/services/song";

// src/app/(game)/daily/song/page.tsx
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