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
}

const variantStyles: Record<ModalVariant, string> = {
    default: "bg-[#0e0e1a] border-[#c8a96e]/30",
    success: "bg-[#0d2918] border-[#4de880]",
    danger: "bg-[#1a0808] border-[#e83030]",
};

export const Modal = ({
    isOpen,
    onClose,
    children,
    title,
    titleAlign = 'center',
    maxWidth = "max-w-[900px]",
    variant = 'default',
    className = ""
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

    // การจัดตำแหน่ง Title
    const textAlignClass = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right'
    }[titleAlign];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-exit">
            <div
                ref={modalRef}
                className={`w-full ${maxWidth} border p-8 shadow-2xl text-[#d8d0c8] max-h-[90vh] overflow-y-auto 
                    transition-colors duration-300 ${variantStyles[variant]} ${className} cursor-default`}
            >
                {title && (
                    <h2 className={`text-3xl font-bold text-[#c8a96e] mb-6 uppercase tracking-[0.2em] ${textAlignClass}`}
                        style={{ fontFamily: "'Cinzel', serif" }}>
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </div>
    );
};