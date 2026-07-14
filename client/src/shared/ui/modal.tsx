import React, { useEffect, useRef, useState } from 'react';

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
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    hideCancel?: boolean;
    showCorners?: boolean;
    showClose?: boolean;
}

const variantStyles: Record<ModalVariant, string> = {
    default: "bg-gradient-to-b from-[#13131f] to-[#09090f] border-[#c8a96e]/50",
    success: "bg-gradient-to-b from-[#0f2c1b] to-[#08160e] border-[#c8a96e]/50",
    danger: "bg-gradient-to-b from-[#230b0b] to-[#130505] border-[#c8a96e]/50",
};

const variantGlow: Record<ModalVariant, string> = {
    default: 'rgba(139,123,186,0.14)',
    success: 'rgba(77,232,128,0.12)',
    danger: 'rgba(219,103,103,0.14)',
};

// 🌟 สีของ reiatsu burst ตอนเปิด — แยกตาม variant ให้เข้ากับโทนกล่อง
const variantReiatsu: Record<ModalVariant, string> = {
    default: 'rgba(200,169,110,0.55)',
    success: 'rgba(77,232,128,0.5)',
    danger: 'rgba(219,103,103,0.55)',
};

const confirmBtnStyles: Record<ModalVariant, string> = {
    default: "bg-gradient-to-b from-[#1c1c40]/80 to-[#111122]/60 hover:from-[#25254f] hover:to-[#1a1a3a] border-[#c8a96e]/50 hover:border-[#c8a96e]/80 text-[#8b7bba] hover:text-[#eed9c4]",
    success: "bg-gradient-to-b from-[#164a2a]/80 to-[#0d2918]/60 hover:from-[#1e5d34] hover:to-[#154226] border-[#c8a96e]/40 hover:border-[#c8a96e]/70 text-[#4de880]/90 hover:text-[#eed9c4]",
    danger: "bg-gradient-to-b from-[#651010]/70 to-[#3d0a0a]/50 hover:from-[#7d1414] hover:to-[#590e0e] border-[#c8a96e]/40 hover:border-[#c8a96e]/70 text-[#db6767]/90 hover:text-[#eed9c4]",
};

// ⏱️ ต้องตรงกับ duration ของ animation ปิดจริงๆ ไม่งั้น unmount ก่อน/หลัง animation จบ
const CLOSE_ANIMATION_MS = 320;

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

    // 🌟 คั่น "ถูกสั่งปิด" (isOpen=false) กับ "ยังอยู่ใน DOM จริงๆ" (shouldRender) แยกกัน
    // เพื่อให้มีเวลาเล่น exit animation ก่อน unmount — ของเดิม return null ทันทีเลยไม่มีทาง
    // เห็น animation ปิดได้เลยเพราะ React ลบ element ออกจาก DOM ในเฟรมเดียวกัน
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
            // 🔒 ล็อก Scroll Page ทันทีที่เปิด Modal ตัวไหนก็ตาม
            document.body.style.overflow = 'hidden';
        } else if (shouldRender) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
                // 🔓 ปลดล็อก Scroll Page *หลังจาก* เล่น Exit Animation จบแล้ว (320ms) ไม่กระตุกแน่นอน
                document.body.style.overflow = '';
            }, CLOSE_ANIMATION_MS);
            return () => clearTimeout(timer);
        }

        // กันเหนียว: คืนค่าปกติให้ body เผื่อ Component โดนสลับหน้าหรือ Unmount กะทันหัน
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, shouldRender]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!shouldRender) return null;

    const textAlignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    }[titleAlign];

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4 cursor-exit ${isClosing
                ? '[animation:backdrop-fade-out_320ms_ease-out_both]'
                : '[animation:backdrop-fade-in_300ms_ease-out_both]'
                }`}
        >
            <div
                ref={modalRef}
                className={`relative w-full ${maxWidth} border-2 shadow-[0_26px_70px_rgba(0,0,0,0.6)] ${variantStyles[variant]} ${className} ${isClosing
                    ? '[animation:soul-dissolve-out_320ms_ease-out_both]'
                    : '[animation:reiatsu-summon-in_320ms_cubic-bezier(0.22,1,0.36,1)_both]'
                    }`}
            >
                {/* 💥 Reiatsu flash — ทำให้เบาลง + sync duration ให้จบพร้อมๆกับ summon-in
                    (ของเดิม 450ms ยาวกว่า summon-in 380ms ทำให้เห็นแสงค้างวูบวาบหลังกล่องนิ่งแล้ว) */}
                {!isClosing && (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 [animation:reiatsu-flash-out_320ms_ease-out_both]"
                        style={{ background: `radial-gradient(ellipse at 50% 50%, ${variantReiatsu[variant]} 0%, transparent 65%)`, filter: 'blur(40px)' }}
                    />
                )}

                {/* 🔧 glow เบื้องหลังถาวร (blur 210px หนักมาก) — ไม่ต้อง animate เลย โผล่มาพร้อม
                    กล่องแบบ static ไปเลย ลด paint cost ที่แข่งกับ animation อื่นตอนเฟรมแรกๆ ของการเปิด */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${variantGlow[variant]} 0%, transparent 70%)`, filter: 'blur(210px)' }}
                />

                {showCorners && !isClosing && (
                    <>
                        <span className="absolute -top-[4px] -left-[4px] w-6 h-6 border-t-[5px] border-l-[5px] border-[#e8c789] [animation:premium-corner-in_0.35s_ease-out_0.05s_both] pointer-events-none drop-shadow-[0_0_10px_rgba(200,169,110,0.65)]" />
                        <span className="absolute -top-[4px] -right-[4px] w-6 h-6 border-t-[5px] border-r-[5px] border-[#e8c789] [animation:premium-corner-in_0.35s_ease-out_0.1s_both] pointer-events-none drop-shadow-[0_0_10px_rgba(200,169,110,0.65)]" />
                        <span className="absolute -bottom-[4px] -left-[4px] w-6 h-6 border-b-[5px] border-l-[5px] border-[#e8c789] [animation:premium-corner-in_0.35s_ease-out_0.15s_both] pointer-events-none drop-shadow-[0_0_10px_rgba(200,169,110,0.65)]" />
                        <span className="absolute -bottom-[4px] -right-[4px] w-6 h-6 border-b-[5px] border-r-[5px] border-[#e8c789] [animation:premium-corner-in_0.35s_ease-out_0.2s_both] pointer-events-none drop-shadow-[0_0_10px_rgba(200,169,110,0.65)]" />
                    </>
                )}

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
                        <h2 className={`text-2xl md:text-3xl font-[family-name:var(--font-display)] font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#eed9c4] via-[#eed9c4] to-[#c8a96e] mb-6 uppercase tracking-[0.2em] ${textAlignClass}`}>
                            {title}
                        </h2>
                    )}

                    <div className="flex-1">
                        {children}
                    </div>

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