// src/features/release/components/shared/ReleaseTestimonyDisplay.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { BleachRelease } from '@/src/entities/release/schema';
import { generateCaseFileId } from '@/src/lib/utils/generateCaseFileId';
import { FactoryReleaseTarget } from '@/src/features/release/hooks/unlimited/useReleaseGame';

interface ReleaseTestimonyDisplayProps {
    target: FactoryReleaseTarget;
    isSolved?: boolean;
    speakerName?: string;
    wielderImage?: string | null;
}

const T = {
    void: '#080605',
    parchment: '#15110c',
    parchmentMid: '#1d1712',
    edge: '#3a2f20',
    gold: '#c9a45e',
    goldDim: '#4a3f2c',
    ink: '#f1e8d8',
    sub: '#948c7c',
    jade: '#39e6b8',
    vermillion: '#c23b32',
};

const AUDIO_BASE = '/assets/audio/releases/';

function typeTheme(releaseType: string) {
    const key = releaseType.toLowerCase();
    if (key.includes('bankai')) return { c: '#e8b34a', d: '#241a06', kanji: '卍解' };
    if (key.includes('shikai')) return { c: '#8fb8e8', d: '#0a1c2c', kanji: '始解' };
    if (key.includes('resurrec')) return { c: '#ff7a52', d: '#2c1006', kanji: '解放' };
    if (key.includes('segunda')) return { c: '#b083e0', d: '#1a0e28', kanji: '第二' };
    if (key.includes('vollst') || key.includes('quincy')) return { c: '#5fd8d0', d: '#08201d', kanji: '完聖体' };
    if (key.includes('shunko')) return { c: '#e2e8f0', d: '#161c26', kanji: '瞬閧' };
    return { c: T.gold, d: '#241c10', kanji: '解' };
}

function sealRimPath(cx: number, cy: number, rOuter: number, rInner: number, teeth: number) {
    const pts: string[] = [];
    const step = (Math.PI * 2) / (teeth * 2);
    for (let i = 0; i < teeth * 2; i++) {
        const r = i % 2 === 0 ? rOuter : rInner;
        const a = i * step - Math.PI / 2;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(' ') + ' Z';
}

function GuillocheMark({ size = 340, opacity = 0.05, style }: { size?: number; opacity?: number; style?: React.CSSProperties }) {
    const rings = [0.98, 0.86, 0.74, 0.62, 0.5, 0.38];
    return (
        <svg width={size} height={size} viewBox="0 0 200 200" className="absolute pointer-events-none" style={{ opacity, ...style }}>
            {rings.map((r, i) => (
                <circle key={i} cx="100" cy="100" r={100 * r} fill="none" stroke={T.gold} strokeWidth="0.5" strokeDasharray={i % 2 === 0 ? '2 3' : undefined} />
            ))}
            {Array.from({ length: 24 }).map((_, i) => {
                const a = (i / 24) * Math.PI * 2;
                return <line key={i} x1={100 + 38 * Math.cos(a)} y1={100 + 38 * Math.sin(a)} x2={100 + 98 * Math.cos(a)} y2={100 + 98 * Math.sin(a)} stroke={T.gold} strokeWidth="0.4" />;
            })}
        </svg>
    );
}

function TextureOverlay() {
    return (
        <>
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
                style={{
                    backgroundImage: `repeating-linear-gradient(60deg, ${T.gold} 0px, ${T.gold} 1px, transparent 1px, transparent 26px),
                                       repeating-linear-gradient(-60deg, ${T.gold} 0px, ${T.gold} 1px, transparent 1px, transparent 26px),
                                       repeating-linear-gradient(0deg, ${T.gold} 0px, ${T.gold} 1px, transparent 1px, transparent 45px)`,
                }}
            />
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.5] mix-blend-overlay"
                style={{
                    backgroundImage: `radial-gradient(1.5px 1.5px at 12% 22%, rgba(0,0,0,0.5) 40%, transparent 41%),
                                       radial-gradient(2px 2px at 78% 64%, rgba(0,0,0,0.4) 40%, transparent 41%),
                                       radial-gradient(1px 1px at 40% 85%, rgba(0,0,0,0.4) 40%, transparent 41%),
                                       radial-gradient(1.5px 1.5px at 88% 15%, rgba(0,0,0,0.4) 40%, transparent 41%)`,
                }}
            />
        </>
    );
}

