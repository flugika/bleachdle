// src/shared/hooks/useShareResultExport.ts
"use client";

import { RefObject, useCallback, useRef, useState } from 'react';

export type ShareStatus = 'idle' | 'generating' | 'done' | 'error';
export type ShareFeedback = { type: 'success' | 'error'; message: string } | null;
/**
 * 🆕 Which single action is currently in flight: 'save' | 'copy' | 'copyResult' | 'share' | null.
 * Replaces the old pattern of gating every button off one shared `status`
 * flag — previously clicking "Save Image" also visually/functionally
 * disabled "Copy Image" even though it wasn't doing anything, which is
 * why hovering an *idle* button still showed a not-allowed cursor (native
 * `disabled` forces that cursor regardless of className overrides).
 */
export type ShareAction = 'save' | 'copy' | 'copyResult' | 'share' | null;

interface UseShareResultExportOptions {
    /** Filename (without extension) used when saving the image. */
    fileName: string;
    /** Link to share/copy — defaults to the current page URL. */
    shareUrl?: string;
    shareTitle?: string;
    shareText?: string;
    /**
     * 🆕 Pre-built, spoiler-free result summary (mode, win/loss, guess count,
     * streaks — never the answer itself). Used by copyResult / shareNative
     * so "copy link" isn't just a bare URL anymore. Falls back to shareText
     * if omitted, and to nothing (link only) if neither is given.
     */
    resultText?: string;
}

/**
 * 📤 Drives the three share actions off a single off-screen-rendered
 * <ShareResultCard/>: save-as-image, copy-image-to-clipboard, and native
 * share-sheet (falling back to link copy where the platform can't do
 * image sharing, e.g. desktop Safari/Firefox). Rendering is lazy —
 * html-to-image is dynamically imported so it never ships in a bundle
 * that doesn't use the share feature.
 */
export function useShareResultExport(cardRef: RefObject<HTMLElement | null>, options: UseShareResultExportOptions) {
    const [status, setStatus] = useState<ShareStatus>('idle');
    const [pendingAction, setPendingAction] = useState<ShareAction>(null);
    const [feedback, setFeedback] = useState<ShareFeedback>(null);
    const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
    const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const notify = useCallback((next: ShareFeedback) => {
        setFeedback(next);
        if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = setTimeout(() => setFeedback(null), 2600);
    }, []);

    const renderBlob = useCallback(async (): Promise<Blob> => {
        const node = cardRef.current;
        if (!node) throw new Error('Share card is not mounted yet.');

        // Wait for web fonts so the export doesn't capture a FOUT fallback face.
        if (typeof document !== 'undefined' && 'fonts' in document) {
            try { await document.fonts.ready; } catch { /* non-fatal */ }
        }

        const { toBlob } = await import('html-to-image');
        const blob = await toBlob(node, {
            pixelRatio: 2,
            cacheBust: true,
            skipFonts: false,
        });
        if (!blob) throw new Error('Could not generate the image.');
        return blob;
    }, [cardRef]);

    const generatePreview = useCallback(async () => {
        setStatus('generating');
        try {
            const blob = await renderBlob();
            setPreviewBlob(blob);
            setStatus('idle');
            return blob;
        } catch (err) {
            setStatus('error');
            notify({ type: 'error', message: `ไม่สามารถสร้างรูปภาพได้ ${err}` });
            return null;
        }
    }, [renderBlob, notify]);

    const saveImage = useCallback(async () => {
        setStatus('generating');
        setPendingAction('save');
        try {
            const blob = await renderBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${options.fileName}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setStatus('done');
            notify({ type: 'success', message: 'Image saved.' });
        } catch (err) {
            setStatus('error');
            notify({ type: 'error', message: err instanceof Error ? err.message : 'Could not save the image.' });
        } finally {
            setPendingAction(null);
        }
    }, [renderBlob, options.fileName, notify]);

    const copyImage = useCallback(async () => {
        setStatus('generating');
        setPendingAction('copy');
        try {
            if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
                throw new Error('Copying images isn\u2019t supported in this browser.');
            }
            const blob = await renderBlob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            setStatus('done');
            notify({ type: 'success', message: 'Image copied to clipboard.' });
        } catch (err) {
            setStatus('error');
            notify({ type: 'error', message: err instanceof Error ? err.message : 'Could not copy the image.' });
        } finally {
            setPendingAction(null);
        }
    }, [renderBlob, notify]);

    /**
     * 🆕 copyResult — replaces the old bare "copy link". A plain URL on its
     * own is meaningless out of context (whoever opens it just sees the
     * game, not what the person achieved), and worse, anyone could just
     * copy the address bar themselves — the button added nothing.
     *
     * This now copies a short, spoiler-free result summary (mode, win/loss,
     * guess count, current + max streak — deliberately never the answer)
     * followed by the link, e.g.:
     *
     *   BLEACHDLE // CHARACTER
     *   ✅ Traced in 3/8 guesses
     *   🔥 Streak: 5 (Best: 12)
     *
     *   https://bleachdle-theta.vercel.app/daily/character
     */
    const copyResult = useCallback(async () => {
        try {
            const url = options.shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
            const summary = options.resultText ?? options.shareText;
            const payload = summary ? `${summary}\n\n${url}` : url;
            await navigator.clipboard.writeText(payload);
            notify({ type: 'success', message: 'Result copied.' });
        } catch {
            notify({ type: 'error', message: 'Could not copy the result.' });
        }
    }, [options.shareUrl, options.resultText, options.shareText, notify]);

    /** Native share sheet with the image attached where supported (most mobile browsers); falls back to a link-only share, then to copy-result. */
    const shareNative = useCallback(async () => {
        setStatus('generating');
        setPendingAction('share');
        try {
            const url = options.shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
            const blob = await renderBlob().catch(() => null);

            if (blob && typeof navigator.canShare === 'function') {
                const file = new File([blob], `${options.fileName}.png`, { type: blob.type });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: options.shareTitle,
                        text: options.resultText ?? options.shareText,
                    });
                    setStatus('done');
                    return;
                }
            }

            if (typeof navigator.share === 'function') {
                await navigator.share({ title: options.shareTitle, text: options.resultText ?? options.shareText, url });
                setStatus('done');
                return;
            }

            await copyResult();
            setStatus('done');
        } catch (err) {
            // AbortError = user cancelled the native sheet — not a failure.
            if (err instanceof Error && err.name === 'AbortError') {
                setStatus('idle');
                return;
            }
            setStatus('error');
            notify({ type: 'error', message: 'Could not open the share sheet.' });
        } finally {
            setPendingAction(null);
        }
    }, [renderBlob, options.fileName, options.shareTitle, options.shareText, options.resultText, options.shareUrl, copyResult, notify]);

    return { status, pendingAction, feedback, previewBlob, generatePreview, saveImage, copyImage, copyResult, shareNative };
}