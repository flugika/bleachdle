import DailyCharacterWrapper from "@/src/features/character/components/daily/DailyCharacterWrapper";
import { getDailyCharacter } from "@/src/services/getDailySchedule/character";

export const dynamic = 'force-dynamic';

// src/app/(game)/daily/character/page.tsx
export default async function DailyCharacterGame() {
    const dailyCharacter = await getDailyCharacter(); 
    
    // dailyCharacter ตรงนี้คือ Character | null แล้วครับ
    return <DailyCharacterWrapper initialTarget={dailyCharacter} />;
}