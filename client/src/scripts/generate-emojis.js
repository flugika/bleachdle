// Scaffold (mock-friendly):  npx tsx src/scripts/generate-emojis.js
// Commit (swap name -> id):  npx tsx src/scripts/generate-emojis.js --commit

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const EMOJIS_FILE = path.join(DATA_DIR, 'emojis.json');
const EMOJIS_BACKUP_FILE = path.join(DATA_DIR, 'emojis.backup.json');
const EMOJI_LIST_FILE = path.join(DATA_DIR, 'emoji-list.json');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMOJI_COUNT = 4;

const PLACEHOLDER_EMOJI = ['❓', '❓', '❓', '❓'];
const REF_ID_FIELD = '_character_ref_id';

function resolveRealCharacterId(entry, validCharacterIds) {
    if (entry[REF_ID_FIELD] && validCharacterIds.has(entry[REF_ID_FIELD])) {
        return entry[REF_ID_FIELD];
    }
    if (entry.character_id && validCharacterIds.has(entry.character_id)) {
        return entry.character_id;
    }
    return null;
}

function loadEmojiSets() {
    if (!fs.existsSync(EMOJIS_FILE)) return [];
    const raw = fs.readFileSync(EMOJIS_FILE, 'utf8').trim();
    return raw ? JSON.parse(raw) : [];
}

function loadCharacters() {
    const charactersData = fs.readFileSync(CHARACTERS_FILE, 'utf8');
    return JSON.parse(charactersData);
}

