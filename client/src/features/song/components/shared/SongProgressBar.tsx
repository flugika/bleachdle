// src/features/song/components/shared/SongProgressBar.tsx
'use client';

import { SONG_REVEAL_STAGES_MS } from '@/src/features/song/constants';

interface SongProgressBarProps {
    currentTimeMs: number;
    revealMs: number;
    durationMs?: number;
    /** 🆕 คุมว่าจะเปิด glow/shimmer animation ไหม (หยุดเล่น = หลอดนิ่ง ไม่ต้องขยับ) */
    isPlaying?: boolean;
}

export const SongProgressBar = ({
    currentTimeMs,
    revealMs,
    durationMs = 10000, // ล็อกเพดานสูงสุดที่ 10 วินาทีตามกติกาเสียงพรีวิว
    isPlaying = false,
}: SongProgressBarProps) => {
    const safeCurrent = Math.min(currentTimeMs, durationMs);
    const safeReveal = Math.min(revealMs, durationMs);

    const currentPercent = (safeCurrent / durationMs) * 100;
    const revealPercent = (safeReveal / durationMs) * 100;

    return (
        <div className="w-full flex flex-col gap-2 select-none">
            <style>{`
                /* 🆕 ล็อกเป้าหมายปลายทางคลื่นไว้ที่ Max Range ของรอบนั้นผ่าน CSS Variable */
                @keyframes song-shimmer {
                    0% { left: -120px; }
                    100% { left: var(--reveal-percent); }
                }
                @keyframes reveal-window-pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                }
            `}</style>

            {/* 🎛️ PROGRESS BAR CONTAINER */}
            <div className="relative w-full h-3 bg-gradient-to-b from-[#030304] to-[#08080c] border border-[#c8a96e]/20 rounded-sm overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),inset_0_-1px_2px_rgba(200,169,110,0.05)]">

                {/* LAYER 0: เส้นแสงบางๆ ไล่ตามขอบบนสุด */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* LAYER 1: Area ปลดล็อกให้ฟังได้ตามรอบการเดา */}
                <div
                    className="absolute top-0 left-0 h-full bg-[#c8a96e]/15 border-r-2 border-[#c8a96e]/50"
                    style={{ width: `${revealPercent}%` }}
                >
                    <div className="absolute inset-0 bg-[#c8a96e]/10 animate-[reveal-window-pulse_2.4s_ease-in-out_infinite]" />
                </div>

                {/* LAYER 2: หลอดเสียงที่กำลังเล่นจริง (ถอดคลื่น Shimmer อันเก่าออกเพื่อให้หลอดทำหน้าที่แสดงความกว้างเรียบเนียนอย่างเดียว) */}
                <div
                    className={[
                        'absolute top-0 left-0 h-full bg-gradient-to-r from-[#8a6d3a] via-[#c8a96e] to-[#f5ebd5]',
                        isPlaying ? 'shadow-[0_0_16px_rgba(200,169,110,0.9)]' : 'shadow-[0_0_8px_rgba(200,169,110,0.4)]',
                    ].join(' ')}
                    style={{ width: `${currentPercent}%` }}
                />

                {/* 🆕 LAYER 2.5: คลื่น Shimmer ไล่แสงระบบปิดกั้นขอบเขต
                    - ตัวคลื่นวิ่งกวาดสายตาจาก 0 ไปจนถึง Max Range (`revealPercent`) ด้วยขนาดความกว้างคงที่พรีเมียม
                    - ใช้ `clipPath: inset` คอยหั่นเนื้อหาฝั่งขวาที่เพลงยังเล่นไปไม่ถึงทิ้งทันที คลื่นจึงไม่มีวันโผล่ไปในพื้นที่มืด */}
                {isPlaying && (
                    <div
                        className="absolute inset-0 pointer-events-none overflow-hidden"
                        style={{
                            clipPath: `inset(0 ${100 - currentPercent}% 0 0)`, // ซ่อนส่วนเกินขวาหัวเล่น
                            ['--reveal-percent' as any]: `${revealPercent}%`, // ส่งค่าเป้าหมายให้ Keyframes
                        }}
                    >
                        <div className="absolute top-0 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent w-[100px] animate-[song-shimmer_1.3s_linear_infinite]" />
                    </div>
                )}

                {/* LAYER 3: จุดเรืองแสงหัวหลอด */}
                {isPlaying && currentPercent > 0 && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.8)]"
                        style={{ left: `calc(${currentPercent}% - 3px)` }}
                    />
                )}

                {/* LAYER 4: ขีดตัดแบ่ง Segment ย่อย */}
                {SONG_REVEAL_STAGES_MS.map((stageMs) => {
                    if (stageMs >= durationMs) return null;
                    const leftPercent = (stageMs / durationMs) * 100;
                    const isPassed = stageMs <= safeReveal;
                    return (
                        <div
                            key={`divider-${stageMs}`}
                            className={[
                                'absolute top-0 bottom-0 z-10 transition-colors duration-300',
                                isPassed
                                    ? 'w-[2px] bg-[#f5ebd5]/70 shadow-[0_0_6px_rgba(245,235,213,0.6)]'
                                    : 'w-px bg-[#5a2626]/50',
                            ].join(' ')}
                            style={{ left: `${leftPercent}%` }}
                        />
                    );
                })}
            </div>

            {/* ⏱️ ตัวเลขบอกเวลาสไตล์ Digital Mono */}
            <div className="flex justify-between items-center text-[11px] font-mono font-bold tracking-widest text-[#e2c992]">
                <span>{formatMsToTime(safeCurrent)}</span>
                <span>{formatMsToTime(durationMs)}</span>
            </div>
        </div>
    );
};

function formatMsToTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${millis}`;
}