// src/shared/ui/pairing/PairingModal.tsx
//
// v3 changes:
//   - CreateCodePanel/JoinWithCodePanel now use the project's shared
//     <Button> (src/shared/ui/button.tsx) instead of ad-hoc buttons — gets
//     isLoading/cooldownSeconds states for free instead of hand-rolled text.
//   - Code entry is OtpCodeInput (6 separate digit boxes) instead of one
//     free-text field.
//   - Reconciliation rows and the redeem flow now surface device_label
//     ("Chrome · Windows") wherever a device is referenced, reducing the
//     chance of confirming the wrong side.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/src/shared/ui/modal';
import { Button } from '@/src/shared/ui/button';
import { OtpCodeInput } from './OtpCodeInput';
import { pullServerStatsAndReload } from '@/src/lib/sync/pullServerStats';
import { DeviceManagementPanel } from './DeviceManagementPanel';
import { useTurnstile } from '@/src/shared/hooks/useTurnstile';
import { supabaseClient } from '@/src/lib/supabase/supabase-client';

interface PlayerStatRow {
    game_mode: string;
    game_type: 'daily' | 'unlimited';
    current_streak: number;
    max_streak: number;
    played_count: number;
    passed_count: number;
}

interface RedeemResponse {
    valid: boolean;
    code: string;
    deviceA: { stats: PlayerStatRow[]; deviceLabel?: string | null };
    deviceB: { stats: PlayerStatRow[] };
}

type KeepChoice = 'A' | 'B';
type ChoiceKey = string;

const choiceKey = (mode: string, type: string): ChoiceKey => `${mode}:${type}`;

interface PairingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLinked?: () => void;
}