function CornerFret({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
    const rot = { tl: 0, tr: 90, bl: -90, br: 180 }[pos];
    const side: any = {};
    if (pos === 'tl') { side.top = 10; side.left = 10; }
    if (pos === 'tr') { side.top = 10; side.right = 10; }
    if (pos === 'bl') { side.bottom = 10; side.left = 10; }
    if (pos === 'br') { side.bottom = 10; side.right = 10; }
    return (
        <svg width="30" height="30" viewBox="0 0 26 26" className="absolute z-10 pointer-events-none" style={{ ...side, transform: `rotate(${rot}deg)`, opacity: 0.6 }}>
            <path d="M1 1 H16 M1 1 V16" stroke={T.gold} strokeWidth="1.5" fill="none" />
            <path d="M1 21 H8 M21 1 V8" stroke={T.gold} strokeWidth="1.5" fill="none" />
            <rect x="0.5" y="0.5" width="4" height="4" stroke={T.gold} strokeWidth="1" fill="none" transform="rotate(45 2.5 2.5)" />
        </svg>
    );
}

function ReleaseTypeBadge({ type }: { type: string }) {
    const t = typeTheme(type);
    const clipShape = 'polygon(10px 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0% 50%)';
    const rim = sealRimPath(30, 30, 27, 23, 16);

    return (
        <div className="relative shrink-0" style={{ filter: `drop-shadow(0 0 10px ${t.c}55)` }}>
            <div className="relative h-8 sm:h-11 flex items-center" style={{ transformOrigin: 'right top' }}>
                <div className="absolute inset-0 w-full h-full" style={{ background: t.c, clipPath: clipShape }} />
                <div className="absolute inset-[1.5px] w-[calc(100%-3px)] h-[calc(100%-3px)]" style={{ background: `linear-gradient(90deg, ${t.d}, #060504, ${t.d})`, clipPath: clipShape }} />
                <div className="relative z-10 flex flex-col items-center px-4 pl-6 sm:px-8 sm:pl-10">
                    <span className="text-[10px] sm:text-[15px] tracking-[0.18em] sm:tracking-[0.28em] font-black uppercase leading-none whitespace-nowrap" style={{ color: t.c, textShadow: `0 0 10px ${t.c}` }}>
                        {type}
                    </span>
                    <span className="hidden sm:block text-[7px] tracking-[0.3em] uppercase mt-1 opacity-70 whitespace-nowrap" style={{ color: t.c }}>
                        Release Classification
                    </span>
                </div>
            </div>
            <div className="absolute -top-2 -left-2 sm:-top-3.5 sm:-left-3.5 z-20" style={{ transform: 'rotate(-10deg)' }}>
                <svg viewBox="0 0 60 60" width="26" height="26" className="sm:w-[42px] sm:h-[42px]">
                    <defs>
                        <radialGradient id={`badgeFace-${type}`} cx="50%" cy="45%" r="65%">
                            <stop offset="0%" stopColor={t.d} />
                            <stop offset="100%" stopColor="#050403" />
                        </radialGradient>
                    </defs>
                    <path d={rim} fill="none" stroke={t.c} strokeWidth="1.4" opacity="0.9" />
                    <circle cx="30" cy="30" r="21" fill={`url(#badgeFace-${type})`} stroke={t.c} strokeWidth="0.8" />
                    <text x="30" y="37" textAnchor="middle" fontSize="16" fontWeight={900} fill={t.c} style={{ textShadow: `0 0 6px ${t.c}` }}>
                        {t.kanji}
                    </text>
                </svg>
            </div>
        </div>
    );
}

/* 🛠️ ปรับ Player ให้เพรียวขึ้นเมื่อเป็นแนวนอน (Certificate Style) */
function InvokeWardPlayer({ audioUrl, clipEndMs, layout = 'vertical' }: { audioUrl: string; clipEndMs?: number | null; layout?: 'vertical' | 'horizontal' }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        const el = audioRef.current;
        if (!el || !clipEndMs) return;
        const onTime = () => { if (el.currentTime * 1000 >= clipEndMs) { el.pause(); setPlaying(false); } };
        el.addEventListener('timeupdate', onTime);
        return () => el.removeEventListener('timeupdate', onTime);
    }, [clipEndMs]);

    const handlePlay = () => {
        const el = audioRef.current;
        if (!el) return;
        el.pause(); el.currentTime = 0;
        const playPromise = el.play();
        if (playPromise !== undefined) playPromise.then(() => setPlaying(true)).catch(() => setPlaying(false));
    };

    const isHz = layout === 'horizontal';
    const btnSize = isHz ? 34 : 64; // ย่อปุ่มลงให้กระทัดรัดเหมือนตราประทับเล็กๆ

    return (
        <div className={`relative z-10 flex ${isHz ? 'flex-row items-center gap-1 px-6' : 'flex-col items-center justify-center'}`}>
            <audio ref={audioRef} src={`${AUDIO_BASE}${audioUrl}`} onEnded={() => setPlaying(false)} preload="none" />
            <button
                type="button" onClick={handlePlay}
                className="group relative flex items-center justify-center outline-none transition-transform active:scale-95 shrink-0"
                style={{ width: btnSize, height: btnSize }}
            >
                {playing && <span className="absolute inset-0 rounded-full border border-[#c9a45e] animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                <span className="absolute inset-1 rounded-full transition-all duration-300" style={{ border: `1px solid ${playing ? T.gold : T.goldDim}`, boxShadow: playing ? `0 0 15px ${T.gold}88, inset 0 0 10px ${T.gold}44` : 'none', background: T.parchmentMid }} />
                <svg className={`relative z-10 ${isHz ? 'w-3.5 h-3.5' : 'w-6 h-6'} transition-colors ${playing ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-[#c9a45e] group-hover:text-white'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
            <div className={`flex ${isHz ? 'items-center gap-[3px]' : 'mt-3 items-end justify-center gap-[3px] h-3'}`}>
                {Array.from({ length: 7 }).map((_, i) => (
                    <span
                        key={i}
                        className={`w-[2px] bg-[#c9a45e] transition-all duration-75 ${isHz ? 'rounded-full' : 'rounded-t-sm'}`}
                        style={{
                            height: playing
                                ? `${Math.max(isHz ? 4 : 4, Math.random() * (isHz ? 14 : 12))}px`
                                : (isHz ? '4px' : '3px'),
                            opacity: playing ? 0.9 : 0.3
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function VerificationHanko({ isSolved, accent }: { isSolved: boolean; accent: string }) {
    const label = isSolved ? '認可 VERIFIED • 認可 VERIFIED • ' : '封印 SEALED • 封印 SEALED • ';
    const ringPath = 'M50,50 m-34,0 a34,34 0 1,1 68,0 a34,34 0 1,1 -68,0';
    return (
        <div className="absolute bottom-5 right-5 z-20 pointer-events-none" style={{ filter: `drop-shadow(0 0 8px ${accent}66)` }}>
            <svg viewBox="0 0 100 100" width="78" height="78" style={{ transform: 'rotate(-9deg)' }}>
                <defs><path id="hankoRing" d={ringPath} /></defs>
                <circle cx="50" cy="50" r="42" fill="none" stroke={accent} strokeWidth="2" opacity="0.85" />
                <circle cx="50" cy="50" r="37" fill="none" stroke={accent} strokeWidth="0.6" opacity="0.5" strokeDasharray="1 2.4" />
                <text fill={accent} fontSize="6" letterSpacing="1.6" fontWeight={800}>
                    <textPath href="#hankoRing" startOffset="0%">{label.repeat(2)}</textPath>
                </text>
                <text x="50" y="57" textAnchor="middle" fontSize="20" fontWeight={900} fill={accent} style={{ textShadow: isSolved ? `0 0 10px ${accent}` : 'none' }}>
                    {isSolved ? '認' : '封'}
                </text>
                <circle cx="50" cy="50" r="44" fill={accent} opacity="0.05" />
            </svg>
        </div>
    );
}

export function ReleaseTestimonyDisplay({ target, isSolved = false, speakerName, wielderImage }: ReleaseTestimonyDisplayProps) {
    const caseNo = generateCaseFileId(target.id);
    const accent = isSolved ? T.jade : T.vermillion;

    return (
        <div className="w-full max-w-2xl mx-auto my-4 animate-fade-in relative">
            <div
                className="relative overflow-hidden flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-6 md:p-9"
                style={{
                    background: `linear-gradient(155deg, ${T.parchmentMid} 0%, ${T.parchment} 55%, ${T.void} 100%)`,
                    border: `1px solid ${isSolved ? `${T.jade}88` : T.edge}`,
                    boxShadow: `inset 0 0 0 1px ${T.void}, inset 0 0 40px rgba(0,0,0,0.6)`,
                }}
            >
                <div className="absolute inset-[7px] border pointer-events-none z-10" style={{ borderColor: `${T.gold}33` }} />
                <CornerFret pos="tl" /><CornerFret pos="tr" /><CornerFret pos="bl" /><CornerFret pos="br" />
                <TextureOverlay />
                <GuillocheMark size={300} opacity={0.06} style={{ top: -80, left: -80 }} />
                <GuillocheMark size={260} opacity={0.05} style={{ bottom: -70, left: '30%' }} />

                <div
                    className="absolute top-0 right-0 w-2/3 h-full pointer-events-none opacity-40 mix-blend-screen"
                    style={{ maskImage: 'linear-gradient(to right, transparent, black 60%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)' }}
                >
                    {wielderImage ? (
                        <img src={wielderImage} alt="wielder bg" className="absolute right-0 top-1/2 -translate-y-1/2 h-[150%] object-cover opacity-60 filter grayscale brightness-125 contrast-150" />
                    ) : (
                        <span className="absolute right-4 bottom-[-10%] text-[150px] font-black opacity-10" style={{ color: accent }}>卍</span>
                    )}
                </div>

                <div className="relative z-10 flex justify-between items-start gap-3 w-full mb-4">
                    <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.25em] uppercase mb-1 flex items-center gap-1.5 whitespace-nowrap" style={{ color: T.sub, opacity: 0.85 }}>
                            <span className={`flex ${isSolved ? "flex-row" : "flex-col"} md:flex-row gap-1`}>
                                <span className='gap-1 flex'><span style={{ color: T.gold }}>柒</span><span>霊剣解放記録</span></span>
                                <span>// Release Record</span>
                            </span>
                        </p>
                        <p className="text-[11px] sm:text-[12px] font-mono tracking-[0.15em] truncate" style={{ color: T.gold }}>ID: {caseNo}</p>
                        <p className="text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] uppercase mt-3 whitespace-nowrap" style={{ color: T.sub, opacity: 0.6 }}>中央四十六室 // Central 46 Archive</p>
                    </div>
                    <div className="shrink-0">
                        <ReleaseTypeBadge type={target.release_type} />
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-3 mb-4 opacity-40">
                    <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />
                    <span className="w-1.5 h-1.5 rotate-45" style={{ background: T.gold }} />
                    <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }} />
                </div>

                {/* ─── DYNAMIC CONTENT AREA ─── */}
                {isSolved ? (
                    <div className="relative z-10 flex flex-col w-full animate-fade-in-up">

                        <div className="w-full text-center md:text-left mb-6">
                            <h2
                                className="italic font-black mb-1.5 tracking-wide drop-shadow-lg break-words leading-[1.15]"
                                style={{ color: T.ink, textShadow: `0 0 20px ${T.jade}55`, fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}
                            >
                                {target.technique_name}
                            </h2>
                            {target.technique_translation && (
                                <p className="text-[16px] italic break-words opacity-80" style={{ color: T.sub }}>
                                    &ldquo;{target.technique_translation}&rdquo;
                                </p>
                            )}
                        </div>

                        <div className="h-px w-full mb-6 opacity-30" style={{ background: `linear-gradient(90deg, ${T.gold}, transparent)` }} />

                        {/* 🛠️ CERTIFICATE LAYOUT: จัดชิดซ้าย (justify-start) และกั้นขวาหลบ Hanko (pr-[100px]) */}
                        <div className="flex flex-col sm:flex-row justify-start items-start gap-8 sm:gap-12 w-full pr-[90px] relative z-10">

                            {/* ฝั่งซ้ายสุด: Wielder Field */}
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-[9px] tracking-[0.25em] uppercase mb-1.5 flex items-center gap-2 opacity-80" style={{ color: T.sub }}>
                                    <span className="w-4 h-[1px]" style={{ background: T.gold }} />
                                    Wielder
                                </span>
                                <span
                                    className="tracking-[0.08em] font-black uppercase break-words leading-tight"
                                    style={{ color: T.gold, textShadow: `0 0 12px ${T.gold}44`, fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)' }}
                                >
                                    {speakerName}
                                </span>
                            </div>

                            {/* ถัดมา: Audio Player Field (ทำเป็นฟิลด์ข้อมูลเหมือนกัน) */}
                            <div className="flex flex-col items-start shrink-0">
                                <span className="text-[9px] tracking-[0.25em] uppercase mb-1.5 flex items-center gap-2 opacity-80" style={{ color: T.sub }}>
                                    <span className="w-4 h-[1px]" style={{ background: T.gold }} />
                                    Reiatsu Signature
                                </span>
                                {/* กล่อง Player เพรียวๆ สไตล์ Data Field */}
                                <div className="relative p-1.5 px-3 border mt-1" style={{ borderColor: `${T.gold}33`, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(6px)' }}>
                                    <CornerFret pos="tl" /><CornerFret pos="br" />
                                    <InvokeWardPlayer audioUrl={target.audio_url} clipEndMs={null} layout="horizontal" />
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    /* 🔒 LAYOUT ตอนปกติ (Sealed) */
                    <div className="relative z-10 flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-stretch">
                        <div className="relative flex flex-col items-center justify-center p-5 border shrink-0 min-w-[140px] md:min-w-[190px] w-full md:w-auto" style={{ borderColor: `${T.gold}22`, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
                            <CornerFret pos="tl" /><CornerFret pos="br" />
                            <InvokeWardPlayer audioUrl={target.audio_url} clipEndMs={target.clip_end_ms} />
                            <p className="text-[9px] mt-4 tracking-[0.25em] uppercase text-center" style={{ color: T.sub }}>Reiatsu<br />Signature</p>
                        </div>

                        <div className="flex flex-row md:flex-col items-center justify-between self-stretch w-full md:w-auto md:py-2 opacity-30 shrink-0">
                            <span className="h-px md:w-px flex-1 bg-gradient-to-r md:bg-gradient-to-b from-[#c9a45e] to-transparent" />
                            <span className="px-4 md:px-0 md:py-2 select-none" style={{ color: T.gold, fontSize: 10 }}>封</span>
                            <span className="h-px md:w-px flex-1 bg-gradient-to-r md:bg-gradient-to-b from-transparent to-[#c9a45e]" />
                        </div>

                        <div className="flex flex-col justify-center items-center md:items-start flex-1 min-w-0 w-full pb-4">
                            <div className="py-2 w-full flex flex-col items-center md:items-start">
                                <div className="h-9 w-full max-w-[340px] mb-3 flex items-center justify-center md:justify-start overflow-hidden border relative pointer-events-none" style={{ borderColor: `${T.vermillion}44`, background: 'repeating-linear-gradient(45deg, rgba(30,8,8,0.8) 0 4px, rgba(20,5,5,0.8) 4px 8px)' }}>
                                    <span className="absolute inset-0 bg-[#c23b32]/5 animate-pulse" />
                                    <span className="relative z-10 md:ml-4 text-[13px] tracking-[0.4em] font-black" style={{ color: T.vermillion, opacity: 0.85 }}>非公開 CLASSIFIED</span>
                                </div>
                                <div className="h-2.5 w-full max-w-[220px] mb-2 opacity-20" style={{ background: T.gold }} />
                                <div className="h-2.5 w-full max-w-[130px] opacity-20" style={{ background: T.gold }} />
                            </div>
                        </div>
                    </div>
                )}

                <VerificationHanko isSolved={isSolved} accent={accent} />
                <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: accent, opacity: 0.9, boxShadow: `0 0 15px ${accent}` }} />
            </div>
        </div>
    );
}