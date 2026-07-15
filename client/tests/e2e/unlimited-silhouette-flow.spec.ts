// client/tests/e2e/unlimited-silhouette-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/unlimited-silhouette-flow.spec.ts

import { test, expect, Page, Locator } from '@playwright/test';
import rawCharacters from '../../src/data/characters.json';
import rawSilhouettes from '../../src/data/silhouettes.json';

const UNLIMITED_ROUTE = '/unlimited/silhouette';

// ⚠️ ปรับ Key ให้ตรงกับ STORAGE_KEYS.SILHOUETTE_PROGRESS / SILHOUETTE_COMPLETED / SILHOUETTE_STATS /
// SOUL_REGISTRY จริงในโปรเจกต์
const PROGRESS_STORAGE_KEY = 'bleachdle-silhouette-progress';
const COMPLETED_STORAGE_KEY = 'bleachdle-silhouette-completed';
const STATS_STORAGE_KEY = 'bleachdle-silhouette-stats';
const SOUL_REGISTRY_STORAGE_KEY = 'bleachdle-soul-registry';

// 🎯 ต้องตรงกับ src/features/silhouette/silhouette.ts เป๊ะ
// (INITIAL_REVEAL_SILHOUETTE=8 ยืนยันจริงจากการรันแล้ว)
const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const INITIAL_REVEAL_SILHOUETTE = 8;
const REVEAL_PER_GUESS = 1;
const MAX_REVEAL_RATIO = 0.85;
const MAX_ALLOWED_TOTAL_REVEAL = Math.floor(TOTAL_CELLS * MAX_REVEAL_RATIO); // 21

// ⚠️ ต้องตรงกับ SilhouetteControlPanel.tsx: <SearchBar ... rowIdPrefix="silhouette-row" />
const ROW_ID_PREFIX = 'silhouette-row';

