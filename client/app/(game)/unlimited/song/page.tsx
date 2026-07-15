// app/(game)/unlimited/song/page.tsx

import UnlimitedSongWrapper from "@/src/features/song/components/unlimited/UnlimitedSongWrapper";

export const dynamic = 'force-dynamic';

export default async function UnlimitedSongGame() {
    return <UnlimitedSongWrapper />;
}