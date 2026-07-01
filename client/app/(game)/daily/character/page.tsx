import { Character } from "@/src/entities/character/schema";
import DailyCharacterWrapper from "@/src/features/character/components/daily/DailyCharacterWrapper";
import { getDailyCharacter } from "@/src/services/character";

// src/app/(game)/daily/character/page.tsx
export default async function DailyCharacterGame() {
    const dailyCharacter = await getDailyCharacter(); 
    
    // dailyCharacter ตรงนี้คือ Character | null แล้วครับ
    return <DailyCharacterWrapper initialTarget={dailyCharacter} />;
}