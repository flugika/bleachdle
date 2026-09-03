// src/shared/ui/pairing/SoulNameEditor.tsx
//
// Drop this near the top of StatsHubPage — self-contained (owns its own
// modal open state), reuses the project's real <Modal> component (not a
// re-implementation). Shows the current global soul_name (or "Unnamed
// Soul" placeholder) with an edit affordance; editing opens the same Modal
// used everywhere else in the app for consistency.
'use client';

import { useState } from 'react';
import { Modal } from '@/src/shared/ui/modal';
import { useSoulName } from '@/src/shared/hooks/useSoulName';

export function SoulNameEditor() {
    const { soulName, status, updateName } = useSoulName();
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openEditor = () => {
        setDraft(soulName ?? '');
        setError(null);
        setIsOpen(true);
    };

    const handleSave = async () => {
        if (!draft.trim()) {
            setError('Name cannot be empty');
            return;
        }
        setSaving(true);
        setError(null);
        const ok = await updateName(draft);
        setSaving(false);
        if (!ok) {
            setError('Failed to save — please try again');
            return;
        }
        setIsOpen(false);
    };

    if (status === 'loading' || status === 'idle') {
        return (
            <div className="flex items-center justify-center gap-2 py-3 text-[11px] uppercase tracking-[0.2em] text-[#8a8078] animate-pulse">
                Loading soul name…
            </div>
        );
    }

    return (
        <>
            <button
                onClick={openEditor}
                className="group/soul w-full flex items-center justify-center gap-2.5 py-3 text-center transition-colors"
            >
                <span className="text-[10px] uppercase tracking-[0.28em] text-[#5a5448]">Soul</span>
                <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#c8a96e] group-hover/soul:text-[#eed9c4] transition-colors">
                    {soulName || 'Unnamed Soul'}
                </span>
                <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="text-[#5a5448] group-hover/soul:text-[#c8a96e] transition-colors"
                >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
            </button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Name Your Soul"
                titleAlign="center"
                maxWidth="max-w-md"
                onConfirm={handleSave}
                confirmText={saving ? 'Saving…' : 'Save'}
                cancelText="Cancel"
            >
                <div className="flex flex-col items-center gap-4">
                    <p className="text-xs text-[#a0988e] leading-relaxed text-center max-w-sm">
                        This name is shared across every mode and every device linked to your streaks.
                    </p>
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={40}
                        autoFocus
                        placeholder="Enter your soul's name"
                        className="w-full max-w-xs text-center py-3 bg-[#050507] border border-[#2a2620] text-[#e2e2e5] text-sm tracking-wide focus:outline-none focus:border-[#c8a96e]/80"
                    />
                    {error && <p className="text-[11px] text-[#c85050]">{error}</p>}
                </div>
            </Modal>
        </>
    );
}