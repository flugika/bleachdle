"use client";

import { memo, useMemo } from "react";
import type { PhenomenonKey, PhenomenonPhase } from "./constants";
import { PHENOMENON_CTA_LORE } from "./constants";
import { GargantaBleed } from "./phenomena/GargantaBleed";
import { KurohitsugiBleed } from "./phenomena/KurohitsugiBleed";
import { AlmightyBleed } from "./phenomena/AlmightyBleed";
import { ZeroDivisionBleed } from "./phenomena/ZeroDivisionBleed";

export interface PhenomenonCTASkin {
    clipPath?: string;
    safePadding?: number;
    Bleed?: React.ComponentType<{ phase: PhenomenonPhase }>;
}

// Skin registry — module-level constant, never recreated.
export const CTA_SKINS: Partial<Record<PhenomenonKey, PhenomenonCTASkin>> = {
    garganta: {
        clipPath:
            "polygon(2% 16%,7% 6%,13% 12%,19% 2%,27% 10%,35% 0%,44% 8%,53% 1%,62% 7%,71% 1%,80% 8%,88% 2%,95% 9%,100% 4%,100% 90%,94% 96%,87% 91%,79% 98%,70% 92%,61% 99%,52% 93%,43% 99%,34% 93%,25% 98%,17% 92%,10% 97%,4% 91%,0% 84%)",
        safePadding: 16,
        Bleed: GargantaBleed,
    },
    almighty: {
        clipPath: "polygon(0% 12%, 6% 0%, 94% 0%, 100% 12%, 97% 50%, 100% 88%, 94% 100%, 6% 100%, 0% 88%, 3% 50%)",
        safePadding: 20,
        Bleed: AlmightyBleed,
    },
    kurohitsugi: {
        clipPath: "polygon(4% 0%, 96% 0%, 100% 8%, 100% 92%, 96% 100%, 4% 100%, 0% 92%, 0% 8%)",
        safePadding: 18,
        Bleed: KurohitsugiBleed,
    },

    zerodivision: {
        // ทรงกรอบแบบ Octagon (พับมุมเฉียงเข้ามา) ให้ลุคสูงส่งแบบพระราชวัง
        clipPath: "polygon(3% 0%, 97% 0%, 100% 15%, 100% 85%, 97% 100%, 3% 100%, 0% 85%, 0% 15%)",
        safePadding: 24,
        Bleed: ZeroDivisionBleed,
    },
};

export function usePhenomenonCTASkin(phenomenon: PhenomenonKey): PhenomenonCTASkin {
    // useMemo avoids returning a fresh `{}` reference every render for
    // phenomena with no registered skin, which would otherwise cause any
    // consumer doing shallow-compare on this value to re-render needlessly.
    return useMemo(() => CTA_SKINS[phenomenon] ?? {}, [phenomenon]);
}

export const PhenomenonLoreCaption = memo(function PhenomenonLoreCaption({ phenomenon }: { phenomenon: PhenomenonKey }) {
    const lore = PHENOMENON_CTA_LORE[phenomenon];
    if (!lore) return null;
    return (
        <span
            className="relative block text-[9px] md:text-[10px] tracking-[0.14em] mt-2 text-white/50 italic font-[family-name:var(--font-body)]"
            style={{ fontFamily: "'Shippori Mincho', serif" }}
        >
            {lore.jp} <span className="not-italic text-white/30">— {lore.en}</span>
        </span>
    );
});
PhenomenonLoreCaption.displayName = "PhenomenonLoreCaption";