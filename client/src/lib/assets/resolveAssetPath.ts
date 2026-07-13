// src/lib/assets/resolveAssetPath.ts
import 'server-only';
import path from 'path';
import { getCharacterById } from '@/src/features/character/character';
import { getSongById } from '@/src/features/song/song';
import { getReleaseById } from '@/src/features/release/release';
import { getSilhouettes } from '@/src/features/silhouette/silhouette';

const ROOT = process.cwd();

// 👈 กันพัง ไม่ว่า field จะเก็บเป็น "file.mp3" เฉยๆ หรือ "/assets/audio/songs/file.mp3"
// (เคส song.audio_url ที่ยังมี legacy public path ติดมาจากตอนยังไม่ได้ทำ private assets)
const filenameOnly = (raw: string) => path.basename(raw);

export async function resolveAssetPath(type: string, id: string): Promise<string | null> {
    switch (type) {
        case 'silhouette': {
            const s = getSilhouettes().find((s) => s.character_id === id);
            return s ? path.join(ROOT, 'assets-private/character_silhouette', filenameOnly(s.image)) : null;
        }
        case 'character': {
            const c = getCharacterById(id);
            return c ? path.join(ROOT, 'assets-private/characters', filenameOnly(c.image)) : null;
        }
        case 'song': {
            const s = getSongById(id);
            return s?.audio_url ? path.join(ROOT, 'assets-private/audio/songs', filenameOnly(s.audio_url)) : null;
        }
        case 'release': {
            const r = getReleaseById(id);
            return r?.audio_url ? path.join(ROOT, 'assets-private/audio/releases', filenameOnly(r.audio_url)) : null;
        }
        default:
            return null;
    }
}