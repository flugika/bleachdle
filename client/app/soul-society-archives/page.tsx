// src/app/soul-society-archives/page.tsx
import { getDailyCharacter } from '@/src/services/character';
import { getDailySong } from '@/src/services/song';
import { getDailySilhouette } from '@/src/services/silhouette';
import { getDailyEmoji } from '@/src/services/emoji';
import { getDailyQuote } from '@/src/services/quote';
import { getDailyRelease } from '@/src/services/release';

import { QuoteTestimonyDisplay } from '@/src/features/quote/components/shared/QuoteTestimonyDisplay';
import { EmojiTestimonyDisplay } from '@/src/features/emoji/components/shared/EmojiTestimonyDisplay';
import { SilhouetteImage } from '@/src/features/silhouette/components/shared/SilhouetteImage';
import { SongAudioPlayer } from '@/src/features/song/components/shared/SongAudioPlayer';
import { ScaleFit } from '@/src/shared/ui/ScaleFit';
import { ArchiveCharacterCard } from '@/src/features/soul-society-archives/components/ArchiveCharacterCard';
import { ArchiveReleaseCard } from '@/src/features/soul-society-archives/components/ArchiveReleaseCard';
import Image from 'next/image';

// 🏛️ Same Central 46 confidential-archive palette used across
// QuoteTestimonyDisplay / EmojiTestimonyDisplay — the whole page reads as one
// continuous dossier instead of six mismatched styles.
const T = {
    bg: '#050409',
    border: '#272420',
    borderDim: '#1a1816',
    gold: '#c8a96e',
    muted: '#8a8078',
};

function ArchiveCell({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div
            className="relative min-h-0 min-w-0 h-full flex flex-col overflow-x-hidden"
            style={{
                border: `1px solid ${T.border}`,
                background: 'radial-gradient(ellipse at top, rgba(200,169,110,0.05), transparent 60%), #08080c',
            }}
        >
            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 z-10" style={{ borderColor: `${T.gold}90` }} />
            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 z-10" style={{ borderColor: `${T.gold}90` }} />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 z-10" style={{ borderColor: `${T.gold}90` }} />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 z-10" style={{ borderColor: `${T.gold}90` }} />

            <div className="shrink-0 px-4 pt-3 pb-2">
                <p className="text-[11px] tracking-[0.35em] uppercase font-bold" style={{ color: T.gold }}>
                    {label}
                </p>
                <div className="h-px w-full mt-2" style={{ background: T.borderDim }} />
            </div>

            <div className="flex-1 min-h-0 min-w-0 flex flex-col px-3 pb-3">{children}</div>
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="w-full h-full flex items-center justify-center text-center px-4">
            <p className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: T.muted }}>
                No {label} record available today
            </p>
        </div>
    );
}

// 🆕 The answer name is the whole point of this page — put it up front, big,
// with the character's face right next to it, before the flavor card below.
function AnswerHeader({ name, imageUrl }: { name?: string | null; imageUrl?: string | null }) {
    if (!name) return null;
    return (
        <div
            className="shrink-0 flex items-center gap-3 px-3 py-2 mb-2"
            style={{ background: 'rgba(200,169,110,0.06)', border: `1px solid ${T.border}` }}
        >
            <div
                className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 ring-2 ring-[#c8a96e]/50 shadow-[0_0_14px_rgba(200,169,110,0.25)]"
                style={{ background: '#111' }}
            >
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <Image src={imageUrl} alt={name} className="w-full h-full object-cover" fill sizes="w-12 h-12" draggable={false} />
                ) : (
                    <p className='flex w-full h-full justify-center items-center text-xl font-black' style={{ color: T.gold, opacity: 0.5 }}>
                        卍
                    </p>
                )}
            </div>
            <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: T.muted }}>
                    Answer
                </p>
                <p className="text-xl font-black uppercase tracking-wide truncate" style={{ color: T.gold }}>
                    {name}
                </p>
            </div>
        </div>
    );
}

