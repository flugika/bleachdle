// client/tests/e2e/unlimited-character-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/unlimited-character-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import rawCharacters from '../../src/data/characters.json';

const UNLIMITED_ROUTE = '/unlimited/character';

// คีย์จับคู่ตรงตาม STORAGE_KEYS ในระบบแอปพลิเคชันของคุณ
const STORAGE_KEYS = {
    PROGRESS: 'bleachdle-character-progress',  // ชื่อที่ดึงมาจาก nestedJSONStorage
    COMPLETED: 'bleachdle-character-completed',
    STATS: 'bleachdle-character-stats',
    SOUL_REGISTRY: 'bleachdle-soul-registry'
};

test.describe('Bleachdle Unlimited Character Challenge E2E Workflow (State & UI Integration)', () => {

    test.beforeEach(async ({ page }: { page: Page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🛡️ Helper สำหรับแกะกล่องสเตตล่าสุดจาก Zustand Core (Unwrap จาก .state Envelope)
     */
    async function getZustandProgress(page: Page) {
        return await page.evaluate((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw);
                // Zustand persist structure เก็บข้อมูลจริงไว้ใต้ key -> state
                return parsed.unlimited?.state || null;
            } catch {
                return null;
            }
        }, STORAGE_KEYS.PROGRESS);
    }

    // ==========================================================================
    // CASE 1: การเล่นชนะ -> เช็คคลังประวัติ (Completed) -> กดเริ่มข้อใหม่ -> สเตตล้างสะอาด
    // ==========================================================================
    test('The complete unlimited win flow, persisting target identity to completed and resetting safely', async ({ page }: { page: Page }) => {
        await page.goto(UNLIMITED_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(searchInput).toBeVisible();

        // 🛡️ [HYDRATION GUARD] รอจนกว่า Zustand Rehydrate และเซ็ต targetId ลงใต้ state
        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return false;
            try {
                const parsed = JSON.parse(raw);
                // เช็คลึกเข้าไปถึง state.targetId ตามแบบแผนของ Zustand Persist
                return !!parsed.unlimited?.state?.targetId;
            } catch {
                return false;
            }
        }, STORAGE_KEYS.PROGRESS);

        // ดึง Target จริงจากเบื้องหลังออกมาเพื่อทำการทายถูก
        const storeProgress = await getZustandProgress(page);
        const currentTargetId = storeProgress.targetId;
        const targetCharacter = rawCharacters.find(c => c.id === currentTargetId)!;

        // ดำเนินการพิมพ์คำตอบเพื่อจบเกมแบบผู้ชนะ
        await searchInput.fill(targetCharacter.name);
        const rightOption = page.locator('div, [role="option"]').getByText(targetCharacter.name, { exact: true }).last();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        // ⏳ ตรวจจับหน้ากระดานสรุปคะแนน (CharacterSummaryGuess) โผล่ขึ้นมาบล็อกหลังจาก Delay ทำงานเสร็จ
        // ใช้ getByRole เจาะจงไปที่ Heading หลักเพื่อป้องกันการชนกันเองใน Strict Mode
        await expect(page.getByRole('heading', { name: 'REISHI KAKUNIN' })).toBeVisible({ timeout: 6000 });

        // ตรวจสอบว่า `finalizeGame` ได้ทำการถลุงเอา ID ลงหน่วยความจำ Completed จริงหรือไม่
        // (Note: completedData ไม่ได้ใช้ Zustand persist บันทึกดิบๆ จึงไม่ต้อง unwrap .state)
        const completedDataBeforeClose = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);
        expect(completedDataBeforeClose).toContain(currentTargetId);

        // 🔀 กดปุ่มล่างสุดของตัว Modal สรุปผล เพื่อสั่ง handleCloseModal() -> สุ่มตัวละครข้อใหม่
        const nextRoundButton = page.getByRole('button', { name: /OPEN SENKAIMON/i });
        await nextRoundButton.click();

        // 🔄 [STATE HYDRATION & REBOOT CHECK] ยืนยันว่าหน้าจอหลักกลับสู่สถานะพร้อมเล่นใหม่ทันที
        await expect(searchInput).toBeVisible();
        await expect(page.locator('[id^="row-"]')).toHaveCount(0); // ตารางประวัติต้องเหลือ 0 แถว
        await expect(page.getByRole('button', { name: /random|สุ่ม/i })).toBeVisible(); // ปุ่มสุ่มตัวละครเริ่มต้นต้องกลับมา

        // ตรวจสอบข้อมูลความสะอาดของข้อมูลบน Zustand หลังขึ้นรอบใหม่
        const newStoreProgress = await getZustandProgress(page);
        expect(newStoreProgress.guesses).toHaveLength(0); // ประวัติการเดาใน store รอบใหม่ต้องเป็นศูนย์
        expect(newStoreProgress.targetId).not.toBe(currentTargetId); // ตัวละครเป้าหมายตัวใหม่ต้องถูกสลับแล้ว
    });

    // ==========================================================================
    // CASE 2: เงื่อนไขสิ้นสุดด่าน (ทายถูกหมดทุกตัว) -> ขึ้นหน้า Central 46 -> Etch -> New Life
    // ==========================================================================
    test('Boundary condition when all characters are completed, rendering Central 46, etching soul and triggering a new life', async ({ page }: { page: Page }) => {
        // คัดแยกตัวละครตัวสุดท้ายออกเพื่อมาทำเป็น Target ในการปิดกล่องเกม
        const lastCharacter = rawCharacters[rawCharacters.length - 1];
        const allOtherCharacterIds = rawCharacters.slice(0, -1).map(c => c.id);

        await page.goto('/');

        // 🏗️ ม็อกสถานะก่อนเข้าด่าน: ทายถูกไปแล้วทุกตัวละคร ยกเว้นตัวสุดท้ายตัวเดียว
        await page.evaluate(({ keys, completedIds, targetChar }) => {
            // 1. ตั้งค่าตัวละครที่ทำสำเร็จไปแล้ว
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));

            // 2. ม็อกตัวโครงสร้าง Zustand Store ลง Progress Storage โดยครอบด้วย state และ version ให้ตรงไวยากรณ์จริง
            localStorage.setItem(keys.PROGRESS, JSON.stringify({
                unlimited: {
                    state: {
                        targetId: targetChar.id,
                        guesses: [],
                        hasFinalized: false
                    },
                    version: 0
                }
            }));

            // 3. ม็อกข้อมูลสถิติพื้นฐานเพื่อให้หน้าสถิติมีค่าตั้งต้น
            localStorage.setItem(keys.STATS, JSON.stringify({
                unlimited: { currentStreak: 5, maxStreak: 10, playedCount: 5, passedCount: 0, guessDistribution: {} }
            }));
        }, { keys: STORAGE_KEYS, completedIds: allOtherCharacterIds, targetChar: lastCharacter });

        await page.goto(UNLIMITED_ROUTE);

        // จัดการทายตัวละครตัวสุดท้ายของซีรีส์ทิ้งซะ
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await searchInput.fill(lastCharacter.name);
        await page.locator('div, [role="option"]').getByText(lastCharacter.name, { exact: true }).last().click();

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
        const newLifeButton = page.getByRole('button', { name: /NEW CYCLE, NEW LIFE|新周/i });
        await newLifeButton.waitFor({ state: 'visible' });
        await newLifeButton.click();

        // 🧠 [DATA INTEGRITY RESET VERIFICATION] 
        // ตรวจสอบว่าคลังประวัติโดนเคลียร์เป็นอาร์เรย์ว่างเปล่า และระบบพากลับมาหน้าเกมแรกสุด
        const postCompletedList = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);

        expect(postCompletedList).toHaveLength(0); // ล้างประวัติการทายถูกเกลี้ยงแล้ว

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
            return !!JSON.parse(raw || '{}').unlimited?.state?.targetId;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentTargetId = storeProgress.targetId;
        const targetCharacter = rawCharacters.find(c => c.id === currentTargetId)!;
        const wrongCharacter = rawCharacters.find(c => c.id !== currentTargetId)!;

        // 1. เดาผิดไป 1 ตัว
        await searchInput.fill(wrongCharacter.name);
        const option = page.locator('div, [role="option"]').getByText(wrongCharacter.name, { exact: true }).last();
        await option.waitFor({ state: 'visible' });
        await option.click();
        await expect(page.locator(`[id="row-${wrongCharacter.id}"]`)).toBeVisible();

        // 2. กดรีเฟรชหน้าจอ (F5) เพื่อทดสอบ Hydration
        await page.reload();

        // ยืนยันว่าประวัติการเดายังคงอยู่บน UI ครบถ้วนหลังรีเฟรช
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        await expect(page.locator(`[id="row-${wrongCharacter.id}"]`)).toBeVisible();

        // 3. ทายตัวละครเป้าหมายที่ถูกต้องเพื่อจบด่าน
        await page.getByPlaceholder('ENTER SOUL NAME...').fill(targetCharacter.name);
        const rightOption = page.locator('div, [role="option"]').getByText(targetCharacter.name, { exact: true }).last();
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
    });

    // ==========================================================================
    // CASE 4: ตัวละครที่สุ่มมาเล่นต้องไม่ซ้ำกับตัวที่ชนะไปแล้ว (Target Filtering Guarantee)
    // ==========================================================================
    test('Target selection filters out and avoids characters already present in the completed list', async ({ page }) => {
        // ม็อกสถานะว่าเคยทายถูกไปแล้วทุกตัว ยกเว้น 2 ตัวละครสุดท้ายในลิสต์
        const nearFullCompletedIds = rawCharacters.slice(0, -2).map(c => c.id);
        const remainingCharacters = rawCharacters.slice(-2); // 2 ตัวที่เหลือที่ยังไม่ได้เล่น

        await page.evaluate(({ keys, completedIds }) => {
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));
        }, { keys: STORAGE_KEYS, completedIds: nearFullCompletedIds });

        // โหลดเข้าสู่เกม
        await page.goto(UNLIMITED_ROUTE);

        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.targetId;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentTargetId = storeProgress.targetId;

        // ตัวละครที่จับคู่ได้ จะต้องเป็นหนึ่งในสองตัวละครที่ยังไม่เคยเล่นเท่านั้น
        const isFromRemaining = remainingCharacters.some(c => c.id === currentTargetId);
        expect(isFromRemaining).toBe(true);
        expect(nearFullCompletedIds).not.toContain(currentTargetId);
    });

    // ==========================================================================
    // CASE 5: ปุ่มสุ่มในหน้าจอว่างเปล่า (Empty State Quick Random Button)
    // ==========================================================================
    test('Clicking random button in empty state inserts a valid initial guess row', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);

        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        await expect(page.locator('[id^="row-"]')).toHaveCount(0);

        // ดักจับและคลิกปุ่มสุ่มตัวเริ่มต้น
        const randomButton = page.getByRole('button', { name: /random|สุ่ม/i });
        await expect(randomButton).toBeVisible();
        await randomButton.click();

        // หน้าจอจะต้องสร้างแถวการเดาขึ้นมา 1 แถวทันที
        await expect(page.locator('[id^="row-"]')).toHaveCount(1);
    });
});