// src/shared/ui/pairing/OtpCodeInput.tsx
//
// 6 separate single-digit boxes instead of one free-text field — standard
// OTP UX: auto-advances focus on digit entry, backspace on an empty box
// jumps back to the previous one, and pasting a full 6-digit code (e.g.
// copied from the other device) fills every box at once instead of only
// landing in whichever box happened to be focused.
'use client';

import { useRef, useState, useEffect } from 'react';

interface OtpCodeInputProps {
    value: string; // always the full string, e.g. "12" while mid-entry
    onChange: (value: string) => void;
    onComplete?: (value: string) => void; // fires once when all 6 digits are filled
    disabled?: boolean;
    autoFocus?: boolean;
}

const LENGTH = 6;

export function OtpCodeInput({ value, onChange, onComplete, disabled, autoFocus }: OtpCodeInputProps) {
    const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(0);

    useEffect(() => {
        if (autoFocus) inputRefs.current[0]?.focus();
    }, [autoFocus]);

    const setDigitAt = (index: number, digit: string) => {
        const next = digits.slice();
        next[index] = digit;
        const joined = next.join('');
        onChange(joined);

        if (joined.length === LENGTH && next.every((d) => d !== '')) {
            onComplete?.(joined);
        }
    };

    const handleChange = (index: number, raw: string) => {
        const digit = raw.replace(/\D/g, '').slice(-1); // keep only the last typed digit
        setDigitAt(index, digit);
        if (digit && index < LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            setDigitAt(index - 1, '');
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
        if (!pasted) return;
        e.preventDefault();
        onChange(pasted);
        if (pasted.length === LENGTH) {
            onComplete?.(pasted);
            inputRefs.current[LENGTH - 1]?.focus();
        } else {
            inputRefs.current[pasted.length]?.focus();
        }
    };

    return (
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {digits.map((digit, i) => (
                <input
                    type="text"
                    inputMode="numeric"
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    value={digit}
                    disabled={disabled}
                    maxLength={1}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={() => setFocusedIndex(i)}
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    autoCapitalize="off"
                    className={[
                        'w-11 h-14 text-center text-2xl font-mono bg-[#050507] border text-[#e2e2e5]',
                        'focus:outline-none transition-colors',
                        focusedIndex === i ? 'border-[#c8a96e]' : 'border-[#2a2620]',
                        disabled ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                />
            ))}
        </div>
    );
}