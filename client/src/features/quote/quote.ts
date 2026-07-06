// src/features/quote/quote.ts
import rawQuotes from '@/src/data/quotes.json';
import { BleachQuote, QuoteSchema } from '@/src/entities/quote/schema';
import { getCharacterById } from '@/src/features/character/character';
import { QuoteTarget } from '@/src/features/quote/types';

export const getQuotes = (): BleachQuote[] => {
    return rawQuotes as BleachQuote[];
};

export const getQuoteById = (id: string): BleachQuote | undefined => {
    const quote = rawQuotes.find(q => q.id === id);
    if (!quote) return undefined;
    return QuoteSchema.parse(quote);
};

/**
 * 🔗 Joins a quote with its speaker's full Character record.
 * Returns undefined (instead of throwing) if character_id points at a
 * character that doesn't exist in the dataset — callers must handle that
 * as bad data, not crash the game.
 */
export const attachCharacter = (quote: BleachQuote): QuoteTarget | undefined => {
    const character = getCharacterById(quote.character_id);
    if (!character) return undefined;
    return { ...quote, character };
};

export const getQuoteWithCharacterById = (id: string): QuoteTarget | undefined => {
    const quote = getQuoteById(id);
    if (!quote) return undefined;
    return attachCharacter(quote);
};