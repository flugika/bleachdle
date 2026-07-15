// client/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            '@src': path.resolve(__dirname, './src'),
        },
    },
});