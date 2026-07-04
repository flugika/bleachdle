// app/support/page.tsx
import SupportPageClient from "@/src/features/support/SupportPageClient";
import { FEATURE_FLAGS } from "@/src/config/feature.flags";
import Sealed from "@/src/shared/ui/Sealed";

export default function SupportPage() {
    if (!FEATURE_FLAGS.support) {
        return <Sealed />;
    }

    return <SupportPageClient />;
}