export default async function ArchivePage() {
    // ดึงข้อมูลพร้อมกันทั้งหมด — ทน error รายชิ้น ไม่ให้พังทั้งหน้าถ้าโหมดใดโหมดหนึ่งดึงข้อมูลไม่สำเร็จ
    const results = await Promise.allSettled([
        getDailyCharacter(),
        getDailySong(),
        getDailySilhouette(),
        getDailyEmoji(),
        getDailyQuote(),
        getDailyRelease(),
    ]);

    const [character, song, silhouette, emoji, quote, release] = results.map((r) =>
        r.status === 'fulfilled' ? r.value : null,
    ) as [
            Awaited<ReturnType<typeof getDailyCharacter>> | null,
            Awaited<ReturnType<typeof getDailySong>> | null,
            Awaited<ReturnType<typeof getDailySilhouette>> | null,
            Awaited<ReturnType<typeof getDailyEmoji>> | null,
            Awaited<ReturnType<typeof getDailyQuote>> | null,
            Awaited<ReturnType<typeof getDailyRelease>> | null,
        ];

    return (
        // 🆕 `fixed inset-0` instead of w-screen/h-screen — pins the page exactly
        // to the viewport box so there is no chance of a 100vw-vs-scrollbar
        // mismatch introducing a sliver of horizontal scroll.
        <div className="min-h-screen h-full flex flex-col overflow-hidden" style={{ color: '#e8ddd0' }}>
            {/* Header — deliberately compact, this is a dashboard not a page to scroll */}
            <div
                className="shrink-0 px-6 py-3 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${T.borderDim}` }}
            >
                <div className="min-w-0">
                    <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: T.muted }}>
                        Central 46 // Internal Use Only
                    </p>
                    <h1 className="text-lg sm:text-xl font-black truncate" style={{ color: T.gold }}>
                        🛡️ Soul Society Daily Archives — Answer Key
                    </h1>
                </div>
                <p className="hidden sm:block shrink-0 text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: T.muted }}>
                    6 / 6 Records Unsealed
                </p>
            </div>

            {/* Answer grid — all six daily modes visible at once, no scrolling on desktop */}
            <div className="flex-1 min-h-0 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-3 p-3 overflow-hidden">
                {/* CHARACTER — image is already the reveal, no separate header needed */}
                <ArchiveCell label="Character">
                    <AnswerHeader
                        name={character?.name}
                        imageUrl={character?.image ? `/assets/characters/${character.image}` : null}
                    />
                    {character ? (
                        <ScaleFit referenceWidth={340}>
                            <ArchiveCharacterCard
                                characterId={character.id}
                                name={character.name}
                                imageUrl={character.image ? `/assets/characters/${character.image}` : null}
                                affiliation={character.affiliation}
                                race={character.race}
                            />
                        </ScaleFit>
                    ) : (
                        <EmptyState label="Character" />
                    )}
                </ArchiveCell>

                {/* SONG — full, uncut playback, title/artist revealed, Spotify / YouTube links */}
                <ArchiveCell label="Song">
                    <AnswerHeader
                        name={song?.song.title}
                    />
                    {song?.song ? (
                        <ScaleFit referenceWidth={340}>
                            <SongAudioPlayer
                                target={song.song}
                                mode="full"
                                title={song.song.title}
                                artist={song.song.artist}
                                spotifyUrl={song.song.spotify_url}
                                youtubeUrl={song.song.youtube_url}
                            />
                        </ScaleFit>
                    ) : (
                        <EmptyState label="Song" />
                    )}
                </ArchiveCell>

                {/* SILHOUETTE — swaps between silhouette and real image on its own */}
                <ArchiveCell label="Silhouette">
                    <AnswerHeader
                        name={silhouette?.character?.name}
                        imageUrl={silhouette?.character?.image ? `/assets/characters/${silhouette.character.image}` : null}
                    />
                    {silhouette?.character ? (
                        <ScaleFit referenceWidth={340}>
                            <SilhouetteImage
                                characterId={silhouette.character.id}
                                image={silhouette.image}
                                mode="daily"
                                realImage={silhouette.character.image}
                                revealMode="crossfade"
                            />
                        </ScaleFit>
                    ) : (
                        <EmptyState label="Silhouette" />
                    )}
                </ArchiveCell>

                {/* EMOJI */}
                <ArchiveCell label="Emoji">
                    <AnswerHeader
                        name={emoji?.character?.name}
                        imageUrl={emoji?.character?.image ? `/assets/characters/${emoji.character.image}` : null}
                    />
                    {emoji ? (
                        <div className="flex-1 min-h-0 min-w-0">
                            <ScaleFit referenceWidth={460} maxScale={1.3}>
                                <EmojiTestimonyDisplay
                                    target={emoji}
                                    revealedCount={0}
                                    forceRevealAll
                                    isSolved
                                    speakerName={emoji.character?.name}
                                />
                            </ScaleFit>
                        </div>
                    ) : (
                        <EmptyState label="Emoji" />
                    )}
                </ArchiveCell>

                {/* QUOTE */}
                <ArchiveCell label="Quote">
                    <AnswerHeader
                        name={quote?.character?.name}
                        imageUrl={quote?.character?.image ? `/assets/characters/${quote.character.image}` : null}
                    />
                    {quote ? (
                        <div className="flex-1 min-h-0 min-w-0">
                            <ScaleFit referenceWidth={448} maxScale={1.4}>
                                <QuoteTestimonyDisplay target={quote} isSolved speakerName={quote.character?.name} />
                            </ScaleFit>
                        </div>
                    ) : (
                        <EmptyState label="Quote" />
                    )}
                </ArchiveCell>

                {/* RELEASE */}
                {/* <ArchiveCell label="Release">
                    <AnswerHeader
                        name={release?.character?.name}
                        imageUrl={release?.character?.image ? `/assets/characters/${release.character.image}` : null}
                    />
                    {release ? (
                        <div className="flex-1 min-h-0 min-w-0">
                            <ScaleFit referenceWidth={340}>
                                <ArchiveReleaseCard
                                    triggerPhrase={release.trigger_phrase}
                                    techniqueName={release.technique_name}
                                    techniqueTranslation={release.technique_translation}
                                    audioUrl={release.audio_url}
                                />
                            </ScaleFit>
                        </div>
                    ) : (
                        <EmptyState label="Release" />
                    )}
                </ArchiveCell> */}
            </div>
        </div>
    );
}