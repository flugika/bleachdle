// src/components/Footer.tsx (สมมติว่าคุณย้ายมาไว้ที่นี่)
import Link from 'next/link';

const FOOTER_LINKS = [
    { name: 'HOME', path: '/' },
    { name: 'ABOUT', path: '/about' },
    { name: 'STATS', path: '/stats' },
    { name: 'SUPPORT', path: '/support' },
];

export default function Footer() {
    return (
        <footer className="w-full border-t border-white/5 bg-[#050505] py-12 px-6">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">

                {/* Brand Section */}
                <div className="text-center md:text-left">
                    <Link href="/" className="text-sm font-bold tracking-[0.2em] text-white hover:text-[#c8a96e] transition-colors">
                        BLEACHDLE
                    </Link>
                    <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
                        Soul Society Guessing Engine
                    </p>
                </div>

                {/* Links Navigation */}
                <nav className="flex gap-8">
                    {FOOTER_LINKS.map((link) => (
                        <Link
                            key={link.name}
                            href={link.path}
                            className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#c8a96e] transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Metadata/Copyright */}
                <div className="text-[9px] text-white/20 tracking-wider text-center md:text-right">
                    © {new Date().getFullYear()} fukusana.dev <br />
                    Lastest Updated: 4 July 2026, 2:28 AM. <br />
                    Thousand-Year Blood War Cour 3 (The Conflict)
                </div>
            </div>
        </footer>
    );
}