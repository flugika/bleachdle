"use client";

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ShareAction } from '@/src/shared/hooks/useShareResultExport';
import { Button } from '../button';
import { Modal } from '../modal';
import { CARD_W, CARD_MIN_H } from './ShareResultCard';

interface ShareResultPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageBlob: Blob | null;
    isGenerating: boolean;
    pendingAction?: ShareAction;
    onSave: () => void;
    onCopy: () => void;
    onCopyResult: () => void;
    onNativeShare?: () => void;
    showNativeShare: boolean;
}

const CheckIcon = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
    </svg>
);

const Spinner = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <span className={`${className} border-2 border-current border-t-transparent rounded-full animate-spin shrink-0`} />
);

const DownloadIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0 0l4.5-4.5M12 16l-4.5-4.5M4 20h16" />
    </svg>
);

const ImageIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="1.5" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5-9 9" />
    </svg>
);

const ClipboardIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6" />
    </svg>
);

const ShareIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path strokeLinecap="round" d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
);

export const ShareResultPreviewModal = ({
    isOpen, onClose, imageBlob, isGenerating, pendingAction = null,
    onSave, onCopy, onCopyResult, onNativeShare, showNativeShare,
}: ShareResultPreviewModalProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [justCopiedResult, setJustCopiedResult] = useState(false);
    const [aspectRatio, setAspectRatio] = useState(CARD_W / CARD_MIN_H);
    const [imageLoaded, setImageLoaded] = useState(false);
    const lastBlobRef = useRef<Blob | null>(null);

    useEffect(() => {
        if (!imageBlob) { setPreviewUrl(null); return; }
        const url = URL.createObjectURL(imageBlob);
        setPreviewUrl(url);
        if (imageBlob !== lastBlobRef.current) {
            lastBlobRef.current = imageBlob;
            setImageLoaded(false);
        }
        return () => URL.revokeObjectURL(url);
    }, [imageBlob]);

    const isSaving = pendingAction === 'save';
    const isCopyingImage = pendingAction === 'copy';
    const isSharing = pendingAction === 'share';
    const isRendering = isGenerating || !previewUrl;

    // 🎯 เช็กสิทธิ์ Native Share ตรงๆ
    const hasNativeShare = Boolean(showNativeShare && onNativeShare);

    const handleCopyResult = () => {
        onCopyResult();
        setJustCopiedResult(true);
        window.setTimeout(() => setJustCopiedResult(false), 1600);
    };

    const actionBase =
        'group relative flex items-center justify-center gap-2 py-4 text-[12px] font-black uppercase tracking-[0.14em] transition-all duration-200 ease-out cursor-pointer';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="PREVIEW // SHARE RESULT"
            titleAlign="left"
            maxWidth="max-w-[720px]"
            variant="default"
        >
            <div className="flex items-center justify-center w-full">
                <div
                    className={`aspect-[var(--ratio)] max-h-[62vh] w-[min(100%,calc(62vh*var(--ratio)))] transition-[width,height] duration-300 ease-out ${isRendering ? 'border border-white/[0.06] bg-black/40' : ''
                        }`}
                    style={{ '--ratio': aspectRatio } as CSSProperties}
                >
                    {isRendering ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#c8a96e]/60 animate-in fade-in duration-200">
                            <Spinner className="w-6 h-6" />
                            <span className="text-[11px] uppercase tracking-widest">Rendering…</span>
                        </div>
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={previewUrl ?? undefined}
                            alt="Share result preview"
                            className={`w-full h-full object-contain transition-opacity duration-300 ease-out ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                }`}
                            onLoad={(e) => {
                                const { naturalWidth, naturalHeight } = e.currentTarget;
                                if (naturalWidth && naturalHeight) {
                                    setAspectRatio(naturalWidth / naturalHeight);
                                }
                                setImageLoaded(true);
                            }}
                        />
                    )}
                </div>
            </div>

            <div className={`mt-6 flex flex-col gap-2 transition-all duration-300 ease-out ${isRendering ? 'opacity-60' : 'opacity-100'
                }`}>
                <Button
                    onClick={onSave}
                    disabled={isRendering || isSaving}
                    className={`${actionBase}`}
                >
                    {isSaving ? <Spinner className="w-4 h-4" /> : <DownloadIcon />}
                    {isSaving ? 'Saving…' : 'Save Image'}
                </Button>

                {/* 🎯 สลับ 2 คอลัมน์ (PC) กับ 3 คอลัมน์ (Mobile/iPad ที่มี Native Share) */}
                <div className={`grid gap-2 ${hasNativeShare ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <button
                        onClick={onCopy}
                        disabled={isRendering || isCopyingImage}
                        className={`${actionBase} border border-white/10 bg-white/[0.02] text-[#f5ebd5] hover:bg-white/[0.06] hover:border-white/20 flex-col !gap-1.5 !py-3 hover:cursor-pointer`}
                    >
                        {isCopyingImage ? <Spinner className="w-4 h-4" /> : <ImageIcon />}
                        <span className="text-[10px] tracking-[0.1em]">{isCopyingImage ? 'Copying…' : 'Copy Image'}</span>
                    </button>

                    <button
                        onClick={handleCopyResult}
                        className={`${actionBase} border border-white/10 bg-white/[0.02] text-[#f5ebd5] hover:bg-white/[0.06] hover:border-white/20 flex-col !gap-1.5 !py-3 hover:cursor-pointer`}
                    >
                        {justCopiedResult ? <CheckIcon /> : <ClipboardIcon />}
                        <span className="text-[10px] tracking-[0.1em]">{justCopiedResult ? 'Copied!' : 'Copy Result'}</span>
                    </button>

                    {hasNativeShare && (
                        <button
                            onClick={onNativeShare}
                            disabled={isRendering || isSharing}
                            className={`${actionBase} border border-[#c8a96e]/30 bg-[#c8a96e]/[0.06] text-[#c8a96e] hover:bg-[#c8a96e]/[0.12] hover:border-[#c8a96e]/50 flex-col !gap-1.5 !py-3 hover:cursor-pointer`}
                        >
                            {isSharing ? <Spinner className="w-4 h-4" /> : <ShareIcon />}
                            <span className="text-[10px] tracking-[0.1em]">{isSharing ? 'Opening…' : 'Share…'}</span>
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};