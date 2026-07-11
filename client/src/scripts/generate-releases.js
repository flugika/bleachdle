// npx tsx src/scripts/generate-releases.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const RELEASES_FILE = path.join(DATA_DIR, 'releases.json');

const VALID_RELEASE_TYPES = ['Shikai', 'Bankai', 'Resurreccion', 'Vollstandig'];

// 🎯 ลิสต์เฉพาะตัวละครที่ตั้งใจจะเอาแค่ Shikai เท่านั้น (เพราะไม่มี Bankai หรืออยากโชว์แค่ Shikai)
const ICONIC_SHIKAI_CHARACTERS = [
    "Izuru Kira",
    "Shuhei Hisagi",
    "Sosuke Aizen"
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_CLIP_END_MS = 10_000;

const slugifyName = (name) => name.trim().replace(/\s+/g, '_');
const buildAudioUrl = (releaseType, characterName) => `${releaseType}_${slugifyName(characterName)}.mp3`;

function run() {
    try {
        const charactersData = fs.readFileSync(CHARACTERS_FILE, 'utf8');
        const characters = JSON.parse(charactersData);
        const currentCharacterIds = new Set(characters.map((c) => c.id));

        let existingReleases = [];
        if (fs.existsSync(RELEASES_FILE)) {
            const raw = fs.readFileSync(RELEASES_FILE, 'utf8').trim();
            if (raw) existingReleases = JSON.parse(raw);
        }

        const existingKey = (r) => `${r.character_id}::${r.release_type}`;
        const existingMap = new Map(existingReleases.map((r) => [existingKey(r), r]));

        const generatedStubs = [];

        for (const character of characters) {
            const charReleases = character.release || [];
            const hasBankai = charReleases.includes('Bankai');

            const releaseTypesForChar = charReleases.filter((t) => {
                if (!VALID_RELEASE_TYPES.includes(t)) return false;

                // 🛑 ลอจิก: ถ้าตัวละครนี้มี Bankai ให้ตัด Shikai ทิ้งทันที
                if (t === 'Shikai') {
                    if (hasBankai) return false;
                    return ICONIC_SHIKAI_CHARACTERS.includes(character.name);
                }

                return true;
            });

            for (const releaseType of releaseTypesForChar) {
                const key = `${character.id}::${releaseType}`;
                if (existingMap.has(key)) continue;

                const stub = {
                    id: randomUUID(),
                    character_id: character.id,
                    release_type: releaseType,
                    trigger_phrase: '',
                    technique_name: '',
                    technique_translation: null,
                    audio_url: buildAudioUrl(releaseType, character.name),
                    clip_end_ms: DEFAULT_CLIP_END_MS,
                    source_episode: null,
                };

                generatedStubs.push(stub);
                existingMap.set(key, stub);
            }
        }

        if (generatedStubs.length > 0) {
            console.log(`🆕 Generated ${generatedStubs.length} new stub release(s):`);
            for (const s of generatedStubs) {
                const char = characters.find((c) => c.id === s.character_id);
                console.log(`  ${char ? char.name : s.character_id} — ${s.release_type} → ${s.audio_url}`);
            }
        }

        const mergedReleases = [...existingReleases, ...generatedStubs];

        // Validation & Cleanup phase
        let backfilledIdCount = 0;
        let invalidTypeCount = 0;
        let missingFieldCount = 0;

        const nextReleases = mergedReleases.map((r) => {
            let entry = r;
            if (!entry.id || !UUID_RE.test(entry.id)) {
                backfilledIdCount++;
                entry = { id: randomUUID(), ...entry };
            }
            if (!VALID_RELEASE_TYPES.includes(entry.release_type)) invalidTypeCount++;

            return entry;
        });

        const orphaned = nextReleases.filter((r) => !currentCharacterIds.has(r.character_id));
        const orphanedIds = new Set(orphaned.map((r) => r.id));
        const cleanedReleases = nextReleases.filter((r) => !orphanedIds.has(r.id));

        // ลบ Shikai เก่าๆ ของคนที่มี Bankai ออกจากไฟล์ json ให้หมดเกลี้ยง
        const finalCleanedReleases = cleanedReleases.filter((r) => {
            if (r.release_type === 'Shikai') {
                const char = characters.find((c) => c.id === r.character_id);
                if (char && (char.release || []).includes('Bankai')) {
                    return false;
                }
            }
            return true;
        });

        fs.writeFileSync(RELEASES_FILE, JSON.stringify(finalCleanedReleases, null, 4), 'utf8');

        console.log('\n✅ Done — releases.json has been cleaned and updated (No Spoilers Clutter).');
        console.log(`Total release entries: ${finalCleanedReleases.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

run();