// client/tests/e2e/unlimited-song-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/unlimited-song-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import rawSongs from '../../src/data/songs.json';

const UNLIMITED_ROUTE = '/unlimited/song';

// คีย์จับคู่ตรงตาม STORAGE_KEYS ในระบบแอปพลิเคชันของคุณ
const STORAGE_KEYS = {
    PROGRESS: 'bleachdle-song-progress',
    COMPLETED: 'bleachdle-song-completed',
    STATS: 'bleachdle-song-stats',
    SOUL_REGISTRY: 'bleachdle-soul-registry',
};

test.describe('Bleachdle Unlimited Song Challenge E2E Workflow (State & UI Integration)', () => {
    test.beforeEach(async ({ page }: { page: Page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🛡️ Helper สำหรับแกะกล่องสเตตล่าสุดจาก Zustand Core (Unwrap จาก .state Envelope)
     * หมายเหตุ: Song mode เก็บ target เป็น Object { id } ซ้อนอยู่ใต้ state.target (ต่างจาก character ที่เก็บเป็น targetId แบบแบน)
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

    // ==========================================================================
    // CASE 1: การเล่นชนะ -> เช็คคลังประวัติ (Completed) -> กดเริ่มข้อใหม่ -> สเตตล้างสะอาด
    // ==========================================================================
    test('The complete unlimited win flow, persisting target identity to completed and resetting safely', async ({ page }: { page: Page }) => {
        await page.goto(UNLIMITED_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...');
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

        // ดึง Target จริงจากเบื้องหลังออกมาเพื่อทำการทายถูก
        const storeProgress = await getZustandProgress(page);
        const currentTargetId = storeProgress.target.id;
        const targetSong = rawSongs.find(s => s.id === currentTargetId)!;

        await searchInput.fill(targetSong.title);
        const rightOption = page.locator('li').getByText(targetSong.title, { exact: true }).first();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        // ⏳ ตรวจจับหน้ากระดานสรุปคะแนน โผล่ขึ้นมาบล็อกหลังจาก Delay ทำงานเสร็จ
        await expect(page.getByText('REISHI KAKUNIN')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Track Verified')).toBeVisible();

        // ตรวจสอบว่า `finalizeGame` ได้ทำการถลุงเอา ID ลงหน่วยความจำ Completed จริงหรือไม่
        const completedDataBeforeClose = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);
        expect(completedDataBeforeClose).toContain(currentTargetId);

        // 🔀 กดปุ่มล่างสุดของตัว Modal สรุปผล เพื่อสั่ง handleCloseModal() -> สุ่มเพลงข้อใหม่
        const nextRoundButton = page.getByRole('button', { name: /OPEN SENKAIMON/i });
        await nextRoundButton.click();

        // 🔄 [STATE HYDRATION & REBOOT CHECK] ยืนยันว่าหน้าจอหลักกลับสู่สถานะพร้อมเล่นใหม่ทันที
        await expect(searchInput).toBeVisible();
        await expect(page.locator('[id^="row-"]')).toHaveCount(0);

        // ตรวจสอบข้อมูลความสะอาดของข้อมูลบน Zustand หลังขึ้นรอบใหม่
        const newStoreProgress = await getZustandProgress(page);
        expect(newStoreProgress.guesses).toHaveLength(0);
        expect(newStoreProgress.target.id).not.toBe(currentTargetId);
    });

    // ==========================================================================
    // CASE 2: เงื่อนไขสิ้นสุดด่าน (ทายถูกหมดทุกเพลง) -> ขึ้นหน้า Central 46 -> Etch -> New Life
    // ==========================================================================
    test('Boundary condition when all songs are completed, rendering Central 46, etching soul and triggering a new life', async ({ page }) => {
        // คัดแยกเพลงตัวสุดท้ายออกเพื่อมาทำเป็น Target ในการปิดกล่องเกม
        const lastSong = rawSongs[rawSongs.length - 1];
        const allOtherSongIds = rawSongs.slice(0, -1).map(s => s.id);

        await page.goto('/');

        // 🏗️ ม็อกสถานะก่อนเข้าด่าน: ทายถูกไปแล้วทุกเพลง ยกเว้นเพลงสุดท้ายเพลงเดียว
        await page.evaluate(({ keys, completedIds, targetSong }) => {
            // 1. ตั้งค่าเพลงที่ทำสำเร็จไปแล้ว
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));

            // 2. ม็อกตัวโครงสร้าง Zustand Store ลง Progress Storage โดยครอบด้วย state และ version ให้ตรงไวยากรณ์จริง
            //    (target เป็น Object ซ้อน { id } ตามสคีมาจริงของ song mode)
            localStorage.setItem(keys.PROGRESS, JSON.stringify({
                unlimited: {
                    state: {
                        target: { id: targetSong.id },
                        targetSegmentId: targetSong.id,
                        guesses: [],
                        hasFinalized: false,
                    },
                    version: 0,
                },
            }));

            // 3. ม็อกข้อมูลสถิติพื้นฐานเพื่อให้หน้าสถิติมีค่าตั้งต้น
            localStorage.setItem(keys.STATS, JSON.stringify({
                unlimited: { currentStreak: 5, maxStreak: 10, playedCount: 5, passedCount: 0, guessDistribution: {} },
            }));
        }, { keys: STORAGE_KEYS, completedIds: allOtherSongIds, targetSong: lastSong });

        await page.goto(UNLIMITED_ROUTE);

        // จัดการทายเพลงตัวสุดท้ายของซีรีส์ทิ้งซะ
        const searchInput = page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...');
        await searchInput.fill(lastSong.title);
        await page.locator('li').getByText(lastSong.title, { exact: true }).first().click();

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
        const postCompletedList = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);

        expect(postCompletedList).toHaveLength(0);

        // เช็คที่ฝั่ง UI ว่าช่องค้นหาของหน้าปกติพร้อมให้เล่นสแตนด์บายเรียบร้อยแล้ว
        await expect(page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...')).toBeVisible();
    });

    // ==========================================================================
    // CASE 3: การบันทึกสถานะระหว่างเล่นและการอัปเดตสถิติ (Hydration & Stats Integration)
    // ==========================================================================
    test('Mid-game progress persists after reload and successfully updates stats upon winning', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...');

        // 🛡️ รอจนกว่า Zustand Rehydrate ตัวเองเสร็จ
        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentTargetId = storeProgress.target.id;
        const targetSong = rawSongs.find(s => s.id === currentTargetId)!;
        const wrongSong = rawSongs.find(s => s.id !== currentTargetId)!;

        // 1. เดาผิดไป 1 เพลง
        await searchInput.fill(wrongSong.title);
        const option = page.locator('li').getByText(wrongSong.title, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();
        await expect(page.locator(`[id="row-${wrongSong.id}"]`)).toBeVisible();

        // 2. กดรีเฟรชหน้าจอ (F5) เพื่อทดสอบ Hydration
        await page.reload();

        // ยืนยันว่าประวัติการเดายังคงอยู่บน UI ครบถ้วนหลังรีเฟรช
        await expect(page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...')).toBeVisible();
        await expect(page.locator(`[id="row-${wrongSong.id}"]`)).toBeVisible();

        // 3. ทายเพลงเป้าหมายที่ถูกต้องเพื่อจบด่าน
        await page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...').fill(targetSong.title);
        const rightOption = page.locator('li').getByText(targetSong.title, { exact: true }).first();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        // รอหน้าต่างสรุปคะแนนแสดงผล
        await expect(page.getByText('REISHI KAKUNIN')).toBeVisible({ timeout: 6000 });

        // 4. ตรวจสอบข้อมูลสถิติใน LocalStorage ว่าได้รับการอัปเดตอย่างถูกต้องหรือไม่
        const stats = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || {};
        }, STORAGE_KEYS.STATS);

        expect(stats.playedCount).toBe(1);
        expect(stats.currentStreak).toBe(1);
    });

    // ==========================================================================
    // CASE 4: เพลงที่สุ่มมาเล่นต้องไม่ซ้ำกับเพลงที่ชนะไปแล้ว (Target Filtering Guarantee)
    // ==========================================================================
    test('Target selection filters out and avoids songs already present in the completed list', async ({ page }) => {
        // ม็อกสถานะว่าเคยทายถูกไปแล้วทุกเพลง ยกเว้น 2 เพลงสุดท้ายในลิสต์
        const nearFullCompletedIds = rawSongs.slice(0, -2).map(s => s.id);
        const remainingSongs = rawSongs.slice(-2);

        await page.evaluate(({ keys, completedIds }) => {
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));
        }, { keys: STORAGE_KEYS, completedIds: nearFullCompletedIds });

        await page.goto(UNLIMITED_ROUTE);

        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentTargetId = storeProgress.target.id;

        // เพลงที่จับคู่ได้ จะต้องเป็นหนึ่งในสองเพลงที่ยังไม่เคยเล่นเท่านั้น
        const isFromRemaining = remainingSongs.some(s => s.id === currentTargetId);
        expect(isFromRemaining).toBe(true);
        expect(nearFullCompletedIds).not.toContain(currentTargetId);
    });

    // ==========================================================================
    // CASE 5: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration, กลับสู่ Daily)
    // ==========================================================================
    test('Can trigger mode selector and navigate from Unlimited to Daily mode', async ({ page }: { page: Page }) => {
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