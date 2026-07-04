// src/features/support/SupportPageClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { PortfolioCard } from "./PortfolioCard";
import { SupportForm } from "./SupportForm";
import { BleachReiatsuCursor } from "@/src/shared/ui/BleachReiatsuCursor"; // adjust path to match your project

export default function SupportPageClient() {
    const router = useRouter();

    return (
        <div className="relative min-h-screen w-full text-white overflow-hidden">
            <BleachReiatsuCursor />

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 md:py-24">
                {/* Header */}
                <div className="text-center mb-6">
                    <button
                        onClick={() => router.push("/")}
                        className="text-[9px] uppercase tracking-[0.3em] text-[#eed9c4]/30 hover:text-[#c8a96e] font-mono mb-6 transition-colors duration-200 cursor-pointer"
                    >
                        ← Return To Living World Gateway
                    </button>

                    <h1
                        className="text-3xl md:text-5xl font-black tracking-[0.15em] bg-gradient-to-r from-[#c8a96e] via-[#f5ebd5] to-[#c8a96e] bg-clip-text text-transparent mb-3"
                    >
                        Support &amp; Reports
                    </h1>
                    <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#eed9c4]/40 font-mono">
                        Central 46 Communication Channel
                    </p>

                    <div className="w-full mt-6 flex items-center justify-center px-[5%] opacity-90">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
                        <div className="mx-8 relative flex items-center justify-center">
                            <div className="w-6 h-6 border border-[#c8a96e] rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(200,169,110,0.3)] bg-black/20">
                                <div className="w-1.5 h-1.5 bg-[#c8a96e] rotate-0 shadow-[0_0_8px_#c8a96e]" />
                            </div>
                            <div className="absolute -left-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                            <div className="absolute -right-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
                    </div>
                </div>

                {/* Two column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <PortfolioCard />
                    <SupportForm />
                </div>

                <p className="mt-14 text-center text-[9px] uppercase tracking-[0.25em] text-[#c8a96e]/60 font-mono">
                    Submitted reports are used only to improve this project. No IP address or
                    other identifying information is collected.
                </p>
            </div>
        </div>
    );
}