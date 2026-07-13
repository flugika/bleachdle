// src/features/support/PortfolioCard.tsx
"use client";

import { ArrowUpRight } from "lucide-react";
import { KidoSeal } from "./KidoSeal";

// No payment/QR content lives in this card by design — this is a fan-made,
// non-commercial project, so the "support circle" is goodwill-only: the seal
// stands in for whatever a QR code would have occupied, with no financial
// call to action attached to it.

// Set NEXT_PUBLIC_PORTFOLIO_URL in your .env to point at your real site.
const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL || "https://www.instagram.com/sandyflugika/";

export function PortfolioCard() {
    return (
        <div className="relative bg-gradient-to-b from-[#0a0a0f]/90 to-[#020205]/95 border border-[#c8a96e]/25 p-6 md:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            {/* Kido corner brackets — recurring signature motif */}
            <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
            <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
            <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
            <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />

            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c8a96e]/60" />
                <span className="text-lg font-bold text-[#c8a96e] tracking-[0.3em]" style={{ fontFamily: "'Cinzel', serif" }}>
                    支援
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c8a96e]/60" />
            </div>
            <p className="text-center text-[12px] uppercase tracking-[0.35em] text-[#eed9c4]/50 font-mono mb-8">
                Kido Support Circle // Built On Goodwill
            </p>

            {/* Seal centerpiece — no QR, no payment target, just the mark itself */}
            <div className="relative flex items-center justify-center h-[280px] mb-6">
                <KidoSeal size={420} />

                <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
                    <span
                        className="kido-emblem text-4xl md:text-5xl text-[#c8a96e]"
                        style={{ fontFamily: "'Cinzel', serif" }}
                        aria-hidden="true"
                    >
                        誠
                    </span>
                </div>
            </div>

            {/* Portfolio CTA — the one "ask" this card actually makes */}
            <div className="flex flex-col items-center gap-2 mb-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#eed9c4]/50 font-mono">
                    Sincerity, Not Currency
                </p>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#eed9c4]/50 font-mono">
                    Rather see more of my work?
                </p>
                <a
                    href={PORTFOLIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative font-black font-[family-name:var(--font-display)] inline-flex items-center gap-2 border border-[#c8a96e]/50 px-6 py-2.5 text-[12px] uppercase tracking-[0.25em] text-[#c8a96e] transition-all duration-300 hover:border-[#c8a96e] hover:bg-[#c8a96e]/10 hover:shadow-[0_0_27px_rgba(200,169,110,0.35)]"
                >
                    View My Portfolio
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
            </div>

            {/* No-payment notice — romaji + English, matching the Central 46 register
                used elsewhere in the app (see Sealed.tsx) */}
            <div className="border-t border-[#c8a96e]/10 pt-6 mt-4">
                <blockquote className="text-[11px] md:text-xs font-medium tracking-wide text-[#c8a96e]/80 italic font-mono leading-relaxed text-center px-2">
                    &ldquo;Kono purojekuto wa, taika naku, tada kokorozashi dake de tsukurareta.&rdquo;
                </blockquote>
                <p className="mt-3 text-[12px] md:text-[11px] leading-relaxed text-neutral-400 text-center px-2">
                    This is an unofficial, fan-made project, built without payment and on personal
                    time, out of genuine care for it. It does not accept donations or any form of
                    payment — your support is simply using it and sharing feedback below.
                </p>
            </div>
        </div>
    );
}