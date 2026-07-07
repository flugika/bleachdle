// src/config/daily-hub.config.ts

import { FEATURE_FLAGS, GameSubFeature } from '@/src/config/feature.flags';

export interface DailyHubModeConfig {
    id: GameSubFeature;
    label: string;       // ชื่อเต็ม ใช้ในปุ่ม CTA
    shortLabel: string;   // ชื่อย่อ ใช้ใน pill แคบๆ บนแถบ progress
    icon: string;         // glyph ชั่วคราว — เปลี่ยนเป็น lucide-react/SVG asset ทีหลังได้ ไม่กระทบ logic
    href: string;         // 🛡️ TODO: ปรับให้ตรงกับ route จริงของแต่ละโหมดในโปรเจกต์ (ตอนนี้เดาตาม convention /daily/:mode)
}

// 🛡️ NOTE: ตั้งใจไม่ผูก storageKey ต่อโหมดใน config นี้แล้ว — Daily Hub เก็บสถานะทุกโหมด
// รวมไว้ในคีย์เดียว STORAGE_KEYS.DAILY_HUB_STATUS (ดู useDailyHub.ts) แยกชั้นขาดจาก
// STORAGE_KEYS.*_PROGRESS ที่ zustand persist ของแต่ละเกมยึดไว้ใช้เก็บ target/guesses/hasFinalized

// 🗺️ ลำดับในนี้ = ลำดับที่จะเรนเดอร์บนแถบ progress และลำดับที่ "เล่นต่อ" จะไล่หาให้อัตโนมัติ
export const DAILY_HUB_MODES: DailyHubModeConfig[] = [
    {
        id: 'character',
        label: 'Character',
        shortLabel: 'CHR',
        icon: '👤',
        href: '/daily/character',
    },
    {
        id: 'song',
        label: 'Song',
        shortLabel: 'SNG',
        icon: '🎵',
        href: '/daily/song',
    },
    {
        id: 'quote',
        label: 'Quote',
        shortLabel: 'QUO',
        icon: '💬',
        // 🛡️ NOTE: key เดิมในโปรเจกต์สะกดว่า QOUTE_PROGRESS (ไม่ใช่ QUOTE) — คงไว้ตามของเดิม
        // เพื่อไม่ให้ค่าที่เคย persist ไปแล้ว (ถ้ามี) หลุดหาย ถ้าจะแก้ให้ถูกสะกด ต้อง migrate key เก่าด้วย
        href: '/daily/quote',
    },
    {
        id: 'silhouette',
        label: 'Silhouette',
        shortLabel: 'SIL',
        icon: '🌑',
        href: '/daily/silhouette',
    },
    {
        id: 'emoji',
        label: 'Emoji',
        shortLabel: 'EMJ',
        icon: '😀',
        href: '/daily/emoji',
    },
    {
        id: 'release',
        label: 'Release',
        shortLabel: 'REL',
        icon: '📅',
        href: '/daily/release',
    },
];

// เอาเฉพาะโหมดที่เปิดใช้งานจริงใน daily (feature flag = true) — โหมดที่ยัง false จะไม่โผล่บนแถบเลย
// ไม่ใช่แค่ disabled เฉยๆ เพราะยังไม่มีหน้าเกมให้กดไปเล่นจริง
export const getActiveDailyHubModes = (): DailyHubModeConfig[] =>
    DAILY_HUB_MODES.filter((m) => FEATURE_FLAGS.daily[m.id]);