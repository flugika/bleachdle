// npx tsx src/scripts/generate-silhouettes.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const SILHOUETTES_FILE = path.join(DATA_DIR, 'silhouettes.json');

function toSilhouetteFilename(baseImage) {
    const withoutExt = baseImage.replace(/\.(webp|png|jpe?g)$/i, '');
    return `${withoutExt}_cutout_silhouette.webp`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 🛡️ Helper สำหรับ Atomic File Write
function writeJsonAtomic(filePath, data) {
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 4), 'utf8');
    fs.renameSync(tempPath, filePath);
}

function run() {
    try {
        const charactersData = fs.readFileSync(CHARACTERS_FILE, 'utf8');
        const characters = JSON.parse(charactersData);

        let existingSilhouettes = [];
        try {
            const raw = fs.readFileSync(SILHOUETTES_FILE, 'utf8').trim();
            if (raw) existingSilhouettes = JSON.parse(raw);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }

        const existingMap = new Map(existingSilhouettes.map(s => [s.character_id, s]));

        let createdCount = 0;
        let keptCount = 0;
        let backfilledIdCount = 0;

        const nextSilhouettes = characters.map(char => {
            const existing = existingMap.get(char.id);

            if (existing) {
                keptCount++;
                if (!existing.id || !UUID_RE.test(existing.id)) {
                    backfilledIdCount++;
                    return { id: randomUUID(), ...existing };
                }
                return existing;
            }

            createdCount++;
            return {
                id: randomUUID(),
                character_id: char.id,
                image: toSilhouetteFilename(char.image),
            };
        });

        const currentCharacterIds = new Set(characters.map(c => c.id));
        const orphanedCount = existingSilhouettes.filter(s => !currentCharacterIds.has(s.character_id)).length;

        writeJsonAtomic(SILHOUETTES_FILE, nextSilhouettes);

        console.log('✅ Done — silhouettes.json has been written.');
        console.log(`Newly created (id + default focus/scale): ${createdCount}`);
        console.log(`Kept unchanged: ${keptCount}`);
        if (backfilledIdCount > 0) console.log(`🆕 Backfilled id for old entries: ${backfilledIdCount}`);
        if (orphanedCount > 0) console.warn(`⚠️ Found ${orphanedCount} orphaned entr${orphanedCount === 1 ? 'y' : 'ies'} (character_id not found in current characters.json) — dropped`);
        console.log(`Updated file: ${SILHOUETTES_FILE}`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

run();