// client/tests/e2e/unlimited-release-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/unlimited-release-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import rawReleases from '../../src/data/releases.json';

const UNLIMITED_ROUTE = '/unlimited/release';

// 🛡️ Enterprise Storage Keys Mapping (ตรงตามระบบ Core Config ของระบบ)
const STORAGE_KEYS = {
    PROGRESS: 'bleachdle-release-progress',
    COMPLETED: 'bleachdle-release-completed',
    STATS: 'bleachdle-release-stats',
    SOUL_REGISTRY: 'bleachdle-soul-registry',
};

test.describe('Bleachdle Unlimited Release Challenge E2E Workflow (Enterprise Verification)', () => {
    test.beforeEach(async ({ page }: { page: Page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🧠 Helper สำหรับถอดรหัส (Unwrap) ข้อมูล State ล่าสุดจาก Zustand Store
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

    /**
     * 🔍 ค้นหาคำเรียกขาน/ชื่อท่าเทคนิค (technique_name) ของ Release นั้น ๆ
     */
    function findReleaseTechnique(releaseId: string) {
        const release = rawReleases.find((r) => r.id === releaseId);
        if (!release) throw new Error(`Release with ID "${releaseId}" not found`);
        return release.technique_name;
    }

    // ==========================================================================
    // CASE 1: การเล่นปกติจนชนะ -> บันทึก Release ID ลงคลังสำเร็จ -> ขึ้นรอบใหม่ได้อย่างหมดจด
    // ==========================================================================
    test('The complete unlimited win flow, persisting target release ID to completed and resetting safely', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);

        // 🛡️ [HYDRATION GUARD] รอจนกระทั่ง Zustand ทำการ Hydration เรียบร้อยและมี target พร้อม
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

        // ดึง Target ปัจจุบันจากเบื้องหลังออกมาเพื่อทำคำตอบที่ถูกต้อง
        const storeProgress = await getZustandProgress(page);
        const currentTargetReleaseId = storeProgress.target.id;
        const targetTechniqueName = findReleaseTechnique(currentTargetReleaseId);

        // ป้อนคำทายที่ถูกต้อง (สืบค้นด้วย Technique Name)
        const searchInput = page.getByPlaceholder(/ENTER TECHNIQUE|ENTER SOUL|SEARCH/i).first();
        await expect(searchInput).toBeVisible();
        await searchInput.fill(targetTechniqueName);

        const correctOption = page.locator('li').getByText(targetTechniqueName, { exact: false }).first();
        await correctOption.waitFor({ state: 'visible' });
        await correctOption.click();

        // ⏳ ตรวจจับ Summary Modal ปรากฏขึ้นหลังอนิเมชั่นดีเลย์ทำงานเสร็จสิ้น
        await expect(page.getByRole('heading', { name: 'REISHI KAKUNIN' })).toBeVisible({ timeout: 6000 });
        await expect(page.getByText('Release Traced to Registered Technique', { exact: false }).first()).toBeVisible();

        // ยืนยันว่าระบบได้นำ "Release ID" (ไม่ใช่ Character ID) ไปใส่ลงคลัง Completed
        const completedDataBeforeClose = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);
        expect(completedDataBeforeClose).toContain(currentTargetReleaseId);

        // 🔀 กดปิดหน้าจอสรุปผลเพื่อเปิด Senkaimon เข้าสู่รอบถัดไป
        const nextRoundButton = page.getByRole('button', { name: /OPEN SENKAIMON/i });
        await nextRoundButton.click();

        // 🔄 ยืนยันว่าหน้าจอหลักกลับสู่สภาวะพร้อมเล่น (กระดานทายต้องว่างเปล่า)
        await expect(searchInput).toBeVisible();
        await expect(page.locator('[id^="release-row-"]')).toHaveCount(0);

        // ตรวจสอบ Zustand หลัง Refresh รอบใหม่: guesses ต้องเคลียร์ และได้เป้าหมายใหม่ที่ไม่ซ้ำเดิม
        const newStoreProgress = await getZustandProgress(page);
        expect(newStoreProgress.guesses).toHaveLength(0);
        expect(newStoreProgress.target.id).not.toBe(currentTargetReleaseId);
    });

    // ==========================================================================
    // CASE 2: เงื่อนไขเมื่อเล่นครบหมดทุก Release -> เข้าสู่ Central 46 -> บันทึกประวัติวิญญาณ -> เริ่มวัฏจักรใหม่
    // ==========================================================================
    test('Boundary condition when all releases are completed, rendering Central 46, etching soul and triggering a new life', async ({ page }) => {
        // ดึง Release ตัวสุดท้ายมาเป็นตัวปิดเกม
        const lastRelease = rawReleases[rawReleases.length - 1];
        const allOtherReleaseIds = rawReleases.slice(0, -1).map((r) => r.id);
        const targetTechniqueName = lastRelease.technique_name;

        await page.goto('/');

        // 🏗️ ม็อกสถานะ: ผ่านด่านไปหมดแล้วทุกอัน ยกเว้นอันสุดท้ายตัวเดียว
        await page.evaluate(({ keys, completedIds, lastSet }) => {
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));

            localStorage.setItem(keys.PROGRESS, JSON.stringify({
                unlimited: {
                    state: {
                        target: { 
                            id: lastSet.id, 
                            release_type: lastSet.release_type, 
                            character_id: lastSet.character_id, 
                            clip_end_ms: lastSet.clip_end_ms 
                        },
                        guesses: [],
                        hasFinalized: false,
                    },
                    version: 0,
                },
            }));

            localStorage.setItem(keys.STATS, JSON.stringify({
                unlimited: { currentStreak: 15, maxStreak: 30, playedCount: 15, passedCount: 0, guessDistribution: {} },
            }));
        }, { keys: STORAGE_KEYS, completedIds: allOtherReleaseIds, lastSet: lastRelease });

        await page.goto(UNLIMITED_ROUTE);

        // ทายคำตอบข้อสุดท้ายให้ถูกต้อง
        const searchInput = page.getByPlaceholder(/ENTER TECHNIQUE|ENTER SOUL|SEARCH/i).first();
        await searchInput.fill(targetTechniqueName);
        await page.locator('li').getByText(targetTechniqueName, { exact: false }).first().click();

        // กดปิด Senkaimon เพื่อกระตุ้นให้ระบบประมวลผลการเคลียร์ด่านสมบูรณ์
        const closeSummaryButton = page.getByRole('button', { name: /OPEN SENKAIMON/i });
        await closeSummaryButton.waitFor({ state: 'visible', timeout: 6000 });
        await closeSummaryButton.click();

        // 🏛️ [CENTRAL 46 INTEGRATION] ต้องขึ้นหน้าจอยื่นประวัติผู้พิทักษ์วิญญาณ
        await expect(page.getByText('CENTRAL 46', { exact: false }).first()).toBeVisible({ timeout: 6000 });
        await expect(page.getByText('IDENTITY REGISTRATION REQUIRED')).toBeVisible();

        // ทำการบันทึกนาม Soul Name
        const nameInput = page.getByPlaceholder('ENTER YOUR SOUL NAME');
        await expect(nameInput).toBeVisible();
        await nameInput.fill('Kurosaki Ichigo');

        const etchButton = page.getByRole('button', { name: /ETCH SOUL NAME|刻/i });
        await etchButton.click();

        // ตรวจสอบผลการขึ้นบัญชี (Dossier ต้องโชว์ชื่อผู้เล่นเป็นตัวใหญ่)
        await expect(page.getByText('KUROSAKI ICHIGO')).toBeVisible();

        // ⚡ ดำเนินพิธีกรรม "NEW CYCLE, NEW LIFE" เพื่อเริ่มเล่นใหม่ทั้งหมด
        const newLifeButton = page.getByRole('button', { name: /NEW CYCLE, NEW LIFE|新周/i });
        await newLifeButton.waitFor({ state: 'visible' });
        await newLifeButton.click();

        // 🧠 ข้อมูล Completed ของคลัง Release ใน LocalStorage ต้องถูกเคลียร์กลายเป็น array เปล่า
        const postCompletedList = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);
        expect(postCompletedList).toHaveLength(0);

        // ฝั่ง UI ต้องกลับสู่สนามทายตามปกติ
        await expect(page.getByPlaceholder(/ENTER TECHNIQUE|ENTER SOUL|SEARCH/i).first()).toBeVisible();
    });

    // ==========================================================================
    // CASE 3: การบันทึกสถานะกลางครันและการรักษาสถิติ (Hydration & Persistence Verification)
    // ==========================================================================
    test('Mid-game progress persists after reload and successfully updates stats upon winning', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);

        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentTargetReleaseId = storeProgress.target.id;
        const targetTechniqueName = findReleaseTechnique(currentTargetReleaseId);

        // ดึง Release ที่ไม่ถูกต้องมา 1 ท่าเพื่อทำการลองทายผิด
        const wrongRelease = rawReleases.find((r) => r.id !== currentTargetReleaseId)!;

        // 1. ลองเดาผิด 1 รอบ
        const searchInput = page.getByPlaceholder(/ENTER TECHNIQUE|ENTER SOUL|SEARCH/i).first();
        await searchInput.fill(wrongRelease.technique_name);
        const option = page.locator('li').getByText(wrongRelease.technique_name, { exact: false }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // ตรวจสอบว่ามีแถวประวัติแสดงผลใน DOM แล้ว
        await expect(page.locator(`[id="release-row-${wrongRelease.id}"]`)).toBeVisible();

        // 2. จำลองเครือข่ายขัดข้อง หรือผู้ใช้กด F5 (Refresh)
        await page.reload();

        // แถวที่เคยเดาผิดไว้ตอนก่อนรีเฟรช ต้องได้รับการดึงกลับมาวาดใหม่ครบถ้วน (Hydrated)
        await expect(page.locator(`[id="release-row-${wrongRelease.id}"]`)).toBeVisible();

        // 3. ปิดฉากด้วยการทายคำตอบที่ถูกต้อง
        const searchInputPostReload = page.getByPlaceholder(/ENTER TECHNIQUE|ENTER SOUL|SEARCH/i).first();
        await searchInputPostReload.fill(targetTechniqueName);
        const rightOption = page.locator('li').getByText(targetTechniqueName, { exact: false }).first();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        await expect(page.getByRole('heading', { name: 'REISHI KAKUNIN' })).toBeVisible({ timeout: 6000 });

        // 4. สถิติต้องขยับอย่างถูกต้องในคลังสถิติ
        const stats = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || {};
        }, STORAGE_KEYS.STATS);

        expect(stats.playedCount).toBe(1);
        expect(stats.currentStreak).toBe(1);
    });

    // ==========================================================================
    // CASE 4: กฎการหลีกเลี่ยงข้อซ้ำ (Target Filtering Guarantee)
    // ==========================================================================
    test('Target selection filters out and avoids releases already present in the completed list', async ({ page }) => {
        // สมมติว่าเก็บสถิติผ่านไปแล้วเกือบหมด เหลือแค่ 2 ด่านสุดท้าย
        const nearFullCompletedIds = rawReleases.slice(0, -2).map((r) => r.id);
        const remainingReleases = rawReleases.slice(-2);

        await page.evaluate(({ keys, completedIds }) => {
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));
        }, { keys: STORAGE_KEYS, completedIds: nearFullCompletedIds });

        await page.goto(UNLIMITED_ROUTE);

        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentTargetReleaseId = storeProgress.target.id;

        // เป้าหมายตัวที่สุ่มขึ้นมาใหม่ต้องเป็นหนึ่งใน 2 ตัวที่เหลืออยู่ และไม่ซ้ำกับประวัติประทับตราแล้ว
        const isFromRemaining = remainingReleases.some((r) => r.id === currentTargetReleaseId);
        expect(isFromRemaining).toBe(true);
        expect(nearFullCompletedIds).not.toContain(currentTargetReleaseId);
    });

    // ==========================================================================
    // CASE 5: ปุ่มสวิตช์มิติ (Dimension Mode Switcher)
    // ==========================================================================
    test('Can trigger mode selector and navigate from Unlimited to Daily release mode', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);

        // คลิกที่ป้ายบอกโหมด "Unlimited" เพื่อเรียกโมดอลสลับโหมด
        const modeBadge = page.locator('span, div').getByText(/unlimited/i).first();
        await expect(modeBadge).toBeVisible();
        await modeBadge.click();

        // เลือกสลับกลับไปเล่นแบบ "Daily"
        const dailyOption = page.locator('button, div').getByText(/daily/i).last();
        await expect(dailyOption).toBeVisible();
        await dailyOption.click();

        // ระบบต้องทำการย้ายหน้าเว็บเปลี่ยน Route ไปที่หน้า Daily
        await expect(page).toHaveURL(/\/daily/);
    });
});