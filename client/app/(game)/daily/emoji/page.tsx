import DailyEmojiWrapper from "@/src/features/emoji/components/daily/DailyEmojiWrapper";
import { getDailyEmoji } from "@/src/services/emoji";

export const dynamic = 'force-dynamic';

// src/app/(game)/daily/emoji/page.tsx
export default async function DailyEmojiGame() {
    const dailyEmoji = await getDailyEmoji();
    
    // dailyEmoji ตรงนี้คือ EmojiTarget | null แล้วครับ (emoji set row + .character แนบมาให้เลย)
    return <DailyEmojiWrapper initialTarget={dailyEmoji} />;
}