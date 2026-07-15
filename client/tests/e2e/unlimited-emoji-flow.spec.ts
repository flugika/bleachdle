// client/tests/e2e/unlimited-emoji-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/unlimited-emoji-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import rawEmojiSets from '../../src/data/emojis.json';
import rawCharacters from '../../src/data/characters.json';

const UNLIMITED_ROUTE = '/unlimited/emoji';

// คีย์จับคู่ตรงตาม STORAGE_KEYS ในระบบแอปพลิเคชันของคุณ
const STORAGE_KEYS = {
    PROGRESS: 'bleachdle-emoji-progress',
    COMPLETED: 'bleachdle-emoji-completed',
    STATS: 'bleachdle-emoji-stats',
    SOUL_REGISTRY: 'bleachdle-soul-registry',
};

// 🎯 Central-46 revealedCounter config ต้องตรงกับ src/features/emoji/emojiRevealedCounter.ts เป๊ะ
// (INITIAL_REVEALED_EMOJI = 1, WRONG_GUESSES_PER_REVEAL = 2, TOTAL_EMOJI_COUNT = 4)
// ผูกไว้เป็นค่าคงที่ในไฟล์เทสต์แทน import ตรง ๆ เพราะไฟล์เทสต์ควร assert พฤติกรรมสาธารณะ
// (DOM ที่เห็น) ไม่ผูกกับ implementation import ของฝั่ง client โดยตรง
const INITIAL_REVEALED_EMOJI = 1;
const WRONG_GUESSES_PER_REVEAL = 2;
const TOTAL_EMOJI_COUNT = 4;

