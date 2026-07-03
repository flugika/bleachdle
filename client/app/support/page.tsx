// app/support/page.tsx
import type { Metadata } from "next";
import SupportPageClient from "@/src/features/support/SupportPageClient";

export const metadata: Metadata = {
    title: "Support & Reports",
    description: "แจ้งปัญหา ให้ feedback หรือสนับสนุนผู้พัฒนา",
};

export default function SupportPage() {
    return <SupportPageClient />;
}