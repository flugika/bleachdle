// app/about/page.tsx
import type { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

export const metadata: Metadata = {
    title: "About — Bleachdle",
    description:
        "Bleachdle is an unofficial, non-commercial fan project — no ads, no donations, no monetization. Learn what it is and why it was built.",
};

// Static content — no per-request data, so this can be fully static.
export const dynamic = "force-static";

export default function AboutPage() {
    return <AboutPageClient />;
}