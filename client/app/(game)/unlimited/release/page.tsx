// app/(game)/unlimited/release/page.tsx

import UnlimitedReleaseWrapper from "@/src/features/release/components/unlimited/UnlimitedReleaseWrapper";

export const dynamic = 'force-dynamic';

export default async function UnlimitedReleaseGame() {
    return <UnlimitedReleaseWrapper />;
}