test.describe('Bleachdle Unlimited Silhouette Challenge E2E Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    async function getUnlimitedState(page: Page) {
        return await page.evaluate((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw);
                return parsed.unlimited?.state || null;
            } catch {
                return null;
            }
        }, PROGRESS_STORAGE_KEY);
    }

    async function waitForTarget(page: Page) {
        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.unlimited?.state?.target?.character_id;
        }, PROGRESS_STORAGE_KEY);
    }

    function findCharacterName(characterId: string) {
        const character = rawCharacters.find((c) => c.id === characterId);
        if (!character) throw new Error(`Character with ID "${characterId}" not found`);
        return character.name;
    }

    async function getRevealedCellCount(page: Page): Promise<number> {
        return await page.evaluate(() => {
            const grid = document.querySelector('.grid.z-40');
            if (!grid) return -1;
            const cells = Array.from(grid.children) as HTMLElement[];
            return cells.filter((cell) => cell.style.opacity === '0').length;
        });
    }

    async function readStreakStats(page: Page): Promise<{ currentStreak: number; maxStreak: number }> {
        return await page.evaluate((key) => {
            const raw = JSON.parse(localStorage.getItem(key) || '{}');
            return raw.unlimited || { currentStreak: 0, maxStreak: 0 };
        }, STATS_STORAGE_KEY);
    }

    async function readCompletedRoster(page: Page): Promise<string[]> {
        return await page.evaluate((key) => {
            const raw = JSON.parse(localStorage.getItem(key) || '{}');
            return raw.unlimited || [];
        }, COMPLETED_STORAGE_KEY);
    }

    /**
     * 🩹 ROOT-CAUSE FIX (จาก run แรกที่ค้าง 30s แล้ว timeout):
     * SearchBar ถูก disable ทันทีที่ isGameOver เป็น true (ก่อน showSummary delay 900-1600ms
     * ด้วยซ้ำ) — element ยัง "visible" อยู่แต่ไม่ "enabled" ระหว่างช่วงรอยต่อนี้ แถมพอ
     * summary render ทับ SilhouetteControlPanel จะ unmount หายไปทั้งก้อน (element detached)
     *
     * เดิม loop เช็คแค่ .isVisible() ก่อน fill() (ไม่มี timeout กำกับ) — พอ input กลาย
     * เป็น disabled/detached ระหว่างช่วงรอยต่อนี้ fill() เลย retry จนครบ default timeout
     * ของ test (30s) ทั้งที่จริง ๆ แล้ว "เกมจบแล้ว" ตั้งแต่ guess ก่อนหน้า
     *
     * แก้โดยใส่ timeout สั้น ๆ ให้ทุก action ในลูป แล้ว treat การ throw เป็นสัญญาณ
     * "รอบจบแล้ว" (ไม่ว่าจะเพราะ disabled, detached, หรือ dropdown ไม่ขึ้น) แทนที่จะรอ
     * จนกว่า test timeout ทั้งก้อนจะระเบิด
     */
    async function tryGuess(
        page: Page,
        searchInput: Locator,
        character: { id: string; name: string }
    ): Promise<boolean> {
        try {
            await searchInput.fill(character.name, { timeout: 3000 });
        } catch {
            return false;
        }

        const option = page.locator('li').getByText(character.name, { exact: true }).first();
        try {
            await option.waitFor({ state: 'visible', timeout: 3000 });
            await option.click({ timeout: 3000 });
        } catch {
            return false;
        }

        return true;
    }

    // ==========================================
    // CASE 1a: การเดาจนกระทั่งชนะ — ตรวจผลลัพธ์ผ่าน state (ไม่พึ่ง UI ที่ยังไม่รู้จัก selector จริง)
    // ==========================================
    test('Victory Flow: matching the target finalizes the round (streak +1, completion registry updated)', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(searchInput).toBeVisible();
        await waitForTarget(page);

        const stateBefore = await getUnlimitedState(page);
        const characterId = stateBefore.target.character_id;
        const targetCharacterName = findCharacterName(characterId);

        await searchInput.fill(targetCharacterName);
        const option = page.locator('li').getByText(targetCharacterName, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        await expect(page.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeVisible({ timeout: 6000 });

        // ✅ ยืนยันผ่าน localStorage โดยตรง — ไม่ต้องพึ่งการคลิกปุ่มใดๆ เพราะ finalizeGame()
        // รันจาก effect ทันทีที่ isGameOver เป็น true ไม่ผูกกับการเปิด/ปิด summary modal
        await expect.poll(() => readStreakStats(page).then((s) => s.currentStreak)).toBe(1);

        const completed = await readCompletedRoster(page);
        expect(completed).toContain(characterId);

        const stateAfter = await getUnlimitedState(page);
        expect(stateAfter.hasFinalized).toBe(true);
    });

    const SUMMARY_ACTION_BUTTON_NAME = 'OPEN SENKAIMON 卍';

    // ✅ ยืนยันจาก src/shared/ui/Central46ConfidentialArchive.tsx จริง:
    // - container: role="document" aria-label="Central 46 Classified Archive"
    // - soul name input: placeholder="ENTER YOUR SOUL NAME" (ไม่ชนกับ SearchBar หลัก
    //   ซึ่ง placeholder จริงคือ "ENTER SOUL NAME..." — คนละคำ ปลอดภัยแล้ว)
    // - submit ผ่าน <form onSubmit={handleRegisterSoul}> ปุ่ม EtchButton text "ETCH SOUL NAME"
    //   (disabled จนกว่า inputName.trim() จะไม่ว่าง)
    // - CTAButton (hard-reset) accessible text มี "NEW CYCLE, NEW LIFE" ตอน canReset=true,
    //   canReset มาจาก page.tsx: soulName.trim().length > 0 (ต้อง register ก่อนถึงจะกดได้)
    const ARCHIVE_DOCUMENT_NAME = 'Central 46 Classified Archive';
    const SOUL_NAME_PLACEHOLDER = 'ENTER YOUR SOUL NAME';
    const ETCH_BUTTON_NAME = /ETCH SOUL NAME/i;
    const HARD_RESET_BUTTON_NAME = /NEW CYCLE, NEW LIFE/i;

    async function registerSoulName(page: Page, name: string) {
        const input = page.getByPlaceholder(SOUL_NAME_PLACEHOLDER);
        await expect(input).toBeVisible();
        await input.fill(name);
        await page.getByRole('button', { name: ETCH_BUTTON_NAME }).click();
    }

    /**
     * 🌱 Seeds every unique character except the currently-loaded target as
     * completed, wins the last remaining one, and closes the summary — leaving
     * the page on the Central46ConfidentialArchive screen. Shared by both
     * Case 6 and Case 7 so the completion setup isn't duplicated.
     */
    async function reachCompletionArchive(page: Page) {
        await page.goto(UNLIMITED_ROUTE);
        await waitForTarget(page);

        const state = await getUnlimitedState(page);
        const currentCharacterId = state.target.character_id;
        const targetCharacterName = findCharacterName(currentCharacterId);

        const uniqueCharacterIds = Array.from(new Set(rawSilhouettes.map((s) => s.character_id)));
        const seededCompleted = uniqueCharacterIds.filter((id) => id !== currentCharacterId);

        await page.evaluate(
            ({ key, ids }) => {
                const raw = JSON.parse(localStorage.getItem(key) || '{}');
                raw.unlimited = ids;
                localStorage.setItem(key, JSON.stringify(raw));
            },
            { key: COMPLETED_STORAGE_KEY, ids: seededCompleted }
        );

        await page.reload();
        await waitForTarget(page);

        const stateAfterSeed = await getUnlimitedState(page);
        expect(stateAfterSeed.target.character_id).toBe(currentCharacterId);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await searchInput.fill(targetCharacterName);
        await page.locator('li').getByText(targetCharacterName, { exact: true }).first().click();
        await expect(page.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeVisible({ timeout: 6000 });

        await page.getByRole('button', { name: SUMMARY_ACTION_BUTTON_NAME }).click();
        await expect(page.getByRole('document', { name: ARCHIVE_DOCUMENT_NAME })).toBeVisible({ timeout: 6000 });

        return { currentCharacterId, uniqueCharacterIds };
    }

    // ==========================================
    // CASE 1b: ปิด summary แล้วต้องได้ target ใหม่ทันที (unblocked)
    // ==========================================
    test('Closing the win summary rolls a new target and resets guesses to 0', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await waitForTarget(page);

        const stateBefore = await getUnlimitedState(page);
        const targetCharacterName = findCharacterName(stateBefore.target.character_id);

        await searchInput.fill(targetCharacterName);
        await page.locator('li').getByText(targetCharacterName, { exact: true }).first().click();
        await expect(page.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeVisible({ timeout: 6000 });

        const continueButton = page.getByRole('button', { name: SUMMARY_ACTION_BUTTON_NAME });
        await expect(continueButton).toBeVisible();
        await continueButton.click();

        await expect(searchInput).toBeVisible({ timeout: 6000 });
        await waitForTarget(page);
        const stateAfter = await getUnlimitedState(page);
        expect(stateAfter.guesses.length).toBe(0);
        expect(stateAfter.hasFinalized).toBe(false);
    });

    // ==========================================
    // CASE 2: การเดาผิดจนหมดสิทธิ์ + streak รีเซ็ตเป็น 0 (Complete Loss Flow)
    // ==========================================
    test('Running out of guesses ends the round as a loss and resets the current streak to 0', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await waitForTarget(page);

        const state = await getUnlimitedState(page);
        const characterId = state.target.character_id;
        const wrongCharacters = rawCharacters.filter((c) => c.id !== characterId);

        for (const wrongCharacter of wrongCharacters) {
            const guessed = await tryGuess(page, searchInput, wrongCharacter);
            if (!guessed) break; // ครบโควต้าเดาแล้ว (input disabled/unmounted) — ถือว่ารอบจบ

            await expect(page.locator(`[id="${ROW_ID_PREFIX}-${wrongCharacter.id}"]`)).toBeVisible();
        }

        // ยืนยันแล้วจาก screenshot จริงว่า subtitle ฝั่งแพ้คือ "TARGET IDENTITY DISRUPTED"
        // (มาจาก SilhouetteSummaryGuess.tsx เมื่อ isWin=false) ใช้ได้ทั้ง daily/unlimited
        await expect(page.getByText('TARGET IDENTITY DISRUPTED')).toBeVisible({ timeout: 6000 });

        await expect.poll(() => readStreakStats(page).then((s) => s.currentStreak)).toBe(0);
    });

    // ==========================================
    // CASE 3: ข้อมูลสเตตคงอยู่หลังรีเฟรชหน้าจอ (Hydration & Persistence)
    // ==========================================
    test('State hydration persists the current round (target + guesses) across a hard reload', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await waitForTarget(page);

        const stateBefore = await getUnlimitedState(page);
        const targetIdBefore = stateBefore.target.id;
        const characterId = stateBefore.target.character_id;
        const wrongCharacter = rawCharacters.find((c) => c.id !== characterId) || rawCharacters[0];

        const guessed = await tryGuess(page, searchInput, wrongCharacter);
        expect(guessed).toBe(true);

        await expect(page.locator(`[id^="${ROW_ID_PREFIX}-"]`)).toHaveCount(1);

        await page.reload();

        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        await expect(page.locator(`[id="${ROW_ID_PREFIX}-${wrongCharacter.id}"]`)).toBeVisible();

        const stateAfter = await getUnlimitedState(page);
        expect(stateAfter.target.id).toBe(targetIdBefore);
        expect(stateAfter.guesses.length).toBe(1);
    });

    // ==========================================
    // CASE 4: กติกาปลดล็อกช่องตารางเงาแบบค่อยเป็นค่อยไป (Progressive Grid Reveal)
    // ==========================================
    test('Reveals one additional grid cell every wrong guess, capped at the reveal ratio limit', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await waitForTarget(page);

        await expect.poll(() => getRevealedCellCount(page)).toBe(INITIAL_REVEAL_SILHOUETTE);

        const state = await getUnlimitedState(page);
        const characterId = state.target.character_id;
        const wrongCharacters = rawCharacters.filter((c) => c.id !== characterId);

        let expectedRevealed = INITIAL_REVEAL_SILHOUETTE;
        const revealCeiling = Math.min(TOTAL_CELLS, MAX_ALLOWED_TOTAL_REVEAL);
        let wrongGuessCount = 0;

        for (const wrongCharacter of wrongCharacters) {
            if (expectedRevealed >= revealCeiling) break;

            const guessed = await tryGuess(page, searchInput, wrongCharacter);
            if (!guessed) break; // หมดโควต้าเดา (MAX_UNLIMITED_SILHOUETTE_GUESSES) ก่อนถึงเพดาน reveal

            await expect(page.locator(`[id="${ROW_ID_PREFIX}-${wrongCharacter.id}"]`)).toBeVisible();

            wrongGuessCount += 1;
            expectedRevealed = Math.min(
                revealCeiling,
                INITIAL_REVEAL_SILHOUETTE + wrongGuessCount * REVEAL_PER_GUESS
            );

            await expect.poll(() => getRevealedCellCount(page)).toBe(expectedRevealed);
        }

        expect(expectedRevealed).toBeGreaterThan(INITIAL_REVEAL_SILHOUETTE);
    });

    // ==========================================
    // CASE 5: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration)
    // ==========================================
    test('Can trigger mode selector and navigate from Unlimited to Daily silhouette mode', async ({ page }: { page: Page }) => {
        await page.goto(UNLIMITED_ROUTE);

        const modeBadge = page.locator('span, div').getByText(/unlimited/i).first();
        await expect(modeBadge).toBeVisible();
        await modeBadge.click();

        const dailyOption = page.locator('button, div').getByText(/daily/i).last();
        await expect(dailyOption).toBeVisible();
        await dailyOption.click();

        await expect(page).toHaveURL(/\/daily/);
    });

    // ==========================================
    // CASE 6: [BLOCKED] Hard Reset (Reincarnation) หลังครบทุกตัวละคร
    // ==========================================
    // 🚧 อัปเดตสถานะบล็อก (รอบนี้ได้ SummaryActionButton.tsx มาแล้ว แต่ยังไม่ได้
    // Central46ConfidentialArchive.tsx — มันถูกอ้างถึงใน uploaded_files ของข้อความก่อนหน้า
    // แต่เนื้อไฟล์ไม่ได้ถูกแนบมาจริง มีแค่กลุ่มไฟล์ src/shared/ui/summary/* เท่านั้น)
    //
    // สิ่งที่ยังไม่รู้ (ต้องได้จาก Central46ConfidentialArchive.tsx จริง):
    // 1) placeholder จริงของ input ลงทะเบียน soul name (ไม่ใช่ "ENTER SOUL NAME..." —
    //    อันนั้นพิสูจน์แล้วว่าเป็นของ SearchBar หลัก ไปชนกันเพราะ regex substring match)
    // 2) submit ด้วยปุ่มจริง (accessible name?) หรือ form onSubmit + กด Enter?
    //    (page.tsx: handleRegisterSoul รับ React.FormEvent — เป็นไปได้สูงว่าเป็น <form onSubmit>)
    // 3) accessible name ของปุ่ม hard-reset/reincarnation
    // 4) canReset = soulName.trim().length > 0 (จาก page.tsx) — ปุ่ม hard-reset ต้องรอ
    //    soulName ที่ "เคย" register ไว้แล้ว (จาก STORAGE_KEYS.SOUL_REGISTRY) ไม่ใช่แค่กรอกในฟอร์ม
    //    เฉยๆ — ต้อง confirm flow นี้ให้ชัดจากซอร์สจริงก่อนเขียน test
    test('Hard reset clears the current streak but preserves max streak and increments reincarnation count', async ({ page }) => {
        // ✅ Reuse the same path Case 7b already proved works: play out a real win
        // on the last remaining character so finalizeGame() runs its normal stats
        // flow, landing us on the archive screen deterministically.
        await reachCompletionArchive(page);

        // Seed maxStreak=5 on top of the real (post-win) stats, so we can prove
        // hard reset zeroes currentStreak while preserving maxStreak.
        await page.evaluate(
            ({ statsKey }) => {
                const statsRaw = JSON.parse(localStorage.getItem(statsKey) || '{}');
                statsRaw.unlimited = { ...statsRaw.unlimited, currentStreak: 5, maxStreak: 5 };
                localStorage.setItem(statsKey, JSON.stringify(statsRaw));
            },
            { statsKey: STATS_STORAGE_KEY }
        );
        await page.reload();
        await expect(page.getByRole('document', { name: ARCHIVE_DOCUMENT_NAME })).toBeVisible({ timeout: 6000 });

        // ✅ Real selectors, proven in Case 7b — not fabricated testids.
        await registerSoulName(page, 'Test Shinigami');

        const resetButton = page.getByRole('button', { name: HARD_RESET_BUTTON_NAME });
        await resetButton.waitFor({ state: 'visible' });
        await resetButton.click();

        await expect.poll(() => readStreakStats(page).then((s) => s.currentStreak)).toBe(0);
        await expect.poll(() => readStreakStats(page).then((s) => s.maxStreak)).toBe(5);

        const registry = await page.evaluate((key) => {
            const raw = JSON.parse(localStorage.getItem(key) || '{}');
            return raw.silhouette || { count: 0 };
        }, SOUL_REGISTRY_STORAGE_KEY);
        expect(registry.count).toBeGreaterThanOrEqual(1);
    });

    // ==========================================
    // CASE 7a: จบครบทุกตัวละคร — ตรวจผ่าน localStorage ว่าข้าม threshold จริง
    // ==========================================
    // ✅ ส่วนนี้ verifiable เต็มร้อยโดยไม่ต้องคลิกปุ่มลึกลับใดๆ: finalizeGame() เขียน
    // completed registry ทันทีตอน isGameOver (ก่อนเปิด summary ด้วยซ้ำ) — ตัดปัญหา
    // "ปุ่มไหนคือปุ่มปิด summary" ออกไปได้ทั้งหมดสำหรับเคสนี้
    test('Winning the last remaining character crosses the full-roster completion threshold', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        await waitForTarget(page);

        const state = await getUnlimitedState(page);
        const currentCharacterId = state.target.character_id;
        const targetCharacterName = findCharacterName(currentCharacterId);

        const uniqueCharacterIds = Array.from(new Set(rawSilhouettes.map((s) => s.character_id)));
        const seededCompleted = uniqueCharacterIds.filter((id) => id !== currentCharacterId);

        await page.evaluate(
            ({ key, ids }) => {
                const raw = JSON.parse(localStorage.getItem(key) || '{}');
                raw.unlimited = ids;
                localStorage.setItem(key, JSON.stringify(raw));
            },
            { key: COMPLETED_STORAGE_KEY, ids: seededCompleted }
        );

        await page.reload();
        await waitForTarget(page);

        const stateAfterSeed = await getUnlimitedState(page);
        expect(stateAfterSeed.target.character_id).toBe(currentCharacterId);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await searchInput.fill(targetCharacterName);
        await page.locator('li').getByText(targetCharacterName, { exact: true }).first().click();

        await expect(page.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeVisible({ timeout: 6000 });

        const completedAfterWin = await readCompletedRoster(page);
        expect(completedAfterWin).toContain(currentCharacterId);
        expect(completedAfterWin.length).toBe(uniqueCharacterIds.length);
    });

    // ==========================================
    // CASE 7b: [BLOCKED] การแสดงผล Central46ConfidentialArchive จริงบนหน้าจอ
    // ==========================================
    // 🚧 อัปเดตสถานะบล็อก: ปุ่มปิด summary รู้ selector จริงแล้ว ("OPEN SENKAIMON 卍" —
    // ดู SUMMARY_ACTION_BUTTON_NAME ด้านบน) เหลือแค่ Central46ConfidentialArchive.tsx เอง
    // ที่ยังไม่ได้รับมา — ไม่รู้ heading/ข้อความจริงที่บ่งบอกว่าเข้าหน้านี้แล้ว
    //
    // โครงที่พร้อมใช้ทันทีที่ได้ไฟล์ (คอมเมนต์ implementation ไว้ล่วงหน้าให้):
    test('Shows the Central46ConfidentialArchive once every unique character has been completed', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        await waitForTarget(page);

        const state = await getUnlimitedState(page);
        const currentCharacterId = state.target.character_id;
        const targetCharacterName = findCharacterName(currentCharacterId);

        const uniqueCharacterIds = Array.from(new Set(rawSilhouettes.map((s) => s.character_id)));
        const seededCompleted = uniqueCharacterIds.filter((id) => id !== currentCharacterId);
        await page.evaluate(
            ({ key, ids }) => {
                const raw = JSON.parse(localStorage.getItem(key) || '{}');
                raw.unlimited = ids;
                localStorage.setItem(key, JSON.stringify(raw));
            },
            { key: COMPLETED_STORAGE_KEY, ids: seededCompleted }
        );

        await page.reload();
        await waitForTarget(page);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await searchInput.fill(targetCharacterName);
        await page.locator('li').getByText(targetCharacterName, { exact: true }).first().click();
        await expect(page.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeVisible({ timeout: 6000 });

        await page.getByRole('button', { name: SUMMARY_ACTION_BUTTON_NAME }).click();

        await expect(page.getByText('CENTRAL 46', { exact: false }).first()).toBeVisible({ timeout: 6000 });
        await expect(page.getByText('IDENTITY REGISTRATION REQUIRED')).toBeVisible();

        // ดำเนินกระบวนการกรอกฟอร์มลงทะเบียนดวงวิญญาณ
        const nameInput = page.getByPlaceholder('ENTER YOUR SOUL NAME');
        await expect(nameInput).toBeVisible();
        await nameInput.fill('Kurosaki Ichigo');

        // กดปุ่มพิธีกรรม "ETCH SOUL NAME"
        const etchButton = page.getByRole('button', { name: /ETCH SOUL NAME|刻/i });
        await etchButton.click();

        // ตรวจสอบ Dossier ส่วนบุคคลว่าจะต้องเรนเดอร์ชื่อผู้เล่นเป็นอักษรตัวใหญ่ตามหน้าโค้ดจริง
        await expect(page.getByText('KUROSAKI ICHIGO')).toBeVisible();
        await expect(page.getByText('SOUL CYCLE').first()).toBeVisible();

        // ⚡ ดำเนินพิธีกรรมขั้นสูงสุด: กดปุ่ม "NEW CYCLE, NEW LIFE" เพื่อสั่งล้างประวัติ
        // (เรียก hardReset() ซึ่งลบ progress ทิ้งด้วย ไม่ใช่แค่ completed)
        const newLifeButton = page.getByRole('button', { name: /NEW CYCLE, NEW LIFE|新周/i });
        await newLifeButton.waitFor({ state: 'visible' });
        await newLifeButton.click();

        // 🧠 [DATA INTEGRITY RESET VERIFICATION]
        const postCompletedList = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, COMPLETED_STORAGE_KEY);

        expect(postCompletedList).toHaveLength(0);

        // เช็คที่ฝั่ง UI ว่าช่องค้นหาของหน้าปกติพร้อมให้เล่นสแตนด์บายเรียบร้อยแล้ว
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        void page;
    });

    // ==========================================
    // CASE 8: target สุ่มมาแต่ละรอบต้องมี entry อยู่จริงใน silhouettes.json (sanity guard)
    // ==========================================
    test('The unlimited target resolves to an existing silhouette entry with a valid image reference', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        await waitForTarget(page);

        const state = await getUnlimitedState(page);
        const silhouetteId = state.target.id;
        const characterId = state.target.character_id;

        const fullEntry = rawSilhouettes.find((s) => s.id === silhouetteId);
        expect(fullEntry).toBeTruthy();
        expect(fullEntry!.character_id).toBe(characterId);
        expect(typeof fullEntry!.image).toBe('string');
        expect(fullEntry!.image.length).toBeGreaterThan(0);

        const owningCharacter = rawCharacters.find((c) => c.id === characterId);
        expect(owningCharacter).toBeTruthy();
    });
});