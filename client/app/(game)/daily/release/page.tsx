// app/(game)/daily/release/page.tsx

import DailyReleaseWrapper from "@/src/features/release/components/daily/DailyReleaseWrapper";
import { getDailyRelease } from "@/src/services/getDailySchedule/release";

export const dynamic = 'force-dynamic';

export default async function DailyReleaseGame() {
    const dailyRelease = await getDailyRelease();
    return <DailyReleaseWrapper initialTarget={dailyRelease} />;
}