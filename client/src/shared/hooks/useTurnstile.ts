// src/shared/hooks/useTurnstile.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';

declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: Record<string, unknown>) => string;
            execute: (widgetId: string) => void;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
        __turnstileOnLoad?: () => void;
    }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_SRC =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__turnstileOnLoad&render=explicit';

let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve();
    if (scriptLoadPromise) return scriptLoadPromise;

    scriptLoadPromise = new Promise((resolve) => {
        window.__turnstileOnLoad = () => resolve();

        if (document.getElementById(SCRIPT_ID)) return; // already injected, just waiting on onload
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    });

    return scriptLoadPromise;
}

/**
 * Renders an invisible Turnstile widget and exposes getToken() to fetch a fresh
 * verification token on demand — call this right before hitting any endpoint
 * that requires `turnstileToken` in the body (e.g. /api/stats/finalize).
 *
 * Usage:
 *   const { getToken, containerRef } = useTurnstile();
 *   ...
 *   <div ref={containerRef} />  // stays invisible, size: 'invisible'
 *   ...
 *   const token = await getToken();
 *   await fetch('/api/stats/finalize', { body: JSON.stringify({ ...payload, turnstileToken: token }) });
 *
 * Tokens are single-use and expire after ~5 minutes — always call getToken()
 * fresh right before the request, don't cache it across game sessions.
 */
export function useTurnstile() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const pendingRef = useRef<{
        resolve: (token: string) => void;
        reject: (err: Error) => void;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;

        loadTurnstileScript().then(() => {
            if (cancelled || !containerRef.current || !window.turnstile) return;
            if (widgetIdRef.current) return; // already rendered (e.g. StrictMode double-invoke)

            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
                size: 'invisible',
                execution: 'execute', // don't auto-run on load — only when we call execute()
                callback: (token: string) => {
                    pendingRef.current?.resolve(token);
                    pendingRef.current = null;
                },
                'error-callback': () => {
                    pendingRef.current?.reject(new Error('Turnstile challenge errored'));
                    pendingRef.current = null;
                },
                'expired-callback': () => {
                    pendingRef.current?.reject(new Error('Turnstile token expired'));
                    pendingRef.current = null;
                },
                'timeout-callback': () => {
                    pendingRef.current?.reject(new Error('Turnstile challenge timed out'));
                    pendingRef.current = null;
                },
            });
        });

        return () => {
            cancelled = true;
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, []);

    const getToken = useCallback((): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!window.turnstile || !widgetIdRef.current) {
                reject(new Error('Turnstile widget not ready yet'));
                return;
            }
            if (pendingRef.current) {
                reject(new Error('A Turnstile challenge is already in flight'));
                return;
            }
            pendingRef.current = { resolve, reject };
            window.turnstile.reset(widgetIdRef.current); // clear any stale/expired token first
            window.turnstile.execute(widgetIdRef.current);
        });
    }, []);

    return { containerRef, getToken };
}