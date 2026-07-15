// app/(game)/unlimited/quote/page.tsx

import UnlimitedQuoteWrapper from "@/src/features/quote/components/unlimited/UnlimitedQuoteWrapper";

export const dynamic = 'force-dynamic';

export default async function UnlimitedQuoteGame() {
    return <UnlimitedQuoteWrapper />;
}