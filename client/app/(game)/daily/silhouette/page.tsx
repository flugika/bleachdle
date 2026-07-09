import DailySilhouetteWrapper from "@/src/features/silhouette/components/daily/DailySilhouetteWrapper";
import { getDailySilhouette } from "@/src/services/silhouette";

export const dynamic = 'force-dynamic';

// src/app/(game)/daily/silhouette/page.tsx
export default async function DailySilhouetteGame() {
    const dailySilhouette = await getDailySilhouette();

    // dailySilhouette ตรงนี้คือ SilhouetteTarget | null แล้วครับ (silhouette row + .character แนบมาให้เลย)
    return <DailySilhouetteWrapper initialTarget={dailySilhouette} />;
}