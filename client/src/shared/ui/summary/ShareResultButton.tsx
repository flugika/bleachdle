// src/shared/ui/summary/ShareResultButton.tsx
"use client";

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/src/shared/ui/button";
import { ShareResultCard, ShareResultData } from './ShareResultCard';
import { useShareResultExport } from '@/src/shared/hooks/useShareResultExport';
import { isTouchPrimaryDevice } from '@/src/lib/utils/isTouchDevice';
import { ShareResultPreviewModal } from './ShareResultPreviewModal';

interface ShareResultButtonProps {
    data: ShareResultData;
    fileName?: string;
    shareUrl?: string;
    className?: string;
    label?: string;
}

const canNativeShare = () =>
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    isTouchPrimaryDevice();

/**
 * 🆕 Builds the text people actually see when they paste a shared result —
 * mode, win/loss, guess count, streaks. Deliberately excludes anything
 * from `data.subject` (the answer's name/image/tags) so a shared result
 * never spoils today's target for whoever reads it.
 */
const buildResultText = (data: ShareResultData) => {
    const attempts = `${data.guessCount}${data.maxGuesses ? `/${data.maxGuesses}` : ''}`;
    const modeLabel = data.playMode === 'daily' ? 'Daily Hub' : 'Unlimited';
    const lines = [
        `BLEACHDLE // ${data.gameMode} // ${modeLabel}`,
        // 🩹 was silently dropped — daily result needs its date, otherwise a
        // pasted result is ambiguous about which day it's from.
        ...(data.playMode === 'daily' ? [`📅 ${data.dateLabel}`] : []),
        data.isWin
            ? `✅ Traced in ${attempts} guesses`
            : `❌ Konpaku severed after ${attempts} guesses`,
        `🔥 Streak: ${data.isWin ? data.currentStreak : 0} (Best: ${data.maxStreak})`,
    ];
    return lines.join('\n');
};

export const ShareResultButton = ({
    data,
    fileName,
    shareUrl,
    className = '',
    label = 'SHARE RESULT',
}: ShareResultButtonProps) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const resolvedShareUrl =
        shareUrl ??
        `${process.env.NEXT_PUBLIC_SITE_URL}/${data.playMode}/${data.gameMode.toLowerCase()}`;

    const resolvedFileName = fileName ?? `bleachdle-${data.gameMode.toLowerCase()}-${data.playMode}-${data.caseFileId}`;
    const resultText = buildResultText(data);

    const {
        status, pendingAction, feedback, previewBlob, generatePreview,
        saveImage, copyImage, copyResult, shareNative,
    } = useShareResultExport(cardRef, {
        fileName: resolvedFileName,
        shareUrl: resolvedShareUrl,
        shareTitle: `BLEACHDLE // ${data.gameMode}`,
        shareText: resultText,
        resultText,
    });

    // Only the trigger button (outside the modal) needs a coarse "something is
    // happening" flag — the modal's own action buttons use `pendingAction` so
    // each one only shows busy/disabled for the exact action it triggered.
    const isBusy = status === 'generating';

    const handlePrimaryClick = async () => {
        setIsPreviewOpen(true);
        await generatePreview();
    };

    return (
        <div className={`relative w-full ${className}`}>
            {/* 🚪 Portal straight to document.body. SummaryCardShell (the ancestor
                every *SummaryGuess mode renders this button inside) uses
                `animate-in zoom-in-95`, which puts a `transform` on that
                wrapper — and any transformed ancestor becomes the containing
                block for descendant `position: fixed` elements per the CSS
                spec, instead of the viewport. Without the portal, both this
                modal and the off-screen render target below get clipped by
                SummaryCardShell's `overflow-hidden`, which is why the preview
                showed up small/cropped. */}
            {typeof document !== 'undefined' && createPortal(
                <>
                    <ShareResultPreviewModal
                        isOpen={isPreviewOpen}
                        onClose={() => setIsPreviewOpen(false)}
                        imageBlob={previewBlob}
                        isGenerating={isBusy}
                        pendingAction={pendingAction}
                        onSave={saveImage}
                        onCopy={copyImage}
                        onCopyResult={copyResult}
                        onNativeShare={canNativeShare() ? shareNative : undefined}
                        showNativeShare={canNativeShare()}
                    />
                    {/* Off-screen render target — always mounted so export is instant */}
                    <div className="fixed top-0 -left-[9999px] pointer-events-none" aria-hidden="true">
                        <ShareResultCard ref={cardRef} data={data} />
                    </div>
                </>,
                document.body
            )}

            {/* 🎨 Secondary styling — deliberately NOT the solid-gold look used
                by the primary restart CTA (SummaryActionButton). Sharing is
                the "nice to have" action here, so it recedes: muted outline,
                no fill, no glow. `!` overrides needed since Button's own
                variant="primary" state classes carry the same specificity. */}
            <Button
                variant="primary"
                disabled={isBusy}
                onClick={handlePrimaryClick}
                className="w-full flex items-center justify-center gap-2 !border-white/15 !text-[#f5ebd5]/80 hover:!bg-white/[0.06] hover:!border-white/25 hover:!text-[#f5ebd5] disabled:opacity-60 disabled:cursor-wait"
            >
                {isBusy ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                )}
                {isBusy ? 'GENERATING…' : label}
            </Button>

            {feedback && (
                <div
                    role="status"
                    className={`absolute left-1/2 -translate-x-1/2 -bottom-11 whitespace-nowrap px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] border shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-200 ${feedback.type === 'success'
                        ? 'bg-[#4de880]/10 border-[#4de880]/40 text-[#4de880]'
                        : 'bg-[#e84d4d]/10 border-[#e84d4d]/40 text-[#e84d4d]'
                        }`}
                >
                    {feedback.message}
                </div>
            )}
        </div>
    );
};