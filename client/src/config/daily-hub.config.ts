// src/config/daily-hub.config.ts

import { FEATURE_FLAGS, GameSubFeature } from '@/src/config/feature.flags';

export interface DailyHubModeConfig {
    id: GameSubFeature;
    label: string;
    shortLabel: string;
    icon: string;         // เปลี่ยนจาก Emoji เป็น Tactical/Occult Symbols
    href: string;
}

// 🗺️ ลำดับในนี้ = ลำดับที่จะเรนเดอร์บนแถบ progress
export const DAILY_HUB_MODES: DailyHubModeConfig[] = [
    {
        id: 'character',
        label: 'Character',
        shortLabel: 'CHR',
        icon: '◈', // Core/Soul signature
        href: '/daily/character',
    },
    {
        id: 'song',
        label: 'Song',
        shortLabel: 'SNG',
        icon: '♪', // Resonance/Frequency
        href: '/daily/song',
    },
    {
        id: 'quote',
        label: 'Quote',
        shortLabel: 'QUO',
        icon: '❝', // Testimony/Record
        href: '/daily/quote',
    },
    {
        id: 'silhouette',
        label: 'Silhouette',
        shortLabel: 'SIL',
        icon: '◐', // Shadow/Eclipse
        href: '/daily/silhouette',
    },
    {
        id: 'emoji',
        label: 'Emoji',
        shortLabel: 'EMJ',
        icon: '❖', // Pattern/Cipher Array
        href: '/daily/emoji',
    },
    {
        id: 'release',
        label: 'Release',
        shortLabel: 'REL',
        icon: '₪', // Unsealing/Release mechanism
        href: '/daily/release',
    },
];

export const getActiveDailyHubModes = (): DailyHubModeConfig[] =>
    DAILY_HUB_MODES.filter((m) => FEATURE_FLAGS.daily[m.id]);