import { QuoteGuessEntry } from "./types";

export function isValidGuessEntry(entry: unknown): entry is QuoteGuessEntry {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'status' in entry &&
        ((entry as QuoteGuessEntry).status === 'correct' || (entry as QuoteGuessEntry).status === 'wrong') &&
        'guess' in entry &&
        typeof (entry as QuoteGuessEntry).guess === 'object'
    );
}