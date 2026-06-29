// app/(home)/page.tsx
import Link from "next/link";

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <h1 className="text-5xl font-bold tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>
                BLEACHDLE
            </h1>
            <p className="text-[#d1a9a9] uppercase tracking-[0.2em] text-[10px]">
                Anime Guessing Game (TYBW Cour 3)
            </p>

            <div className="flex gap-4 justify-center pt-6">
                <Link
                    href="/daily"
                    className="px-8 py-3 bg-white text-black text-sm font-bold tracking-widest hover:bg-[#c8a96e] transition-colors"
                >
                    DAILY
                </Link>
                <Link
                    href="/unlimited"
                    className="px-8 py-3 border border-white/20 text-white text-sm font-bold tracking-widest hover:border-[#c8a96e] hover:text-[#c8a96e] transition-colors"
                >
                    UNLIMITED
                </Link>
            </div>
        </div>
    );
}