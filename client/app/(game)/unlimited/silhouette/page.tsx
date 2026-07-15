// app/(game)/unlimited/silhouette/page.tsx

import UnlimitedSilhouetteWrapper from "@/src/features/silhouette/components/unlimited/UnlimitedSilhouetteWrapper";

export const dynamic = 'force-dynamic';

export default async function UnlimitedSilhouetteGame() {
    return <UnlimitedSilhouetteWrapper />;
}