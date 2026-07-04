// src/lib/utils/quote.ts
import rawQuotes from '@/src/data/quotes.json';
import { BleachQuote, QuoteSchema } from '@/src/entities/quote/schema';

export const getQuotes = (): BleachQuote[] => {
    return rawQuotes as BleachQuote[];
};

export const getQuoteById = (id: string): BleachQuote | undefined => {
    const quote = rawQuotes.find(q => q.id === id);
    if (!quote) return undefined;
    return QuoteSchema.parse(quote);
};