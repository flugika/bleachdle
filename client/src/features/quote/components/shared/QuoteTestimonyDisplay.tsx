// src/features/quote/components/shared/QuoteTestimonyDisplay.tsx
'use client';

import { QuoteTargetHidden } from '@/src/features/quote/types';
import { generateCaseFileId } from '@/src/lib/utils/generateCaseFileId';

interface QuoteTestimonyDisplayProps {
    target: QuoteTargetHidden;
    isSolved?: boolean;
    speakerName?: string; // ส่งเข้ามาเมื่อ isSolved = true เท่านั้น
}

// 🏛️ ธีมเอกสารลับ Central 46 — ใช้ palette เดียวกับ Central46ConfidentialArchive
// เพื่อให้ quote mode มี "เอกลักษณ์เอกสารลับ" ตรงข้ามกับ ticket-stub ของ song
const T = {
    bg: '#07070a',
    border: '#272420',
    borderDim: '#1a1816',
    gold: '#c8a96e',
    value: '#e8ddd0',
    muted: '#8a8078',
    mutedMid: '#5a5448',
    redNotice: '#c85050',
};

function SecurityStrip({ bottom = false }: { bottom?: boolean }) {
    const label = 'CONFIDENTIAL · 極秘 · ';
    return (
        <div
            className="w-full overflow-hidden whitespace-nowrap text-[10px] tracking-[0.18em] py-[7px] select-none"
            style={{
                color: T.gold,
                opacity: 0.16,
                borderBottom: bottom ? 'none' : `1px solid ${T.borderDim}`,
                borderTop: bottom ? `1px solid ${T.borderDim}` : 'none',
            }}
            aria-hidden="true"
        >
            {label.repeat(30)}
        </div>
    );
}

export function QuoteTestimonyDisplay({ target, isSolved = false, speakerName }: QuoteTestimonyDisplayProps) {
    const caseNo = generateCaseFileId(target.id);

    return (
        <div
            className="relative w-full max-w-lg mx-auto my-2 overflow-hidden"
            style={{
                background: T.bg,
                boxShadow: `0 0 0 1px ${T.border}, 0 26px 60px rgba(0,0,0,0.65)`,
            }}
        >
            {/* Kanji watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0" aria-hidden="true">
                <span style={{ fontSize: '180px', fontWeight: 900, color: '#ffffff', opacity: 0.015, lineHeight: 1 }}>
                    霊
                </span>
            </div>

            {/* Corner status stamp — mystery ระหว่างยังไม่เฉลย */}
            {!isSolved && (
                <div
                    className="absolute top-4 right-4 z-20 select-none pointer-events-none"
                    style={{ transform: 'rotate(9deg)' }}
                >
                    <div
                        className="px-2 py-0.5 border-2 rounded-sm text-[10px] font-black tracking-[0.22em] uppercase"
                        style={{ color: T.redNotice, borderColor: 'rgba(200,80,80,0.35)', opacity: 0.8 }}
                    >
                        Pending ID
                    </div>
                </div>
            )}

            <SecurityStrip />

            {/* Header */}
            <div className="relative z-10 px-7 pt-6">
                <p className="text-[11px] tracking-[0.4em] uppercase mb-3" style={{ color: T.mutedMid }}>
                    非公開証言記録 // CONFIDENTIAL TESTIMONY
                </p>

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: T.muted }}>Case File</p>
                        <p className="text-[11px] tracking-[0.14em]" style={{ color: T.gold }}>{caseNo}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: T.muted }}>Status</p>
                        <p
                            className="text-[11px] tracking-[0.14em] uppercase"
                            style={{ color: isSolved ? '#7ab85a' : T.redNotice }}
                        >
                            {isSolved ? 'Identified' : 'Unidentified'}
                        </p>
                    </div>
                </div>

                <div className="h-px w-full" style={{ background: T.border }} />
            </div>

            {/* Testimony body */}
            <div className="relative z-10 px-8 py-8 text-center">
                <span
                    className="block text-4xl leading-none mb-3 select-none"
                    style={{ color: T.gold, opacity: 0.5, fontFamily: 'Georgia, serif' }}
                    aria-hidden="true"
                >
                    ❝
                </span>

                <p
                    className="italic leading-relaxed whitespace-pre-line"
                    style={{ color: T.value, fontSize: '17px', letterSpacing: '0.02em' }}
                >
                    {target.text}
                </p>

                <span
                    className="block text-4xl leading-none mt-3 select-none rotate-180"
                    style={{ color: T.gold, opacity: 0.5, fontFamily: 'Georgia, serif' }}
                    aria-hidden="true"
                >
                    ❝
                </span>
            </div>

            {/* Speaker line — redacted bar until solved */}
            <div className="relative z-10 px-8 pb-6">
                <div className="h-px w-full mb-4" style={{ background: T.borderDim }} />
                <div className="flex items-center justify-between">
                    <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: T.muted }}>
                        Witness
                    </p>
                    {isSolved && speakerName ? (
                        <p className="text-[12px] tracking-[0.14em] uppercase font-bold" style={{ color: T.gold }}>
                            {speakerName}
                        </p>
                    ) : (
                        <div
                            className="h-[15px] w-32"
                            style={{
                                background: 'repeating-linear-gradient(45deg, #151312 0 6px, #0c0a09 6px 10px)',
                            }}
                            aria-hidden="true"
                        />
                    )}
                </div>
            </div>

            <SecurityStrip bottom />
        </div>
    );
}