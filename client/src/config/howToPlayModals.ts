// src/config/howToPlayModals.ts
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

export interface HowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'unlimited';
}

// 🎯 key ต้องตรงกับ path segment ที่ 2 เช่น /daily/emoji, /unlimited/quote
export const HOW_TO_PLAY_MODALS: Record<string, ComponentType<HowToPlayModalProps>> = {
    emoji: dynamic(() => import('@/src/features/emoji/components/shared/EmojiHowToPlayModal').then(m => m.EmojiHowToPlayModal)),
    quote: dynamic(() => import('@/src/features/quote/components/shared/QuoteHowToPlayModal').then(m => m.QuoteHowToPlayModal)),
    song: dynamic(() => import('@/src/features/song/components/shared/SongHowToPlayModal').then(m => m.SongHowToPlayModal)),
    character: dynamic(() => import('@/src/features/character/components/shared/CharacterHowToPlayModal').then(m => m.CharacterHowToPlayModal)),
    silhouette: dynamic(() => import('@/src/features/silhouette/components/shared/SilhouetteHowToPlayModal').then(m => m.SilhouetteHowToPlayModal)),
    release: dynamic(() => import('@/src/features/release/components/shared/ReleaseHowToPlayModal').then(m => m.ReleaseHowToPlayModal)),
};