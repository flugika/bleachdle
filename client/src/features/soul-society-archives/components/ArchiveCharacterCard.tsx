// src/features/soul-society-archives/components/ArchiveCharacterCard.tsx
'use client';

import { generateCaseFileId } from '@/src/lib/utils/generateCaseFileId';
import Image from 'next/image';

interface ArchiveCharacterCardProps {
    characterId: string;
    name: string;
    imageUrl: string | null;
    affiliation?: string | null;
    race?: string[] | null;
}

// 🏛️ Same Central 46 confidential-archive palette as QuoteTestimonyDisplay,
// so the whole answer page reads as one continuous document, not six styles.
const T = {
    bg: '#07070a',
    border: '#272420',
    borderDim: '#1a1816',
    gold: '#c8a96e',
    value: '#e8ddd0',
    muted: '#8a8078',
    mutedMid: '#5a5448',
    green: '#7ab85a',
};

export function ArchiveCharacterCard({ characterId, name, imageUrl, affiliation, race }: ArchiveCharacterCardProps) {
    const caseNo = generateCaseFileId(characterId);
    const tags = [affiliation, ...(race ?? [])].filter(Boolean) as string[];

    return (
        <div
            className="relative w-full max-w-sm mx-auto overflow-hidden"
            style={{ background: T.bg, boxShadow: `0 0 0 1px ${T.border}, 0 26px 60px rgba(0,0,0,0.65)` }}
        >
            {/* Portrait */}
            <div className="relative z-10 px-5 pt-4">
                <div
                    className="relative w-full aspect-square overflow-hidden rounded-sm ring-1 ring-white/5 shadow-2xl"
                    style={{ background: '#0d0d10', border: `1px solid ${T.borderDim}` }}
                >
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={name}
                            className="absolute inset-0 w-full h-full object-cover"
                            draggable={false}
                            fill
                            sizes='w-full h-full'
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: T.muted }}>
                            No Portrait On File
                        </div>
                    )}
                    {/* corner brackets over the portrait */}
                    <div className="absolute inset-2 pointer-events-none">
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: `${T.gold}b0` }} />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: `${T.gold}b0` }} />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: `${T.gold}b0` }} />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: `${T.gold}b0` }} />
                    </div>
                </div>
            </div>

            {/* Name + tags */}
            <div className="relative z-10 px-5 py-4 text-center">
                <p className="text-2xl font-black tracking-wide" style={{ color: T.gold }}>{name}</p>
                {tags.length > 0 && (
                    <p className="text-[10px] tracking-[0.18em] uppercase mt-1.5" style={{ color: T.muted }}>
                        {tags.join(' · ')}
                    </p>
                )}
            </div>
        </div>
    );
}