type LegendItem = {
    key: string;
    bg: string;
    border: string;
    label: string;
};

type LegendVariant = 'full' | 'simple';

const LEGEND_ITEMS: Record<LegendVariant, readonly LegendItem[]> = {
    full: [
        { key: 'correct', bg: '#0d2918', border: '#1a5530', label: 'Correct' },
        { key: 'partial', bg: '#2a1f00', border: '#5a4000', label: 'Partial' },
        { key: 'wrong', bg: '#590e0e', border: '#a64747', label: 'Wrong' },
        { key: 'dir', bg: '#0a0a22', border: '#3a3a7a', label: 'Higher ▲ / Lower ▼' },
    ],
    simple: [
        { key: 'correct', bg: '#0d2918', border: '#1a5530', label: 'Correct' },
        { key: 'wrong', bg: '#590e0e', border: '#a64747', label: 'Wrong' },
    ],
};

type LegendProps = {
    variant?: LegendVariant;
    className?: string;
};

export function Legend({ variant = 'full', className = '' }: LegendProps) {
    const items = LEGEND_ITEMS[variant];

    return (
        <div className={`flex flex-wrap justify-center gap-x-5 gap-y-1.5 ${className}`}>
            {items.map(({ key, bg, border, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                    <span
                        className="inline-block w-2.5 h-2.5 shrink-0"
                        style={{ background: bg, border: `1px solid ${border}` }}
                    />
                    <span className="text-[12px] tracking-wide text-[#d1a9a9]">{label}</span>
                </div>
            ))}
        </div>
    );
}