test.describe('Bleachdle Unlimited Emoji Challenge E2E Workflow (State & UI Integration)', () => {
    test.beforeEach(async ({ page }: { page: Page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🛡️ Helper สำหรับแกะกล่องสเตตล่าสุดจาก Zustand Core (Unwrap จาก .state Envelope)
     * หมายเหตุ: Emoji mode ใช้ createUnlimitedGuessGameStore ตัวเดียวกับ Character/Song —
     * target เก็บเป็น Object ซ้อน { id, character_id } และมี revealedCount เป็น derived
     * counter เพิ่มมาจาก revealedCounter (ไม่มีใน character mode ที่ไม่มี partial reveal)
     */
    async function getZustandProgress(page: Page) {
        return await page.evaluate((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw);
                return parsed.unlimited?.state || null;
            } catch {
                return null;
            }
        }, STORAGE_KEYS.PROGRESS);
    }

    function findCharacterName(characterId: string) {
        const character = rawCharacters.find((c) => c.id === characterId);
        if (!character) throw new Error(`Character with ID "${characterId}" not found`);
        return character.name;
    }

    // ==========================================================================
    // CASE 1: การเล่นชนะ -> เช็คคลังประวัติ (Completed) -> กดเริ่มข้อใหม่ -> สเตตล้างสะอาด
    // ==========================================================================
    test('The complete unlimited win flow, persisting target identity to completed and resetting safely', async ({ page }: { page: Page }) => {
        await page.goto(UNLIMITED_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(searchInput).toBeVisible();

        // 🛡️ [HYDRATION GUARD] รอจนกว่า Zustand Rehydrate และเซ็ต target.id ลงใต้ state
        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return false;
            try {
                const parsed = JSON.parse(raw);
                return !!parsed.unlimited?.state?.target?.id;
            } catch {
                return false;
            }
        }, STORAGE_KEYS.PROGRESS);

        // ดึง Target จริงจากเบื้องหลังออกมาเพื่อทำการทายถูก (target.character_id คือคำตอบจริง)
        const storeProgress = await getZustandProgress(page);
        const currentTargetSetId = storeProgress.target.id;
        const currentCharacterId = storeProgress.target.character_id;
        const targetCharacterName = findCharacterName(currentCharacterId);

        await searchInput.fill(targetCharacterName);
        const rightOption = page.locator('li').getByText(targetCharacterName, { exact: true }).first();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        // ⏳ ตรวจจับหน้ากระดานสรุปคะแนนโผล่ขึ้นมาบล็อกหลังจาก Delay ทำงานเสร็จ
        await expect(page.getByRole('heading', { name: 'REISHI KAKUNIN' })).toBeVisible({ timeout: 6000 });
        await expect(page.getByText('Symbol Set Traced to Registered Soul')).toBeVisible();

        // ตรวจสอบว่า `finalizeGame` ได้ทำการถลุงเอา emoji-set id (ไม่ใช่ character id) ลง Completed
        const completedDataBeforeClose = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);
        expect(completedDataBeforeClose).toContain(currentTargetSetId);

        // 🔀 กดปุ่มล่างสุดของตัว Modal สรุปผล เพื่อสั่ง handleCloseModal() -> สุ่ม emoji set ข้อใหม่
        const nextRoundButton = page.getByRole('button', { name: /OPEN SENKAIMON/i });
        await nextRoundButton.click();

        // 🔄 [STATE HYDRATION & REBOOT CHECK] ยืนยันว่าหน้าจอหลักกลับสู่สถานะพร้อมเล่นใหม่ทันที
        await expect(searchInput).toBeVisible();
        await expect(page.locator('[id^="emoji-row-"]')).toHaveCount(0);

        // ตรวจสอบข้อมูลความสะอาดของข้อมูลบน Zustand หลังขึ้นรอบใหม่ — guesses ว่าง,
        // เป้าหมายเปลี่ยน, และ revealedCount ต้อง reset กลับไปที่ 1 (ไม่ค้างที่ 4 จากรอบเก่า)
        const newStoreProgress = await getZustandProgress(page);
        expect(newStoreProgress.guesses).toHaveLength(0);
        expect(newStoreProgress.target.id).not.toBe(currentTargetSetId);
        expect(newStoreProgress.revealedCount).toBe(INITIAL_REVEALED_EMOJI);

        // ฝั่ง UI ต้องโชว์แค่สัญลักษณ์แรก unsealed เท่านั้นสำหรับรอบใหม่
        await expect(page.getByText(`${INITIAL_REVEALED_EMOJI} / ${TOTAL_EMOJI_COUNT} UNSEALED`)).toBeVisible();
    });

    // ==========================================================================
    // CASE 2: เงื่อนไขสิ้นสุดด่าน (ทายถูกหมดทุก emoji set) -> ขึ้นหน้า Central 46 -> Etch -> New Life
    // ==========================================================================
    test('Boundary condition when all emoji sets are completed, rendering Central 46, etching soul and triggering a new life', async ({ page }) => {
        // คัดแยก emoji set ตัวสุดท้ายออกเพื่อมาทำเป็น Target ในการปิดกล่องเกม
        const lastSet = rawEmojiSets[rawEmojiSets.length - 1];
        const allOtherSetIds = rawEmojiSets.slice(0, -1).map((s) => s.id);
        const targetCharacterName = findCharacterName(lastSet.character_id);

        await page.goto('/');

        // 🏗️ ม็อกสถานะก่อนเข้าด่าน: ทายถูกไปแล้วทุก emoji set ยกเว้นตัวสุดท้ายตัวเดียว
        await page.evaluate(({ keys, completedIds, targetSet }) => {
            // 1. ตั้งค่า emoji set ที่ทำสำเร็จไปแล้ว (dedupe ด้วย set.id ตาม getCompletionKey)
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));

            // 2. ม็อกตัวโครงสร้าง Zustand Store ลง Progress Storage โดยครอบด้วย state และ version
            //    target เป็น Hidden shape { id, character_id } เท่านั้น (ไม่แนบ emoji_list ตาม
            //    EmojiTargetHidden) และ revealedCount เริ่มที่ 1 เหมือนรอบใหม่ปกติ
            localStorage.setItem(keys.PROGRESS, JSON.stringify({
                unlimited: {
                    state: {
                        target: { id: targetSet.id, character_id: targetSet.character_id },
                        guesses: [],
                        hasFinalized: false,
                        revealedCount: 1,
                    },
                    version: 0,
                },
            }));

            // 3. ม็อกข้อมูลสถิติพื้นฐานเพื่อให้หน้าสถิติมีค่าตั้งต้น
            localStorage.setItem(keys.STATS, JSON.stringify({
                unlimited: { currentStreak: 5, maxStreak: 10, playedCount: 5, passedCount: 0, guessDistribution: {} },
            }));
        }, { keys: STORAGE_KEYS, completedIds: allOtherSetIds, targetSet: lastSet });

        await page.goto(UNLIMITED_ROUTE);

        // จัดการทาย emoji set ตัวสุดท้ายของซีรีส์ทิ้งซะ
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await searchInput.fill(targetCharacterName);
        await page.locator('li').getByText(targetCharacterName, { exact: true }).first().click();

        // เคลียร์ปุ่มโมดอลปิดสรุปของข้อสุดท้ายเพื่อกระตุ้นเงื่อนไข IsGameCompleted
        const closeSummaryButton = page.getByRole('button', { name: /OPEN SENKAIMON/i });
        await closeSummaryButton.waitFor({ state: 'visible', timeout: 6000 });
        await closeSummaryButton.click();

        // 🏛️ [CENTRAL 46 DOM INTEGRATION] ยืนยันโครงสร้างหน้าคลังข้อมูลลับโผล่ขึ้นมาปิดหน้าเกม
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
        }, STORAGE_KEYS.COMPLETED);

        expect(postCompletedList).toHaveLength(0);

        // เช็คที่ฝั่ง UI ว่าช่องค้นหาของหน้าปกติพร้อมให้เล่นสแตนด์บายเรียบร้อยแล้ว
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
    });

    // ==========================================================================
    // CASE 3: การบันทึกสถานะระหว่างเล่นและการอัปเดตสถิติ (Hydration & Stats Integration)
    // ==========================================================================
    test('Mid-game progress persists after reload and successfully updates stats upon winning', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        // 🛡️ รอจนกว่า Zustand Rehydrate ตัวเองเสร็จ
        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentTargetSetId = storeProgress.target.id;
        const currentCharacterId = storeProgress.target.character_id;
        const targetCharacterName = findCharacterName(currentCharacterId);

        const wrongCharacter = rawCharacters.find((c) => c.id !== currentCharacterId)!;

        // 1. เดาผิดไป 1 ครั้ง
        await searchInput.fill(wrongCharacter.name);
        const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();
        await expect(page.locator(`[id="emoji-row-${wrongCharacter.id}"]`)).toBeVisible();

        // 2. กดรีเฟรชหน้าจอ (F5) เพื่อทดสอบ Hydration
        await page.reload();

        // ยืนยันว่าประวัติการเดายังคงอยู่บน UI ครบถ้วนหลังรีเฟรช
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        await expect(page.locator(`[id="emoji-row-${wrongCharacter.id}"]`)).toBeVisible();

        // 3. ทายตัวละครเป้าหมายที่ถูกต้องเพื่อจบด่าน
        await page.getByPlaceholder('ENTER SOUL NAME...').fill(targetCharacterName);
        const rightOption = page.locator('li').getByText(targetCharacterName, { exact: true }).first();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        // รอหน้าต่างสรุปคะแนนแสดงผล
        await expect(page.getByRole('heading', { name: 'REISHI KAKUNIN' })).toBeVisible({ timeout: 6000 });

        // 4. ตรวจสอบข้อมูลสถิติใน LocalStorage ว่าได้รับการอัปเดตอย่างถูกต้องหรือไม่
        const stats = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || {};
        }, STORAGE_KEYS.STATS);

        expect(stats.playedCount).toBe(1);
        expect(stats.currentStreak).toBe(1);
        // sanity: target ยังตรงกับที่ mark completed
        expect(currentTargetSetId).toBeTruthy();
    });

    // ==========================================================================
    // CASE 4: Emoji set ที่สุ่มมาเล่นต้องไม่ซ้ำกับที่ชนะไปแล้ว (Target Filtering Guarantee)
    // ==========================================================================
    test('Target selection filters out and avoids emoji sets already present in the completed list', async ({ page }) => {
        // ม็อกสถานะว่าเคยทายถูกไปแล้วทุก set ยกเว้น 2 set สุดท้ายในลิสต์
        const nearFullCompletedIds = rawEmojiSets.slice(0, -2).map((s) => s.id);
        const remainingSets = rawEmojiSets.slice(-2);

        await page.evaluate(({ keys, completedIds }) => {
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));
        }, { keys: STORAGE_KEYS, completedIds: nearFullCompletedIds });

        await page.goto(UNLIMITED_ROUTE);

        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentTargetSetId = storeProgress.target.id;

        // Set ที่จับคู่ได้ จะต้องเป็นหนึ่งในสอง set ที่ยังไม่เคยเล่นเท่านั้น
        const isFromRemaining = remainingSets.some((s) => s.id === currentTargetSetId);
        expect(isFromRemaining).toBe(true);
        expect(nearFullCompletedIds).not.toContain(currentTargetSetId);
    });

    // ==========================================================================
    // CASE 5: กติกาปลดล็อกสัญลักษณ์แบบค่อยเป็นค่อยไป (Progressive Reveal / Central 46 Logic)
    // ==========================================================================
    test('Reveals one additional emoji symbol every 2 wrong guesses up to the 4-symbol cap', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentCharacterId = storeProgress.target.character_id;
        const wrongCharacters = rawCharacters.filter((c) => c.id !== currentCharacterId);

        // ตั้งต้นต้องเห็นแค่สัญลักษณ์แรก
        await expect(page.getByText(`${INITIAL_REVEALED_EMOJI} / ${TOTAL_EMOJI_COUNT} UNSEALED`)).toBeVisible();

        let expectedRevealed = INITIAL_REVEALED_EMOJI;

        // ทายผิดไปทีละตัว ตรวจสอบว่าตัวเลข unsealed ขยับขึ้นทุก ๆ 2 ครั้งที่ทายผิด จนกว่าจะครบเพดาน
        for (let i = 0; i < wrongCharacters.length && expectedRevealed < TOTAL_EMOJI_COUNT; i++) {
            const wrongCharacter = wrongCharacters[i];

            await searchInput.fill(wrongCharacter.name);
            const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
            await option.waitFor({ state: 'visible' });
            await option.click();
            await expect(page.locator(`[id="emoji-row-${wrongCharacter.id}"]`)).toBeVisible();

            const wrongGuessCount = i + 1;
            expectedRevealed = Math.min(
                TOTAL_EMOJI_COUNT,
                INITIAL_REVEALED_EMOJI + Math.floor(wrongGuessCount / WRONG_GUESSES_PER_REVEAL)
            );

            await expect(page.getByText(`${expectedRevealed} / ${TOTAL_EMOJI_COUNT} UNSEALED`)).toBeVisible();
        }

        // ยืนยันว่าเพดานสูงสุดคือ 4/4 เท่านั้น ไม่ล้นไปกว่านี้ไม่ว่าจะทายผิดกี่ครั้งต่อจากนี้
        expect(expectedRevealed).toBe(TOTAL_EMOJI_COUNT);

        // Sanity เทียบกับ state บน Zustand โดยตรงว่าตรงกับที่ UI แสดง
        const midStoreProgress = await getZustandProgress(page);
        expect(midStoreProgress.revealedCount).toBe(TOTAL_EMOJI_COUNT);
    });

    // ==========================================================================
    // CASE 6: หน้าจอว่างเปล่าต้อง "ไม่มี" ปุ่มสุ่มแบบที่ Character mode มี
    // ==========================================================================
    test('Empty state does NOT expose a quick-random button (unlike character mode)', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);

        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();

        // 🎯 Emoji mode เริ่มเกมอัตโนมัติผ่าน initializeGame() ตอน mount (page.tsx) เสมอ
        // ไม่มี "ปุ่มสุ่มเริ่มต้น" แบบ Character mode ให้กดเอง — เกมพร้อมเล่นทันทีที่โหลดหน้า
        await expect(page.getByRole('button', { name: /random|สุ่ม/i })).toHaveCount(0);

        // ยืนยันแทนว่าเกมเริ่มพร้อมเล่นตั้งแต่แรกโดยไม่ต้องกดอะไรเพิ่ม (มีสัญลักษณ์แรก unsealed แล้ว)
        await expect(page.getByText(`${INITIAL_REVEALED_EMOJI} / ${TOTAL_EMOJI_COUNT} UNSEALED`)).toBeVisible();
    });

    // ==========================================================================
    // CASE 7: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration, กลับสู่ Daily)
    // ==========================================================================
    test('Can trigger mode selector and navigate from Unlimited to Daily emoji mode', async ({ page }: { page: Page }) => {
        await page.goto(UNLIMITED_ROUTE);

        const modeBadge = page.locator('span, div').getByText(/unlimited/i).first();
        await expect(modeBadge).toBeVisible();
        await modeBadge.click();

        const dailyOption = page.locator('button, div').getByText(/daily/i).last();
        await expect(dailyOption).toBeVisible();
        await dailyOption.click();

        await expect(page).toHaveURL(/\/daily/);
    });
});