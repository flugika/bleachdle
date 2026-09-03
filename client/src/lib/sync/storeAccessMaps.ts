// src/lib/sync/storeAccessMaps.ts
//
// Sibling to storageKeyMaps.ts — that file maps mode → localStorage key,
// this one maps (mode, gameType) → the live Zustand store's applyRemoteStats
// action. Needed because writing localStorage alone no longer propagates to
// mounted stores now that syncStateOnLoad doesn't reload the page — we must
// call .getState().applyRemoteStats() directly on the running store instance.
//
// completed reconciliation uses a separate mechanism (completedSyncEvent.ts)
// since it's UI-derived (isGameCompleted) rather than store-held state —
// see that file for why.
import type { Stats } from '@/src/lib/guessGame/types';
import type { GameMode, GameType } from './syncEngine';

import { useCharacterGame as useDailyCharacterGame } from '@/src/features/character/hooks/daily/useCharacterGame';
import { useCharacterGame as useUnlimitedCharacterGame } from '@/src/features/character/hooks/unlimited/useCharacterGame';
import { useEmojiGame as useDailyEmojiGame } from '@/src/features/emoji/hooks/daily/useEmojiGame';
import { useEmojiGame as useUnlimitedEmojiGame } from '@/src/features/emoji/hooks/unlimited/useEmojiGame';
import { useQuoteGame as useDailyQuoteGame } from '@/src/features/quote/hooks/daily/useQuoteGame';
import { useQuoteGame as useUnlimitedQuoteGame } from '@/src/features/quote/hooks/unlimited/useQuoteGame';
import { useReleaseGame as useDailyReleaseGame } from '@/src/features/release/hooks/daily/useReleaseGame';
import { useReleaseGame as useUnlimitedReleaseGame } from '@/src/features/release/hooks/unlimited/useReleaseGame';
import { useSilhouetteGame as useDailySilhouetteGame } from '@/src/features/silhouette/hooks/daily/useSilhouetteGame';
import { useSilhouetteGame as useUnlimitedSilhouetteGame } from '@/src/features/silhouette/hooks/unlimited/useSilhouetteGame';
import { useSongGame as useDailySongGame } from '@/src/features/song/hooks/daily/useSongGame';
import { useSongGame as useUnlimitedSongGame } from '@/src/features/song/hooks/unlimited/useSongGame';

type ApplyStatsStore = {
    getState: () => {
        applyRemoteStats: (stats: Stats | null) => void;
    };
};

/** key: `${gameMode}:${gameType}` → store hook ที่มี applyRemoteStats */
const STORE_ACCESS_MAP: Partial<Record<string, ApplyStatsStore>> = {
    'character:daily': useDailyCharacterGame,
    'character:unlimited': useUnlimitedCharacterGame,
    'emoji:daily': useDailyEmojiGame,
    'emoji:unlimited': useUnlimitedEmojiGame,
    'quote:daily': useDailyQuoteGame,
    'quote:unlimited': useUnlimitedQuoteGame,
    'release:daily': useDailyReleaseGame,
    'release:unlimited': useUnlimitedReleaseGame,
    'silhouette:daily': useDailySilhouetteGame,
    'silhouette:unlimited': useUnlimitedSilhouetteGame,
    'song:daily': useDailySongGame,
    'song:unlimited': useUnlimitedSongGame,
};

/**
 * เรียก applyRemoteStats เข้า store instance ที่กำลังรันอยู่จริง (ถ้า mount อยู่)
 * ไม่ throw ถ้าไม่พบ mapping — เงียบๆ ปล่อยผ่าน เพราะบาง mode อาจยังไม่ได้ทำ store แยก
 */
export function applyRemoteStatsToStore(gameMode: GameMode, gameType: GameType, stats: Stats): void {
    const store = STORE_ACCESS_MAP[`${gameMode}:${gameType}`];
    if (!store) return;
    store.getState().applyRemoteStats(stats);
}