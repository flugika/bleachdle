// src/shared/ui/pairing/RemoteProgressBanner.tsx
'use client';

interface RemoteProgressBannerProps {
    updatedAt: string;
    onDismiss: () => void;
    onLoad?: () => void;
}

export function RemoteProgressBanner({ updatedAt, onDismiss, onLoad }: RemoteProgressBannerProps) {
    const relativeTime = formatRelativeTime(updatedAt);

    return (
        <div className="relative mb-4 px-5 py-4 bg-[#c8a96e]/[0.05] border border-[#c8a96e]/25 overflow-hidden max-w-lg mx-auto">
            {/* corner brackets */}
            <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#c8a96e]/50" />
            <span className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#c8a96e]/50" />
            <span className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#c8a96e]/50" />
            <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#c8a96e]/50" />

            <div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r
                           from-transparent via-[#c8a96e]/[0.12] to-transparent
                           animate-shimmer pointer-events-none"
            />

            {/* 🆕 เปลี่ยนจาก flex-row + flex-wrap เป็น column เต็มรูปแบบ —
                เดิมพึ่ง flex-wrap ให้ปุ่มตกไปแถวล่างเอง แต่ wrap แล้วยังชิดซ้าย
                ตาม flex ปกติ ไม่ชิดขวาตามที่ต้องการ ต้องคุม layout เองทั้งสอง
                แถวแทน ไม่ปล่อยให้ wrap ตัดสินใจ */}
            <div className="relative flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-[#c8a96e] text-base leading-none animate-pulse">◆</span>
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-[#c8a96e]/60 mb-1">
                            External Reiatsu Detected
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-[#c8a96e] font-bold">
                            Round In Progress On Another Terminal
                        </div>
                        <div className="text-[9px] uppercase tracking-[0.1em] text-[#8a8078] mt-1">
                            Last resonance · {relativeTime}
                        </div>
                    </div>
                </div>

                {/* 🆕 แถวปุ่มแยกออกมา ชิดขวาเสมอด้วย justify-end ไม่ว่ากว้างแคบแค่ไหน */}
                <div className="flex items-center gap-4 justify-end">
                    <button
                        onClick={onDismiss}
                        className="text-[10px] uppercase tracking-[0.14em] text-[#8a8078]/70 hover:text-[#8a8078] font-bold transition-colors"
                    >
                        Dismiss
                    </button>

                    {onLoad && (
                        <button
                            onClick={onLoad}
                            className="relative px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-bold
                                       text-[#0f0d0a] bg-[#c8a96e] hover:bg-[#e0c088]
                                       transition-colors duration-200"
                        >
                            Load Record
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatRelativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}