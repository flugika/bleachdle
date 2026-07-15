// app/(game)/unlimited/emoji/page.tsx

import UnlimitedEmojiWrapper from "@/src/features/emoji/components/unlimited/UnlimitedEmojiWrapper";

export const dynamic = 'force-dynamic';

export default async function UnlimitedEmojiGame() {
    return <UnlimitedEmojiWrapper />;
}