// ─────────────────────────────────────────────────────────────
// 🆕 Pulls curated emoji data in from emoji-list.json (name matching
// is fuzzy/flexible on purpose so minor formatting differences don't break it)
// ─────────────────────────────────────────────────────────────
function applyCuratedEmojis(emojiSets) {
    if (!fs.existsSync(EMOJI_LIST_FILE)) return emojiSets;

    const raw = fs.readFileSync(EMOJI_LIST_FILE, 'utf8');
    const curatedMap = new Map();

    // Regex that finds a name and its emoji array
    const blockRegex = /(?:"([^"]+)"|([^:\n]+))\s*:\s*\[([\s\S]*?)\]/g;
    let match;

    while ((match = blockRegex.exec(raw)) !== null) {
        // Extract the name, stripping any extra surrounding quotes
        let name = (match[1] || match[2]).trim();
        name = name.replace(/^["']|["']$/g, '').trim();

        const content = match[3];
        // Pull out just the emoji strings inside quotes
        const emojis = [...content.matchAll(/"([^"]+)"/g)].map(m => m[1]);

        if (emojis.length > 0) {
            // Normalize the key to lowercase to make matching more forgiving
            curatedMap.set(name.toLowerCase(), emojis);
        }
    }

    if (curatedMap.size === 0) {
        console.warn(`⚠️ Could not extract any emoji data from emoji-list.json — check the file format again`);
        return emojiSets;
    }

    console.log(`📥 Found curated data in emoji-list.json for ${curatedMap.size} character(s)`);
    let appliedCount = 0;

    const updatedSets = emojiSets.map(entry => {
        // Character name from the character_id field (in Scaffold mode this is
        // a display name like "Orihime Inoue", not a UUID yet)
        const currentName = String(entry.character_id || '').trim().toLowerCase();

        if (curatedMap.has(currentName)) {
            appliedCount++;
            return { ...entry, emoji_list: curatedMap.get(currentName) };
        }
        return entry;
    });

    console.log(`✨ Applied emoji sets successfully: ${appliedCount} entr${appliedCount === 1 ? 'y' : 'ies'}\n`);
    return updatedSets;
}

// ─────────────────────────────────────────────────────────────
// SCAFFOLD MODE
// ─────────────────────────────────────────────────────────────
function runScaffold() {
    const characters = loadCharacters();
    const validCharacterIds = new Set(characters.map(c => c.id));
    const existingEmojiSets = loadEmojiSets();

    const existingMap = new Map();
    for (const entry of existingEmojiSets) {
        const realId = resolveRealCharacterId(entry, validCharacterIds);
        if (realId) existingMap.set(realId, entry);
    }

    let createdCount = 0;
    let keptCount = 0;
    const needsCuration = [];

    const nextEmojiSets = characters.map(char => {
        const existing = existingMap.get(char.id);

        if (existing) {
            keptCount++;
            let list = Array.isArray(existing.emoji_list) ? [...existing.emoji_list] : [];
            if (list.length !== EMOJI_COUNT) {
                while (list.length < EMOJI_COUNT) list.push('❓');
                list = list.slice(0, EMOJI_COUNT);
            }

            const isPlaceholder = list.every(e => e === '❓');
            if (isPlaceholder) needsCuration.push(char.name);

            const hasValidId = existing.id && UUID_RE.test(existing.id);

            return {
                id: hasValidId ? existing.id : randomUUID(),
                character_id: char.name,
                [REF_ID_FIELD]: char.id,
                emoji_list: list,
            };
        }

        createdCount++;
        needsCuration.push(char.name);
        return {
            id: randomUUID(),
            character_id: char.name,
            [REF_ID_FIELD]: char.id,
            emoji_list: [...PLACEHOLDER_EMOJI],
        };
    });

    const orphanedCount = existingEmojiSets.filter(e => !resolveRealCharacterId(e, validCharacterIds)).length;

    fs.writeFileSync(EMOJIS_FILE, JSON.stringify(nextEmojiSets, null, 4), 'utf8');

    console.log('✅ Done — emojis.json has been written! (MOCK MODE)');
    console.log(`Created: ${createdCount} | Kept: ${keptCount}`);
    if (orphanedCount > 0) console.warn(`⚠️ Found ${orphanedCount} orphaned entr${orphanedCount === 1 ? 'y' : 'ies'} — removed`);
    if (needsCuration.length > 0) {
        console.warn(`\n📝 ${needsCuration.length} character(s) still need their emoji_list curated`);
    }
    console.log(`\n⚠️ This file is not yet playable — fill in emoji-list.json, then run with --commit`);
}

// ─────────────────────────────────────────────────────────────
// COMMIT MODE
// ─────────────────────────────────────────────────────────────
function runCommit() {
    const characters = loadCharacters();
    const validCharacterIds = new Set(characters.map(c => c.id));
    const nameById = new Map(characters.map(c => [c.id, c.name]));

    let existingEmojiSets = loadEmojiSets();
    if (existingEmojiSets.length === 0) {
        console.warn('⚠️ emojis.json is empty or missing — nothing to commit');
        return;
    }

    // 🛟 back it up first
    fs.writeFileSync(EMOJIS_BACKUP_FILE, JSON.stringify(existingEmojiSets, null, 4), 'utf8');

    // 1. Pull in data from emoji-list.json and apply it to the scaffolded sets first
    existingEmojiSets = applyCuratedEmojis(existingEmojiSets);

    let committedCount = 0;
    let skippedPlaceholderCount = 0;
    const removedNames = [];

    // 2. Filter out: anything still all-❓ after step 1 (i.e. never got curated)
    const filteredSets = existingEmojiSets.filter(entry => {
        const list = Array.isArray(entry.emoji_list) ? entry.emoji_list : [];
        const isPlaceholder = list.every(e => e === '❓') || list.length === 0;

        if (isPlaceholder) {
            skippedPlaceholderCount++;
            const realId = resolveRealCharacterId(entry, validCharacterIds);
            if (realId) {
                removedNames.push(nameById.get(realId) || realId);
            }
            return false;
        }
        return true;
    });

    // 3. Swap the display-name character_id over to the real UUID
    const committed = filteredSets.map(entry => {
        const realId = resolveRealCharacterId(entry, validCharacterIds);

        if (!realId) {
            console.warn(`⚠️ Skipping entry id=${entry.id} — couldn't resolve a real character_id`);
            return entry;
        }

        const hadRefField = Object.prototype.hasOwnProperty.call(entry, REF_ID_FIELD);
        if (hadRefField) committedCount++;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring here is how we drop this key from `rest`
        const { [REF_ID_FIELD]: _drop, ...rest } = entry;
        return { ...rest, character_id: realId };
    });

    fs.writeFileSync(EMOJIS_FILE, JSON.stringify(committed, null, 4), 'utf8');

    console.log('✅ Commit complete — emojis imported, unfinished entries dropped, and IDs swapped back to UUIDs');
    console.log(`Successfully resolved to real ids: ${committedCount} entr${committedCount === 1 ? 'y' : 'ies'}`);

    if (skippedPlaceholderCount > 0) {
        console.log(`\n🛑 Temporarily dropped ${skippedPlaceholderCount} placeholder (❓) entr${skippedPlaceholderCount === 1 ? 'y' : 'ies'}`);
        if (removedNames.length <= 10) {
            console.log(`[ ${removedNames.join(', ')} ]`);
        } else {
            console.log(`(hiding the rest of the list — too many to show)`);
        }
    }
}

function run() {
    try {
        const isCommit = process.argv.includes('--commit');
        if (isCommit) {
            runCommit();
        } else {
            runScaffold();
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

run();