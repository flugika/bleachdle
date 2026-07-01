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
}

// 🎨 โทนสีของกรอบและพื้นหลัง Modal
const variantStyles: Record<ModalVariant, string> = {
    default: "bg-[#0e0e1a] border-[#c8a96e]/50", // สีม่วงน้ำเงิน Casual Reiatsu
    success: "bg-[#0d2918] border-[#c8a96e]",   // สีเขียว Kido
    danger: "bg-[#1a0808] border-[#c8a96e]",    // สีแดง Hollow
};

// 🎨 โทนสีของปุ่ม Confirm ที่จะแปรผันตาม Variant
const confirmBtnStyles: Record<ModalVariant, string> = {
    default: "bg-[#111122]/60 hover:bg-[#1a1a3a] border-[#c8a96e]/40 hover:border-[#c8a96e]/80 text-[#8b7bba] hover:text-[#d8d0c8]",
    success: "bg-[#0d2918]/60 hover:bg-[#154226] border-[#c8a96e]/30 hover:border-[#c8a96e]/60 text-[#4de880]/80 hover:text-[#d8d0c8]",
    danger: "bg-[#590e0e]/40 hover:bg-[#590e0e] border-[#c8a96e]/30 hover:border-[#c8a96e]/60 text-[#db6767]/80 hover:text-[#d8d0c8]",
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
    hideCancel = false
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-exit">
            <div
                ref={modalRef}
                className={`w-full ${maxWidth} border border-2 p-8 shadow-2xl text-[#d8d0c8] max-h-[90vh] overflow-y-auto 
                    flex flex-col transition-colors duration-300 ${variantStyles[variant]} ${className} cursor-default`}
            >
                {title && (
                    <h2 className={`text-2xl md:text-3xl font-bold text-[#c8a96e] mb-6 uppercase tracking-[0.2em] ${textAlignClass}`}
                        style={{ fontFamily: "'Cinzel', serif" }}>
                        {title}
                    </h2>
                )}

                {/* Content Area */}
                <div className="flex-1">
                    {children}
                </div>

                {/* ⚔️ DYNAMIC ACTION BUTTONS (Render อัตโนมัติเมื่อส่ง onConfirm มา) */}
                {onConfirm && (
                    <div className="flex w-full gap-3 mt-8 pt-4 border-neutral-800/50">
                        {!hideCancel && (
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 border border-neutral-800 hover:border-neutral-600 text-neutral-500 hover:text-neutral-300 text-[10px] tracking-[0.2em] uppercase font-mono transition-all duration-200 cursor-pointer"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            className={`flex-1 py-2.5 border text-[10px] tracking-[0.2em] uppercase font-mono transition-all duration-200 cursor-pointer ${confirmBtnStyles[variant]}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};