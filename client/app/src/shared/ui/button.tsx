// src/shared/ui/button.tsx
import React from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

export const Button = ({ 
    children, 
    variant = 'primary', 
    className = "", 
    ...props 
}: ButtonProps) => {
    
    const baseStyles = "transition-all font-bold tracking-widest uppercase hover:cursor-pointer";
    
    const variants: Record<ButtonVariant, string> = {
        primary: "border border-[#c8a96e] py-4 text-[#c8a96e] hover:bg-[#c8a96e] hover:text-black",
        outline: "border border-white/50 py-2 text-white hover:bg-white hover:text-black",
        ghost: "py-2 text-white/70 hover:text-white" // เพิ่มเผื่อไว้ใช้
    };

    return (
        <button 
            className={`${baseStyles} ${variants[variant]} ${className}`} 
            {...props}
        >
            {children}
        </button>
    );
};