// src/shared/ui/pairing/DeviceManagementPanel.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/src/shared/ui/button';
import { Modal } from '@/src/shared/ui/modal';
import { LastActiveIndicator } from './LastActiveIndicator';
import { clearAllLocalGameState } from '@/src/lib/sync/clearAllLocalGameState';

interface DeviceRow {
    device_id: string;
    device_label: string | null;
    linked_at: string;
    last_seen_at: string;
    isCurrentDevice: boolean;
}

export function DeviceManagementPanel() {
    const [devices, setDevices] = useState<DeviceRow[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pendingRemove, setPendingRemove] = useState<DeviceRow | null>(null);
    const [isUnlinkConfirmOpen, setIsUnlinkConfirmOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const initialLoadFired = useRef(false);

    const loadDevices = async () => {
        try {
            const res = await fetch('/api/pair/devices', { credentials: 'include' });
            const data = await res.json();
            if (!res.ok) {
                setLoadError(data?.error ?? 'failed to load devices');
                return;
            }
            setDevices(data.devices);
        } catch {
            setLoadError('network error');
        }
    };

    useEffect(() => {
        if (initialLoadFired.current) return;
        initialLoadFired.current = true;
        loadDevices();
    }, []);

    const displayName = (d: DeviceRow) => d.device_label || `Device ${d.device_id.slice(0, 8)}`;

    const handleRemove = async (deviceId: string) => {
        setBusy(true);
        setActionError(null);
        try {
            const res = await fetch('/api/pair/devices', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setActionError(data?.error ?? 'failed to remove device');
                setBusy(false);
                return;
            }
            setPendingRemove(null);
            setBusy(false);
            loadDevices();
        } catch {
            setActionError('network error');
            setBusy(false);
        }
    };

    const handleUnlink = async () => {
        if (devices && devices.length <= 1) return;

        setBusy(true);
        setActionError(null);
        try {
            const res = await fetch('/api/device/unlink', { method: 'POST', credentials: 'include' });
            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setActionError(data?.error ?? 'failed to unlink this device');
                setBusy(false);
                return;
            }
            clearAllLocalGameState();
        } catch {
            setActionError('network error');
            setBusy(false);
        }
    };

    if (loadError) {
        return (
            <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-[11px] text-[#c85050]">{loadError}</p>
                <Button className="py-4 px-8" onClick={loadDevices} variant="outline">Try Again</Button>
            </div>
        );
    }

    if (!devices) {
        return (
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a8078] text-center py-6 animate-pulse">
                Loading devices…
            </p>
        );
    }

    return (
        <div className="flex flex-col mt-4 gap-4 py-2">
            <p className="text-xs text-[#a0988e] leading-relaxed text-center">
                Every device currently linked to your streaks and progress.
            </p>

            {/* 🟢 Refactored High-Density List */}
            <div className="flex flex-col gap-2">
                {devices.map((d) => (
                    <div
                        key={d.device_id}
                        className="border border-[#2a2620] bg-[#12100d]/60 px-3.5 py-2.5 flex items-center justify-between gap-3 hover:border-[#3a342c] transition-colors"
                    >
                        {/* ฝั่งซ้าย: Device Name + Badge */}
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[12px] uppercase tracking-[0.1em] text-[#c8a96e] font-bold truncate">
                                {displayName(d)}
                            </span>
                            {d.isCurrentDevice && (
                                <span className="text-[9px] px-1.5 py-0.5 border border-[#4de880]/40 bg-[#4de880]/10 text-[#4de880] font-bold tracking-wider shrink-0">
                                    THIS DEVICE
                                </span>
                            )}
                        </div>

                        {/* ฝั่งขวา: Last Active Status + Remove Button (ขนานบรรทัดเดียวกัน) */}
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="text-[11px] text-[#8a8078]">
                                <LastActiveIndicator lastSeenAt={d.last_seen_at} />
                            </div>

                            {!d.isCurrentDevice && (
                                <button
                                    onClick={() => setPendingRemove(d)}
                                    disabled={busy}
                                    className="text-[10px] font-bold uppercase tracking-wider text-[#c85050]/70 hover:text-[#c85050] border border-[#c85050]/30 hover:border-[#c85050]/70 bg-[#c85050]/5 px-2.5 py-1 transition-all"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {actionError && <p className="text-[11px] text-[#c85050] text-center">{actionError}</p>}

            {devices.length > 1 && (
                <div className="pt-2 mt-2 border-t border-[#2a2620]/60">
                    <button
                        onClick={() => setIsUnlinkConfirmOpen(true)}
                        className="group w-full py-2.5 px-3 flex items-center justify-center gap-2 border border-[#c85050]/20 bg-[#c85050]/[0.03] hover:bg-[#c85050]/[0.08] hover:border-[#c85050]/50 transition-all duration-200"
                    >
                        {/* Warning Icon สไตล์ Gaming UI */}
                        <span className="text-[#c85050]/60 group-hover:text-[#c85050] transition-colors text-xs">
                            ⚠️
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a8078] group-hover:text-[#c85050] transition-colors">
                            Unlink Current Device
                        </span>
                    </button>
                </div>
            )}

            <Modal
                isOpen={pendingRemove !== null}
                onClose={() => !busy && setPendingRemove(null)}
                title="Remove Device"
                variant="danger"
                maxWidth="max-w-[420px]"
                onConfirm={() => busy ? undefined : pendingRemove && handleRemove(pendingRemove.device_id)}
                confirmText={busy ? 'Removing…' : 'Remove'}
                cancelText="Cancel"
            >
                <p className="text-xs tracking-[0.1em] text-neutral-300 uppercase font-mono leading-relaxed text-center">
                    {pendingRemove && (
                        <>
                            <span className="text-[#c8a96e] font-bold">{displayName(pendingRemove)}</span> will
                            lose access to these shared streaks and stats. <br />
                            It can be re-linked later with a new code.
                        </>
                    )}
                </p>
            </Modal>

            <Modal
                isOpen={isUnlinkConfirmOpen}
                onClose={() => !busy && setIsUnlinkConfirmOpen(false)}
                title="Unlink This Device"
                variant="danger"
                maxWidth="max-w-[420px]"
                onConfirm={() => busy ? undefined : handleUnlink()}
                confirmText={busy ? 'Unlinking…' : 'Unlink'}
                cancelText="Cancel"
            >
                <p className="text-xs tracking-[0.1em] text-neutral-300 uppercase font-mono leading-relaxed text-center">
                    This device will start fresh with its own local streaks,
                    separate from the account it's currently linked to.
                    You can link it again later with a new code.
                </p>
            </Modal>
        </div>
    );
}