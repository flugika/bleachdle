export const VALID_STAT_MODES = [
    'character',
    'song',
    'image',
    'release',
    'emoji',
    'quote',
] as const;

export type StatMode = (typeof VALID_STAT_MODES)[number];