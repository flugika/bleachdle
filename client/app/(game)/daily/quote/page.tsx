// app/(game)/daily/quote/page.tsx

import DailyQuoteWrapper from "@/src/features/quote/components/daily/DailyQuoteWrapper";
import { getDailyQuote } from "@/src/services/getDailySchedule/quote";

export const dynamic = 'force-dynamic';

export default async function DailyQuoteGame() {
    const dailyQuote = await getDailyQuote();

    // dailyQuote ตรงนี้คือ QuoteTarget | null แล้วครับ (quote row + .character แนบมาให้เลย)
    return <DailyQuoteWrapper initialTarget={dailyQuote} />;
}