import React, { useEffect, useRef } from 'react';

type ModalVariant = 'default' | 'success' | 'danger';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    titleAlign?: 'left' | 'center' | 'right';
    maxWidth?: string;
    variant?: ModalVariant;
    className?: string;
    // ⚙️ เพิ่ม Props สำหรับจัดการปุ่ม Action
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
    // ✨ ใหม่ — มุมกรอบ "เหลี่ยมๆ" premium ยกเข้ามาไว้ใน Modal กลาง ใช้ได้ทุกที่ที่เรียก <Modal>
    // แทนที่จะให้ลูกแต่ละตัว copy span 4 อันไปวางเองซ้ำๆ (แบบที่ AllModesModal เคยทำ)
    showCorners?: boolean;
    // ✨ ใหม่ — ปุ่มปิดกลาง สไตล์เดียวกันทั้งแอป ปิดได้ด้วย showClose={false} ถ้า modal ไหนอยากคุมเอง
    showClose?: boolean;
}

// 🎨 พื้นหลังกล่อง — จากสีเรียบแบน เปลี่ยนเป็น gradient บางๆ ให้มีมิติ ไม่ flat
const variantStyles: Record<ModalVariant, string> = {
    default: "bg-gradient-to-b from-[#13131f] to-[#09090f] border-[#c8a96e]/50", // สีม่วงน้ำเงิน Casual Reiatsu
    success: "bg-gradient-to-b from-[#0f2c1b] to-[#08160e] border-[#c8a96e]/50", // สีเขียว Kido
    danger: "bg-gradient-to-b from-[#230b0b] to-[#130505] border-[#c8a96e]/50",  // สีแดง Hollow
};

// 🎨 แสง glow เบื้องหลังกล่อง แยกสีตาม variant เพื่อให้กล่องดูมีมิติ ไม่ลอยเป็นกรอบเปล่าๆ
const variantGlow: Record<ModalVariant, string> = {
    default: 'rgba(139,123,186,0.14)',
    success: 'rgba(77,232,128,0.12)',
    danger: 'rgba(219,103,103,0.14)',
};

// 🎨 โทนสีของปุ่ม Confirm ที่จะแปรผันตาม Variant
const confirmBtnStyles: Record<ModalVariant, string> = {
    default: "bg-gradient-to-b from-[#1c1c40]/80 to-[#111122]/60 hover:from-[#25254f] hover:to-[#1a1a3a] border-[#c8a96e]/50 hover:border-[#c8a96e]/80 text-[#8b7bba] hover:text-[#eed9c4]",
    success: "bg-gradient-to-b from-[#164a2a]/80 to-[#0d2918]/60 hover:from-[#1e5d34] hover:to-[#154226] border-[#c8a96e]/40 hover:border-[#c8a96e]/70 text-[#4de880]/90 hover:text-[#eed9c4]",
    danger: "bg-gradient-to-b from-[#651010]/70 to-[#3d0a0a]/50 hover:from-[#7d1414] hover:to-[#590e0e] border-[#c8a96e]/40 hover:border-[#c8a96e]/70 text-[#db6767]/90 hover:text-[#eed9c4]",
};

