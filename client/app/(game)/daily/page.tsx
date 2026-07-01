// app/(game)/daily/page.tsx
import Link from 'next/link';

const MODES = [
    { id: 'character', title: 'CHARACTER', desc: 'GUESS CHARACTERS BY STATS', icon: '👤' },
    { id: 'image', title: 'IMAGE', desc: 'IDENTIFY CHARACTER FROM SNIPPETS', icon: '🖼️' },
    { id: 'song', title: 'SONG', desc: 'GUESS THE BLEACH OST', icon: '🎵' },
];

export default function DailySelector() {
    return (
        <main className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-5xl mx-auto px-6 py-12">
            {/* Header */}
            <h1 className="text-4xl md:text-5xl font-bold mb-16 tracking-[0.3em] text-white/90" style={{ fontFamily: "'Cinzel', serif" }}>
                Daily MODES
            </h1>

            {/* Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                {MODES.map((mode) => (
                    <Link
                        key={mode.id}
                        href={`/daily/${mode.id}`}
                        className="relative p-8 border border-white/10 bg-[#0a0a0a] transition-all duration-500 hover:border-[#c8a96e]/50 hover:bg-[#121212] group"
                    >
                        {/* Decorative Corner Glow */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-[#c8a96e]/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="text-4xl mb-6">{mode.icon}</div>
                        <h2 className="text-lg font-bold mb-3 tracking-[0.2em] group-hover:text-[#c8a96e] transition-colors">
                            {mode.title}
                        </h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] leading-relaxed">
                            {mode.desc}
                        </p>
                    </Link>
                ))}
            </div>
        </main>
    );
}