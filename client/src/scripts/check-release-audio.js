// npx tsx src/scripts/check-release-audio.js                 → dry-run, list only
// npx tsx src/scripts/check-release-audio.js --delete          → deletes orphaned files on disk
// npx tsx src/scripts/check-release-audio.js --prune-missing   → removes releases.json records whose audio file doesn't exist
//
// ตรวจสอบว่า audio_url ทุกตัวใน releases.json มีไฟล์จริงอยู่ใน public/assets/releases
// - ไฟล์หาย (referenced but missing) — ลบ record ออกจาก releases.json ได้ด้วย --prune-missing
// - ไฟล์กำพร้า (exists on disk but ไม่มี release ไหนอ้างถึง) — ลบไฟล์ได้ด้วย --delete
// - ชื่อไฟล์ชนกันแบบ case-sensitive (เช่น Bankai_Foo.mp3 vs bankai_foo.mp3 — พังบน Linux server แม้ทำงานได้บน Mac/Windows)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const RELEASES_FILE = path.join(DATA_DIR, 'releases.json');

// 🩹 ปรับ path นี้ให้ตรงกับที่เก็บไฟล์เสียงจริงในโปรเจกต์ (สมมติฐาน: public/assets/releases)
const AUDIO_DIR = path.join(__dirname, '../../public/assets/audio/releases');

const SHOULD_DELETE = process.argv.includes('--delete');
const SHOULD_PRUNE = process.argv.includes('--prune-missing');

// 🗑️ ลบไฟล์กำพร้า (ไฟล์ที่มีจริงบนดิสก์แต่ไม่มี release ไหนใน releases.json อ้างถึง)
// เป็น dry-run โดยดีฟอลต์ — ต้องส่ง shouldDelete=true ถึงจะลบจริง ป้องกันมือลั่น
function deleteOrphanedFiles(orphanedFiles, shouldDelete) {
    if (orphanedFiles.length === 0) return { deleted: [], failed: [] };

    const deleted = [];
    const failed = [];

    for (const file of orphanedFiles) {
        const fullPath = path.join(AUDIO_DIR, file);
        if (!shouldDelete) continue;

        try {
            fs.unlinkSync(fullPath);
            deleted.push(file);
        } catch (err) {
            failed.push({ file, error: err.message });
        }
    }

    return { deleted, failed };
}

// ✂️ ลบ record ใน releases.json ที่ไม่มีไฟล์เสียงจริงรองรับ (missing เท่านั้น — ไม่แตะ
// caseMismatch เพราะไฟล์นั้นมีอยู่จริง แค่ตัวพิมพ์เล็ก-ใหญ่ไม่ตรง ไม่ควรลบทิ้ง)
// สำรอง releases.json เดิมไว้เป็น releases.json.bak ก่อนเขียนทับเสมอ กันพลาด
function pruneMissingReleases(allReleases, missingIds, shouldPrune) {
    if (!shouldPrune || missingIds.size === 0) return { pruned: [], kept: allReleases };

    const backupPath = RELEASES_FILE.replace(/\.json$/, '.json.bak');
    fs.writeFileSync(backupPath, JSON.stringify(allReleases, null, 4), 'utf8');

    const pruned = allReleases.filter((r) => missingIds.has(r.id));
    const kept = allReleases.filter((r) => !missingIds.has(r.id));

    fs.writeFileSync(RELEASES_FILE, JSON.stringify(kept, null, 4), 'utf8');

    return { pruned, kept, backupPath };
}

function run() {
    if (!fs.existsSync(RELEASES_FILE)) {
        console.error(`❌ Not found: ${RELEASES_FILE}`);
        process.exit(1);
    }
    if (!fs.existsSync(AUDIO_DIR)) {
        console.error(`❌ Audio directory not found: ${AUDIO_DIR}`);
        console.error(`   Adjust AUDIO_DIR at the top of this script if your assets live elsewhere.`);
        process.exit(1);
    }

    const releases = JSON.parse(fs.readFileSync(RELEASES_FILE, 'utf8'));
    const diskFiles = fs.readdirSync(AUDIO_DIR);
    const diskFileSet = new Set(diskFiles);
    const diskFileLowerMap = new Map(diskFiles.map((f) => [f.toLowerCase(), f]));

    const missing = [];
    const caseMismatch = [];
    const referenced = new Set();

    for (const r of releases) {
        if (!r.audio_url) {
            missing.push({ id: r.id, character_id: r.character_id, release_type: r.release_type, audio_url: '(empty)' });
            continue;
        }

        referenced.add(r.audio_url);

        if (diskFileSet.has(r.audio_url)) continue;

        const lowerMatch = diskFileLowerMap.get(r.audio_url.toLowerCase());
        if (lowerMatch) {
            caseMismatch.push({ expected: r.audio_url, actualOnDisk: lowerMatch, character_id: r.character_id, release_type: r.release_type });
        } else {
            missing.push({ id: r.id, character_id: r.character_id, release_type: r.release_type, audio_url: r.audio_url });
        }
    }

    const orphaned = diskFiles.filter((f) => !referenced.has(f));

    console.log(`📂 Audio dir: ${AUDIO_DIR}`);
    console.log(`📄 Releases checked: ${releases.length}`);
    console.log(`🎵 Files on disk: ${diskFiles.length}\n`);

    if (missing.length === 0 && caseMismatch.length === 0) {
        console.log('✅ Every release audio_url has a matching file.');
    } else {
        if (missing.length > 0) {
            console.log(`❌ Missing files (${missing.length}):`);
            for (const m of missing) {
                console.log(`   [${m.character_id} / ${m.release_type}] → ${m.audio_url}`);
            }
            console.log('');

            const missingIds = new Set(missing.map((m) => m.id));
            if (SHOULD_PRUNE) {
                const { pruned, backupPath } = pruneMissingReleases(releases, missingIds, true);
                console.log(`✂️  Pruned ${pruned.length} record(s) from releases.json.`);
                console.log(`   Backup saved to: ${backupPath}\n`);
            } else {
                console.log(`ℹ️  Dry run only — releases.json not modified. Re-run with --prune-missing to remove these records.\n`);
            }
        }
        if (caseMismatch.length > 0) {
            console.log(`⚠️  Case mismatch — works on Mac/Windows, breaks on Linux servers (${caseMismatch.length}):`);
            for (const c of caseMismatch) {
                console.log(`   [${c.character_id} / ${c.release_type}] expected "${c.expected}" but disk has "${c.actualOnDisk}"`);
            }
            console.log('');
        }
    }

    if (orphaned.length > 0) {
        console.log(`🗑️  Orphaned files on disk, not referenced by any release (${orphaned.length}):`);
        for (const o of orphaned) console.log(`   ${o}`);

        console.log('');
        if (SHOULD_DELETE) {
            const { deleted, failed } = deleteOrphanedFiles(orphaned, true);
            console.log(`🔥 Deleted ${deleted.length}/${orphaned.length} orphaned file(s).`);
            if (failed.length > 0) {
                console.log(`❌ Failed to delete ${failed.length} file(s):`);
                for (const f of failed) console.log(`   ${f.file} — ${f.error}`);
            }
        } else {
            console.log(`ℹ️  Dry run only — nothing deleted. Re-run with --delete to remove these files.`);
        }
    }

    if (missing.length > 0 || caseMismatch.length > 0) {
        process.exitCode = 1;
    }
}

run();