export const Modal = ({
    isOpen,
    onClose,
    children,
    title,
    titleAlign = 'center',
    maxWidth = "max-w-[900px]",
    variant = 'default',
    className = "",
    onConfirm,
    confirmText = "Confirm",
    cancelText = "Cancel",
    hideCancel = false,
    showCorners = true,
    showClose = true,
}: ModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const textAlignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    }[titleAlign];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4 animate-in fade-in duration-300 cursor-exit">
            {/* 🖤 scrollbar premium เฉพาะของ Modal — แก้บั๊ก scrollbar ขาวๆ ของ browser
                ที่โผล่มาชนกับมุมกรอบตกแต่ง (ของเดิม: overflow-y-auto กับมุม decor
                อยู่ใน element เดียวกันที่ position:relative เดียวกัน เลยซ้อนทับกันตอน scroll) */}
            {/* 🧱 กรอบนอก — ตัวนี้ "ไม่ scroll" ถือ border + มุม decor เท่านั้น
                กันไม่ให้มุม decor ไปชนกับ native scrollbar อีก (แยกชั้นกันเด็ดขาด) */}
            <div
                ref={modalRef}
                className={`relative w-full ${maxWidth} border-2 shadow-[0_26px_70px_rgba(0,0,0,0.6)] animate-in zoom-in-95 fade-in duration-300 ease-out ${variantStyles[variant]} ${className}`}
            >
                {/* แสง glow เบื้องหลังกล่อง สีเปลี่ยนตาม variant */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${variantGlow[variant]} 0%, transparent 70%)`, filter: 'blur(210px)' }}
                />

                {/* ⬛ มุมกรอบ premium — reusable กลาง ใช้ได้ทุก <Modal>, ปิดได้ด้วย showCorners={false}
                    ทยอยเข้า (stagger) ทีละมุมตอนเปิด แทนที่จะโผล่มาพร้อมกันทื่อๆ */}
                {showCorners && (
                    <>
                        <span className="absolute -top-[4px] -left-[4px] w-6 h-6 border-t-[5px] border-l-[5px] border-[#e8c789] [animation:premium-corner-in_0.35s_ease-out_0.05s_both] pointer-events-none drop-shadow-[0_0_10px_rgba(200,169,110,0.65)]" />
                        <span className="absolute -top-[4px] -right-[4px] w-6 h-6 border-t-[5px] border-r-[5px] border-[#e8c789] [animation:premium-corner-in_0.35s_ease-out_0.1s_both] pointer-events-none drop-shadow-[0_0_10px_rgba(200,169,110,0.65)]" />
                        <span className="absolute -bottom-[4px] -left-[4px] w-6 h-6 border-b-[5px] border-l-[5px] border-[#e8c789] [animation:premium-corner-in_0.35s_ease-out_0.15s_both] pointer-events-none drop-shadow-[0_0_10px_rgba(200,169,110,0.65)]" />
                        <span className="absolute -bottom-[4px] -right-[4px] w-6 h-6 border-b-[5px] border-r-[5px] border-[#e8c789] [animation:premium-corner-in_0.35s_ease-out_0.2s_both] pointer-events-none drop-shadow-[0_0_10px_rgba(200,169,110,0.65)]" />
                    </>
                )}

                {/* 📜 กล่องเนื้อในจริง — scroll เฉพาะชั้นนี้ชั้นเดียว, ไม่ยุ่งกับกรอบ/มุมชั้นนอก */}
                <div className="premium-modal-scroll relative bg-transparent max-h-[90vh] overflow-y-auto p-8 flex flex-col">
                    {showClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="btn-close group absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#eed9c4]/50 hover:text-[#eed9c4] hover:border-[#c8a96e]/60 hover:bg-[#c8a96e]/[0.1] hover:shadow-[0_0_18px_rgba(200,169,110,0.4)] transition-all duration-300 z-10 cursor-pointer"
                        >
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="transition-transform duration-300 group-hover:rotate-90">
                                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}

                    {title && (
                        <h2 className={`text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#eed9c4] via-[#eed9c4] to-[#c8a96e] mb-6 uppercase tracking-[0.2em] ${textAlignClass}`}>
                            {title}
                        </h2>
                    )}

                    {/* Content Area */}
                    <div className="flex-1">
                        {children}
                    </div>

                    {/* ⚔️ DYNAMIC ACTION BUTTONS (Render อัตโนมัติเมื่อส่ง onConfirm มา) */}
                    {onConfirm && (
                        <div className="flex w-full gap-3 mt-8 pt-4 border-t border-white/5">
                            {!hideCancel && (
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 border border-neutral-800 hover:border-neutral-600 text-neutral-500 hover:text-neutral-300 text-[12px] tracking-[0.2em] uppercase font-mono transition-all duration-200 cursor-pointer hover:-translate-y-px"
                                >
                                    {cancelText}
                                </button>
                            )}
                            <button
                                onClick={onConfirm}
                                className={`flex-1 py-2.5 border text-[12px] tracking-[0.2em] uppercase font-mono transition-all duration-200 cursor-pointer hover:-translate-y-px ${confirmBtnStyles[variant]}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};