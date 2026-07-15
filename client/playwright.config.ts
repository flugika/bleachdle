// client/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',

    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],

    // สตาร์ท Next.js dev/prod server ให้อัตโนมัติก่อนรันเทสต์
    webServer: {
        command: 'pnpm dev', // หรือ 'pnpm build && pnpm start' ถ้าอยากเทสต์กับ production build
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});