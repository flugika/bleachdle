// app/(game)/unlimited/character/page.tsx

import UnlimitedCharacterWrapper from "@/src/features/character/components/unlimited/UnlimitedCharacterWrapper";

export const dynamic = 'force-dynamic';

export default async function UnlimitedCharacterGame() {
    return <UnlimitedCharacterWrapper />;
}