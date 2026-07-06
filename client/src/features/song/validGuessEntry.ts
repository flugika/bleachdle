import { SongGuessEntry } from "./types";

export function isValidGuessEntry(entry: unknown): entry is SongGuessEntry {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'status' in entry &&
        (entry as SongGuessEntry).status !== undefined &&
        ((entry as SongGuessEntry).status === 'correct' || (entry as SongGuessEntry).status === 'wrong') &&
        'guess' in entry &&
        typeof (entry as SongGuessEntry).guess === 'object'
    );
}