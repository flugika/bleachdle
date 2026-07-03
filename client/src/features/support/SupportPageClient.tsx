// src/features/support/SupportPageClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { PromptPayCard } from "./PromptPayCard";
import { SupportForm } from "./SupportForm";
import { BleachReiatsuCursor } from "@/src/shared/ui/BleachReiatsuCursor"; // adjust path to match your project

export default function SupportPageClient() {
    const router = useRouter();

    return (
        <div className="relative min-h-screen w-full bg-[#020205] text-white overflow-hidden">
            <BleachReiatsuCursor />

            {/* Ambient background — same treatment as Sealed.tsx for visual continuity */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#010103_98%)] pointer-events-none z-0 opacity-60" />
            <div className="absolute inset-0 bleach-scanlines pointer-events-none z-0 opacity-30" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <div className="w-[160%] h-[1px] bg-gradient-to-r from-transparent via-[#c8a96e]/10 to-transparent rotate-[-20deg] blur-[1px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 md:py-24">
                {/* Header */}
                <div className="text-center mb-14">
                    <button
                        onClick={() => router.push("/")}
                        className="text-[9px] uppercase tracking-[0.3em] text-[#eed9c4]/30 hover:text-[#c8a96e] font-mono mb-6 transition-colors duration-200 cursor-pointer"
                    >
                        ← Return To Living World Gateway
                    </button>

                    <h1
                        className="text-3xl md:text-5xl font-black tracking-[0.15em] bg-gradient-to-r from-[#c8a96e] via-[#f5ebd5] to-[#c8a96e] bg-clip-text text-transparent uppercase mb-3"
                        style={{ fontFamily: "'Cinzel', serif" }}
                    >
                        Support &amp; Reports
                    </h1>
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#eed9c4]/40 font-mono">
                        Central 46 Communication Channel
                    </p>

                    <div className="mt-6 w-16 h-px bg-[#c8a96e]/30 mx-auto" />
                </div>

                {/* Two column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <PromptPayCard />
                    <SupportForm />
                </div>

                <p className="mt-14 text-center text-[9px] uppercase tracking-[0.25em] text-[#eed9c4]/20 font-mono">
                    Submitted reports are used only to improve this project. No IP address or
                    other identifying information is collected.
                </p>
            </div>
        </div>
    );
}