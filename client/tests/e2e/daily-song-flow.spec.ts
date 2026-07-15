// client/tests/e2e/daily-song-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/daily-song-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import rawSongs from '../../src/data/songs.json';

const DAILY_ROUTE = '/daily/song';
const PROGRESS_STORAGE_KEY = 'bleachdle-song-progress'; // ปรับ Key ให้ตรงกับที่ระบบคุณใช้จริง

test.describe('Bleachdle Daily Song Challenge E2E Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    // ==========================================
    // CASE 1: การเดาจนกระทั่งชนะ (Complete Win Flow)
    // ==========================================
    test('Victory Flow: User matches target song on initial submission', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...');
        await expect(searchInput).toBeVisible();

        // รอ Hydration ให้เสร็จแล้วค่อยอ่าน Target
        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.id;
        }, PROGRESS_STORAGE_KEY);

        const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const targetId = progress.daily.state.target.id;
        const targetSong = rawSongs.find(s => s.id === targetId);

        if (!targetSong) throw new Error(`Song with ID "${targetId}" not found`);

        await searchInput.fill(targetSong.title);

        // เลือกช้อยส์จาก SearchBar (ใช้ <li> ตามที่กำหนดใน SongSearchBar.tsx)
        const option = page.locator('li').getByText(targetSong.title, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // ตรวจสอบ UI ชัยชนะ
        await expect(page.getByText('REISHI KAKUNIN')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Track Verified')).toBeVisible();

        await page.reload();

        // ตรวจสอบว่าช่องค้นหาโดนบล็อก และหน้าจอผลลัพธ์แสดงขึ้นมา
        await expect(page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...')).not.toBeVisible();
        await expect(page.getByText('REISHI KAKUNIN')).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 2: การเดาผิดจนหมดสิทธิ์ (Complete Loss Flow)
    // ==========================================
    test('The complete loss-loop by guessing incorrectly until running out of turns', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...');
        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.id;
        }, PROGRESS_STORAGE_KEY);

        const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const targetId = progress.daily.state.target.id;

        // วนลูปทายผิด (เอาเพลงที่ไม่ใช่ target มาทายให้หมดโควต้า)
        const wrongSongs = rawSongs.filter(s => s.id !== targetId).slice(0, 6);

        for (const wrongSong of wrongSongs) {
            const isInputActive = await searchInput.isVisible();
            if (!isInputActive) break;

            await searchInput.fill(wrongSong.title);
            const option = page.locator('li').getByText(wrongSong.title, { exact: true }).first();
            await option.click();

            await expect(page.locator(`[id="row-${wrongSong.id}"]`)).toBeVisible();
        }

        // ตรวจสอบ UI การแพ้ (ถ้ามีข้อความเฉพาะเจาะจง ให้เปลี่ยนตัวอักษรใน getByText)
        // await expect(page.getByText('KONPAKU DANZETSU')).toBeVisible(); 
    });

    // ==========================================
    // CASE 3: ข้อมูลสเตตคงอยู่หลังรีเฟรชหน้าจอ (Hydration & Persistence)
    // ==========================================
    test('State hydration persists a guess across a hard reload', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...');

        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.id;
        }, PROGRESS_STORAGE_KEY);

        const progressBefore = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const targetId = progressBefore.daily.state.target.id;
        const wrongSong = rawSongs.find(s => s.id !== targetId) || rawSongs[0];

        await searchInput.fill(wrongSong.title);
        const option = page.locator('li').getByText(wrongSong.title, { exact: true }).first();
        await option.click();

        await expect(page.locator('[id^="row-"]')).toHaveCount(1);

        // รีโหลด
        await page.reload();

        // ตรวจสอบ Hydration หลังรีโหลด
        await expect(page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...')).toBeVisible();
        await expect(page.locator(`[id="row-${wrongSong.id}"]`)).toBeVisible();
    });

    // ==========================================
    // CASE 4: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration)
    // ==========================================
    test('Can trigger mode selector and navigate from Daily to Unlimited mode', async ({ page }: { page: Page }) => {
        await page.goto(DAILY_ROUTE);

        // คลิกป้ายบ่งชี้สถานะโหมดปัจจุบัน
        const modeBadge = page.locator('span, div').getByText(/daily/i).first();
        await expect(modeBadge).toBeVisible();
        await modeBadge.click();

        // ตรวจการเปิดขึ้นมาของตัวเลือกโหมดไม่จำกัดรอบ (ModeSelectorModal)
        const unlimitedOption = page.locator('button, div').getByText(/unlimited/i).last();
        await expect(unlimitedOption).toBeVisible();
        await unlimitedOption.click();

        // ตรวจสอบว่า Browser ย้ายพิกัดเส้นทางระบบไปยังหน้าเกมโหมด Unlimited สำเร็จ
        await expect(page).toHaveURL(/\/unlimited/);
    });

    // ==========================================
    // CASE 5: การทำงานของปุ่มนำทางใน Daily Hub Footer หลังจบเกม (Daily Hub Navigation)
    // ==========================================
    test('Shows Daily Hub items and layout when mission is concluded', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER TRACK, ARTIST, OR OP/ED...');

        // 1. รอให้ Hydration เสร็จ (เช็คว่ามี target แล้ว)
        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.id;
        }, PROGRESS_STORAGE_KEY);

        // 2. รอให้ Audio Player พร้อม (เช็คจากข้อความ 'SONG READY' ในภาพ)
        await expect(page.getByText('SONG READY')).toBeVisible({ timeout: 10000 });

        // 3. ดึง Progress ออกมา และใช้ target.id ในการหาเพลง (ห้ามใช้ targetSegmentId)
        const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const songId = progress.daily.state.target.id;
        const targetSong = rawSongs.find(s => s.id === songId);

        if (!targetSong) throw new Error(`Not found song ID: ${songId}`);

        // 4. ทายคำตอบที่ถูกต้อง
        await searchInput.fill(targetSong.title);

        // ใช้ Selector ที่แม่นยำสำหรับ Song Mode (มักจะเป็น <li>)
        const option = page.locator('li').getByText(targetSong.title, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // 5. รอหน้าต่างสรุป
        const initializeCta = page.getByText('Initialize:');
        const sealedRecord = page.getByText('RECORD // SEALED');

        await expect(initializeCta.or(sealedRecord)).toBeVisible({ timeout: 6000 });
    });
});