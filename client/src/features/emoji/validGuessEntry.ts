import { EmojiGuessEntry } from "./types";

export function isValidGuessEntry(entry: unknown): entry is EmojiGuessEntry {
    return (
        typeof entry === 'object' &&
        entry !== null &&
        'status' in entry &&
        ((entry as EmojiGuessEntry).status === 'correct' || (entry as EmojiGuessEntry).status === 'wrong') &&
        'guess' in entry &&
        typeof (entry as EmojiGuessEntry).guess === 'object'
    );
}
