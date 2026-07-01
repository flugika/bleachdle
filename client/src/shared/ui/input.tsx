// src/shared/ui/input.tsx
export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="w-full bg-zinc-900 border border-zinc-700 p-3 text-white focus:outline-none focus:border-white transition"
    />
);