// @/src/shared/hooks/useCountdown.ts
import { useState, useEffect } from 'react';

interface CountdownResult {
    hours: number;
    minutes: number;
    seconds: number;
}

export const useCountdown = (): CountdownResult => {
    const [timeLeft, setTimeLeft] = useState<CountdownResult>({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const diff = Math.max(0, tomorrow.getTime() - now.getTime());

            return {
                hours: Math.floor(diff / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000)
            };
        };

        // Run immediately on mount to prevent 1s blank/flicker delay
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return timeLeft;
};