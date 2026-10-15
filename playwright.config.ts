import { defineConfig, devices } from '@playwright/test';

const port = process.env.SAILBLOG_TEST_PORT ?? '4173';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node scripts/start-test-server.mjs',
    url: `${baseURL}/terms`,
    reuseExistingServer: false,
    timeout: 30000
  },
  projects: [
    { name: 'api', testMatch: 'integration/**/*.spec.ts' },
    { name: 'desktop', testMatch: 'e2e/**/*.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: 'e2e/**/*.spec.ts', use: { ...devices['Pixel 7'] } }
  ]
});