export function PairingModal({ isOpen, onClose, onLinked }: PairingModalProps) {
    const [tab, setTab] = useState<'create' | 'join' | 'manage'>('create');
    const [visited, setVisited] = useState<Set<typeof tab>>(new Set(['create']));
    
    // 🟢 Default ให้ซ่อนแท็บ 'join' ไว้ก่อนเสมอ (กัน Flash และกัน User เข้าผิด)
    const [canJoin, setCanJoin] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;

        fetch('/api/pair/devices', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (!isMounted) return;
                const devices = Array.isArray(data?.devices) ? data.devices : [];

                // 🟢 ค้นพบว่ายังโสด/ยังไม่ผูกกับใคร (<= 1 เครื่อง) ถึงปลดล็อกแท็บ 'join' ให้แสดง
                const isSingleDevice = devices.length <= 1;
                setCanJoin(isSingleDevice);
            })
            .catch(() => {
                if (isMounted) setCanJoin(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    // 🟢 แท็บเริ่มต้นจะมีแค่ 'Create Code' กับ 'Manage' เท่านั้น
    const availableTabs = useMemo(() => {
        const tabs: { id: 'create' | 'join' | 'manage'; label: string }[] = [
            { id: 'create', label: 'Create Code' },
        ];

        // จะถูกดันเข้า陣列เฉพาะเมื่อยืนยันแล้วว่ายังไม่มีคู่
        if (canJoin) {
            tabs.push({ id: 'join', label: 'Enter Code' });
        }

        tabs.push({ id: 'manage', label: 'Manage' });
        return tabs;
    }, [canJoin]);

    const goToTab = (next: typeof tab) => {
        setTab(next);
        setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Link Device" titleAlign="center" maxWidth="max-w-lg">
            <div className="flex gap-2 justify-center flex-wrap">
                {availableTabs.map((t) => (
                    <TabButton
                        key={t.id}
                        active={tab === t.id}
                        onClick={() => goToTab(t.id)}
                    >
                        {t.label}
                    </TabButton>
                ))}
            </div>

            {visited.has('create') && (
                <div style={{ display: tab === 'create' ? 'block' : 'none' }}>
                    <CreateCodePanel onLinked={onLinked} />
                </div>
            )}

            {/* Render Join Panel เฉพาะตอนที่ canJoin เป็น true เท่านั้น */}
            {visited.has('join') && canJoin && (
                <div style={{ display: tab === 'join' ? 'block' : 'none' }}>
                    <JoinWithCodePanel onLinked={onLinked} />
                </div>
            )}

            {visited.has('manage') && (
                <div style={{ display: tab === 'manage' ? 'block' : 'none' }}>
                    <DeviceManagementPanel />
                </div>
            )}
        </Modal>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={[
                'px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] font-bold border transition-colors',
                active
                    ? 'border-[#c8a96e] text-[#c8a96e] bg-[#c8a96e]/10'
                    : 'border-[#2a2620] text-[#8a8078] hover:text-[#c8a96e]/70',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

// ============================================================================
// Device A side — request + display a code
// ============================================================================
const CODE_STORAGE_KEY = 'pairing:create-code-state';

type CreateState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; code: string; expiresAt: string }
    | { status: 'linked' }
    | { status: 'error'; message: string };

function loadPersistedState(): CreateState {
    if (typeof window === 'undefined') return { status: 'idle' };
    try {
        const raw = sessionStorage.getItem(CODE_STORAGE_KEY);
        if (!raw) return { status: 'idle' };
        const parsed = JSON.parse(raw) as CreateState;
        // 🆕 ถ้า code หมดอายุไปแล้วตั้งแต่ตอนที่ tab ถูกปิดไว้ ให้กลับไป idle
        if (parsed.status === 'ready' && new Date(parsed.expiresAt).getTime() <= Date.now()) {
            return { status: 'idle' };
        }
        // 🆕 loading/error ไม่ควร persist ข้ามการ remount — เอา idle แทน
        if (parsed.status === 'loading' || parsed.status === 'error') {
            return { status: 'idle' };
        }
        return parsed;
    } catch {
        return { status: 'idle' };
    }
}

function CreateCodePanel({ onLinked }: { onLinked?: () => void }) {
    const [state, setState] = useState<CreateState>(loadPersistedState);
    const { getToken, containerRef } = useTurnstile();

    // 🟢 ดึง code ออกมาอย่างปลอดภัย (ถ้าไม่ใช่ 'ready' จะได้ค่า null)
    const code = state.status === 'ready' ? state.code : null;

    // 1. Realtime WebSocket Listener
    useEffect(() => {
        if (!code) return;

        const channel = supabaseClient
            .channel(`pairing:${code}`)
            .on(
                'broadcast',
                { event: 'PAIRING_COMPLETE' },
                () => {
                    sessionStorage.removeItem(CODE_STORAGE_KEY);
                    setState({ status: 'linked' });
                    onLinked?.();
                }
            )
            .subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [code, onLinked]); // 👈 ใส่ code เข้าไปแทน state.code

    // 2. Defensive Fallback (Visibility Check)
    useEffect(() => {
        if (!code) return;

        const handleVisibilityChange = async () => {
            if (document.hidden) return;

            try {
                const res = await fetch(`/api/pair/status?code=${code}`, { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                if (data.status === 'used') {
                    sessionStorage.removeItem(CODE_STORAGE_KEY);
                    setState({ status: 'linked' });
                    onLinked?.();
                }
            } catch {
                // ignore glitch
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [code, onLinked]); // 👈 ใส่ code เข้าไปแทนเช่นกัน

    const requestCode = async () => {
        sessionStorage.removeItem(CODE_STORAGE_KEY);
        setState({ status: 'loading' });
        try {
            let turnstileToken: string;
            try {
                turnstileToken = await getToken();
            } catch {
                setState({ status: 'error', message: 'verification failed, please try again' });
                return;
            }

            const res = await fetch('/api/pair/create', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ turnstileToken }),
            });
            const data = await res.json();
            if (!res.ok) {
                setState({ status: 'error', message: data?.error ?? 'failed to create code' });
                return;
            }
            setState({ status: 'ready', code: data.code, expiresAt: data.expiresAt });
        } catch {
            setState({ status: 'error', message: 'network error' });
        }
    };

    const secondsLeft = useCountdown(state.status === 'ready' ? state.expiresAt : null);

    return (
        <div className="flex flex-col items-center text-center gap-4 py-2">
            <div ref={containerRef} />

            {state.status === 'linked' && (
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-12 h-12 rounded-full bg-[#4de880]/10 border border-[#4de880] flex items-center justify-center text-2xl text-[#4de880]">
                        ✓
                    </div>
                    <div>
                        <p className="text-xs font-bold text-[#4de880] tracking-wider uppercase">
                            Device Linked Successfully!
                        </p>
                        <p className="text-[11px] text-[#8a8078] mt-1">
                            This device is now connected to your pair.
                        </p>
                    </div>
                    <Button className="px-8 mt-2" onClick={requestCode} variant="outline">
                        Generate New Code
                    </Button>
                </div>
            )}

            {state.status !== 'linked' && (
                <p className="text-xs text-[#a0988e] leading-relaxed max-w-sm">
                    Generate a code on this device, then enter it on the other device you want to link.
                    Your streaks and history stay intact — you'll confirm before anything changes.
                </p>
            )}

            {state.status === 'idle' && (
                <Button className="px-8" onClick={requestCode} variant="primary">
                    Generate Code
                </Button>
            )}

            {state.status === 'loading' && (
                <Button className="px-8" isLoading loadingText="GENERATING..." variant="primary" disabled />
            )}

            {state.status === 'ready' && (
                <div className="flex flex-col items-center gap-3">
                    <div className="text-4xl font-black tracking-[0.3em] text-[#c8a96e] font-mono">
                        {state.code}
                    </div>
                    {secondsLeft > 0 ? (
                        <p className="px-8 text-[11px] uppercase tracking-[0.16em] text-[#8a8078]">
                            Expires in {formatSeconds(secondsLeft)}
                        </p>
                    ) : (
                        <Button className="px-8" onClick={requestCode} variant="outline">
                            Generate New Code
                        </Button>
                    )}
                </div>
            )}

            {state.status === 'error' && (
                <div className="px-8 flex flex-col items-center gap-2">
                    <p className="text-[11px] text-[#c85050]">{state.message}</p>
                    <Button className="px-8" onClick={requestCode} variant="outline">
                        Try Again
                    </Button>
                </div>
            )}
        </div>
    );
}

function useCountdown(expiresAt: string | null): number {
    const [secondsLeft, setSecondsLeft] = useState(0);

    useEffect(() => {
        if (!expiresAt) {
            setSecondsLeft(0);
            return;
        }
        const target = new Date(expiresAt).getTime();
        const tick = () => setSecondsLeft(Math.max(0, Math.floor((target - Date.now()) / 1000)));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    return secondsLeft;
}

function formatSeconds(total: number): string {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================================================
// Device B side — enter code, then explicit reconciliation, then confirm
// ============================================================================
function JoinWithCodePanel({ onLinked }: { onLinked?: () => void }) {
    const [code, setCode] = useState('');
    const [redeemState, setRedeemState] = useState<
        | { status: 'idle' }
        | { status: 'loading' }
        | { status: 'ready'; data: RedeemResponse }
        | { status: 'error'; message: string }
    >({ status: 'idle' });
    const [choices, setChoices] = useState<Record<ChoiceKey, KeepChoice>>({});
    const [confirmPhase, setConfirmPhase] = useState<'idle' | 'confirming' | 'linked-refreshing'>('idle');
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const { getToken, containerRef } = useTurnstile(); // 🆕

    const handleRedeem = async (submittedCode?: string) => {
        const codeToSubmit = submittedCode ?? code;
        if (!/^\d{6}$/.test(codeToSubmit)) {
            setRedeemState({ status: 'error', message: 'Enter the 6-digit code exactly as shown' });
            return;
        }
        setRedeemState({ status: 'loading' });
        try {
            // 🆕 solve the challenge right before submitting — this action
            // is already behind a deliberate "Check Code" click, so a brief
            // wait here is expected, unlike device/init's silent page-load flow
            let turnstileToken: string;
            try {
                turnstileToken = await getToken();
            } catch (err) {
                console.error('[PairingModal] turnstile getToken failed:', err);
                setRedeemState({ status: 'error', message: 'verification failed, please try again' });
                return;
            }

            const res = await fetch('/api/pair/redeem', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeToSubmit, turnstileToken }),
            });
            const data = await res.json();
            if (!res.ok) {
                setRedeemState({ status: 'error', message: data?.error ?? 'invalid or expired code' });
                return;
            }
            setRedeemState({ status: 'ready', data });
            const defaults: Record<ChoiceKey, KeepChoice> = {};
            for (const row of data.deviceA.stats) defaults[choiceKey(row.game_mode, row.game_type)] = 'A';
            setChoices(defaults);
        } catch {
            setRedeemState({ status: 'error', message: 'network error' });
        }
    };

    const mergedRows = useMemo(() => {
        if (redeemState.status !== 'ready') return [];
        const { deviceA, deviceB } = redeemState.data;
        const keys = new Set([
            ...deviceA.stats.map((r) => choiceKey(r.game_mode, r.game_type)),
            ...deviceB.stats.map((r) => choiceKey(r.game_mode, r.game_type)),
        ]);

        return Array.from(keys).map((key) => {
            const a = deviceA.stats.find((r) => choiceKey(r.game_mode, r.game_type) === key);
            const b = deviceB.stats.find((r) => choiceKey(r.game_mode, r.game_type) === key);
            return { key, a, b };
        });
    }, [redeemState]);

    const handleConfirm = async () => {
        if (redeemState.status !== 'ready') return;
        setConfirmPhase('confirming');
        setConfirmError(null);

        const keepChoices = mergedRows
            .filter((row) => row.a && row.b)
            .map((row) => {
                const [gameMode, gameType] = row.key.split(':');
                return { gameMode, gameType: gameType as 'daily' | 'unlimited', keep: choices[row.key] ?? 'A' };
            });

        try {
            const res = await fetch('/api/pair/confirm', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: redeemState.data.code, keepChoices }),
            });
            const data = await res.json();
            if (!res.ok) {
                setConfirmError(data?.error ?? 'pairing failed, please try again');
                setConfirmPhase('idle');
                return;
            }

            // 🟢 ยิง Realtime Broadcast แจ้ง Device A ให้เปลี่ยนสถานะเป็น Linked ทันที
            const pairedCode = redeemState.data.code;
            const channel = supabaseClient.channel(`pairing:${pairedCode}`);

            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    channel.send({
                        type: 'broadcast',
                        event: 'PAIRING_COMPLETE',
                        payload: {},
                    });
                    // ลบ channel ออกหลังยิงเสร็จเพื่อป้องกัน Memory Leak
                    setTimeout(() => supabaseClient.removeChannel(channel), 1000);
                }
            });

            setConfirmPhase('linked-refreshing');
            onLinked?.();
            await new Promise((resolve) => setTimeout(resolve, 600));
            await pullServerStatsAndReload();
        } catch {
            setConfirmError('network error');
            setConfirmPhase('idle');
        }
    };

    if (confirmPhase === 'linked-refreshing') {
        return (
            <div className="flex flex-col items-center gap-3 py-10">
                <div className="text-2xl">🔗</div>
                <p className="text-[12px] uppercase tracking-[0.2em] text-[#4de880] font-bold">
                    Devices Linked
                </p>
                <p className="text-[11px] text-[#8a8078] animate-pulse">Refreshing your stats…</p>
            </div>
        );
    }

    if (redeemState.status !== 'ready') {
        return (
            <div className="flex flex-col items-center gap-4 py-2">
                <div ref={containerRef} /> {/* 🆕 turnstile widget mounts here when needed */}
                <p className="text-xs text-[#a0988e] leading-relaxed max-w-sm text-center">
                    Enter the code shown on your other device. You'll get to review and choose whose
                    streaks to keep before anything is linked.
                </p>

                <OtpCodeInput
                    value={code}
                    onChange={setCode}
                    onComplete={(full) => handleRedeem(full)}
                    disabled={redeemState.status === 'loading'}
                    autoFocus
                />

                {redeemState.status === 'error' && (
                    <p className="text-[11px] text-[#c85050]">{redeemState.message}</p>
                )}

                <Button
                    className="px-8"
                    onClick={() => handleRedeem()}
                    disabled={code.length !== 6 || redeemState.status === 'loading'}
                    isLoading={redeemState.status === 'loading'}
                    loadingText="CHECKING..."
                    variant="primary"
                >
                    Check Code
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 py-2">
            {redeemState.data.deviceA.deviceLabel && (
                <p className="text-xs text-[#a0988e] leading-relaxed text-center">
                    Linking with <span className="text-[#c8a96e] font-semibold">{redeemState.data.deviceA.deviceLabel}</span>.
                    Choose which device's progress to keep for each mode below.
                </p>
            )}

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {mergedRows.map(({ key, a, b }) => {
                    const [gameMode, gameType] = key.split(':');
                    const hasConflict = Boolean(a && b);

                    return (
                        <div
                            key={key}
                            className="border border-[#2a2620] px-3 py-2.5 flex items-center justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-[#c8a96e] font-bold">
                                    {gameMode} · {gameType}
                                </p>
                                {!hasConflict && (
                                    <p className="text-[10px] text-[#5a5448] mt-0.5">
                                        only on {a ? 'this device' : 'the other device'} — carries over as-is
                                    </p>
                                )}
                            </div>

                            {hasConflict && a && b && (
                                <div className="flex gap-1.5 shrink-0">
                                    <StatChoiceButton
                                        label={`A: ${a.current_streak}🔥`}
                                        active={choices[key] === 'A'}
                                        onClick={() => setChoices((c) => ({ ...c, [key]: 'A' }))}
                                    />
                                    <StatChoiceButton
                                        label={`B: ${b.current_streak}🔥`}
                                        active={choices[key] === 'B'}
                                        onClick={() => setChoices((c) => ({ ...c, [key]: 'B' }))}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {mergedRows.length === 0 && (
                    <p className="text-[11px] text-[#5a5448] text-center py-4">
                        No progress on either device yet — nothing to reconcile.
                    </p>
                )}
            </div>

            {confirmError && <p className="text-[11px] text-[#c85050] text-center">{confirmError}</p>}

            <Button
                className="w-full px-8"
                onClick={handleConfirm}
                disabled={confirmPhase === 'confirming'}
                isLoading={confirmPhase === 'confirming'}
                loadingText="LINKING..."
                variant="primary"
            >
                Confirm & Link Devices
            </Button>
        </div>
    );
}

function StatChoiceButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={[
                'px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors',
                active
                    ? 'border-[#4de880] text-[#4de880] bg-[#4de880]/10'
                    : 'border-[#2a2620] text-[#8a8078] hover:border-[#4de880]/40',
            ].join(' ')}
        >
            {label}
        </button>
    );
}