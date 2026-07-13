// src/shared/ui/button.tsx
import React from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    isLoading?: boolean;
    loadingText?: string;
    cooldownSeconds?: number;
}

export const Button = ({
    children,
    variant = 'primary',
    className = "",
    disabled,
    isLoading = false,
    loadingText = "PROCESSING...",
    cooldownSeconds = 0,
    ...props
}: ButtonProps) => {

    const isCoolingDown = cooldownSeconds > 0;
    // มัดรวมสถานะที่ปุ่มไม่ควรถูกกดได้ (ป้องกันการเบิ้ล Request)
    const isDisabled = disabled || isLoading || isCoolingDown;

    const baseStyles = "relative overflow-hidden transition-all duration-300 font-bold tracking-widest uppercase flex items-center justify-center gap-2 select-none active:scale-[0.98]";

    // กำหนดโครงสร้าง Padding และขนาดพื้นฐานแยกตาม Variant
    const variantLayouts: Record<ButtonVariant, string> = {
        primary: "border py-4 text-xs tracking-[0.2em]",
        outline: "border py-2 text-sm",
        ghost: "py-2 text-sm"
    };

    // 🎨 Expert UX State-Driven Styles (คุมธีมทอง-ดาร์กสไตล์ยมทูต/เวทมนตร์)
    let stateStyles = "";

    if (isCoolingDown) {
        stateStyles = variant === 'primary'
            ? "border-[#c8a96e]/80 bg-[#c8a96e]/80 text-[#c8a96e]/80 cursor-not-allowed shadow-inner"
            : "border-white/10 bg-white/5 text-white/20 cursor-not-allowed";
    } else if (isLoading) {
        stateStyles = variant === 'primary'
            ? "border-[#c8a96e]/80 bg-[#c8a96e]/80 text-[#c8a96e]/80 cursor-wait animate-pulse"
            : "border-white/30 bg-white/5 text-white/50 cursor-wait animate-pulse";
    } else if (disabled) {
        stateStyles = variant === 'primary'
            ? "border-[#c8a96e]/60 text-[#c8a96e]/60 bg-transparent/60 cursor-not-allowed opacity-40"
            : "border-white/10 text-white/20 bg-transparent cursor-not-allowed opacity-40";
    } else {
        // Normal Active State
        stateStyles = variant === 'primary'
            ? "border-[#c8a96e] text-[#c8a96e] hover:bg-[#c8a96e] hover:text-black hover:shadow-[0_0_25px_rgba(200,169,110,0.25)] hover:cursor-pointer"
            : variant === 'outline'
                ? "border-white/50 text-white hover:bg-white hover:text-black hover:cursor-pointer"
                : "text-white/70 hover:text-white hover:cursor-pointer";
    }

    // ฟังก์ชันช่วยจัดรูปแบบเวลา 00:00 ภายในปุ่มแบบจบในตัวเอง
    const formatCountdown = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    return (
        <button
            className={`font-[family-name:var(--font-display)] ${baseStyles} ${variantLayouts[variant]} ${stateStyles} ${className}`}
            disabled={isDisabled}
            {...props}
        >
            {/* 🔮 Cooldown Effect Layer: มอบอนิเมชั่นคลื่นพลังงานกะพริบเบาๆ บนปุ่ม */}
            {isCoolingDown && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c8a96e]/80 to-transparent animate-pulse pointer-events-none" />
            )}

            {/* 🔄 สถานะ 1: กำลังโหลดส่งข้อมูล */}
            {isLoading && (
                <div className='flex items-center gap-2 tracking-[0.15em] text-[11px] text-[#0a0a0f]'>
                    <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="font-mono tracking-[0.15em]">{loadingText}</span>
                </div>
            )}

            {/* ⏳ สถานะ 2: ติดคูลดาวน์นับถอยหลัง */}
            {!isLoading && isCoolingDown && (
                <div className="flex items-center gap-2 tracking-[0.15em] text-[11px] text-[#0a0a0f]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0a0a0f] animate-ping" />
                    <span>RECHARGING // {formatCountdown(cooldownSeconds)}</span>
                </div>
            )}

            {/* 🎯 สถานะ 3: แสดงข้อความปกติ */}
            {!isLoading && !isCoolingDown && children}
        </button>
    );
};