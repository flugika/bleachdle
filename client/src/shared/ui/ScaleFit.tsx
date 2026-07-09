// src/shared/ui/ScaleFit.tsx
'use client';

import { useLayoutEffect, useRef, useState } from 'react';

interface ScaleFitProps {
    children: React.ReactNode;
    /**
     * 🆕 The content's own intended pixel width (its natural `max-w-*` cap,
     * e.g. 384 for `max-w-sm`, 512 for `max-w-lg`).
     *
     * This is required, not just nice-to-have: components that use `w-full`
     * internally (SilhouetteImage, SongAudioPlayer) need a DEFINITE width from
     * their parent to resolve against. A plain flex/auto-sized wrapper gives
     * them an indefinite width, which collapses percentage-based children to
     * ~0 — that's why silhouette rendered blank. Fixing the wrapper's width
     * to a real pixel value (then scaling that whole box down/up) avoids the
     * problem entirely.
     */
    referenceWidth?: number;
    /** Allow scaling above 1x to fill generous cells instead of floating in empty space. Default true. */
    allowScaleUp?: boolean;
    /** Ceiling for scale-up, keeps text/images from turning to mush. Default 1.5. */
    maxScale?: number;
    className?: string;
}

export function ScaleFit({
    children,
    referenceWidth = 448,
    allowScaleUp = true,
    maxScale = 1.5,
    className = '',
}: ScaleFitProps) {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const outer = outerRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) return;

        const measure = () => {
            const availW = outer.clientWidth;
            const availH = outer.clientHeight;
            if (availW === 0 || availH === 0) return;

            // Width is fixed (referenceWidth), so scrollHeight here is the real,
            // accurate rendered height of the content at that width.
            const naturalH = inner.scrollHeight;
            if (naturalH === 0) return;

            let next = Math.min(availW / referenceWidth, availH / naturalH);
            if (!allowScaleUp) next = Math.min(next, 1);
            next = Math.min(next, maxScale);
            next = Math.max(next, 0.05);
            setScale(next);
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(outer);
        ro.observe(inner);
        return () => ro.disconnect();
    }, [children, referenceWidth, allowScaleUp, maxScale]);

    return (
        <div ref={outerRef} className={`relative w-full h-full min-w-0 min-h-0 overflow-hidden ${className}`}>
            <div
                ref={innerRef}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: referenceWidth,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    transformOrigin: 'center center',
                }}
            >
                {children}
            </div>
        </div>
    );
}