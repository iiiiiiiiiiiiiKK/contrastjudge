import { defineConfig, devices } from '@playwright/test';

// A dedicated port keeps the suite from reusing another project's preview server.
const PORT = Number(process.env.E2E_PORT ?? 4591);
// The production build targets GitHub Pages project sites, so the app lives under /contrastjudge/.
// Keeping that path in the base URL means the suite exercises the same asset paths that ship.
const BASE_PATH = process.env.E2E_BASE_PATH ?? '/contrastjudge/';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}${BASE_PATH}`;
const skipWebServer = process.env.E2E_NO_SERVER === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Mobile profiles run at 3x device pixel ratio, and full-page screenshots of them are memory
  // hungry. Two workers is the sweet spot here: more than that produced flaky
  // net::ERR_INSUFFICIENT_RESOURCES failures on a Windows development machine.
  workers: Number(process.env.E2E_WORKERS ?? 2),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } },
    },
    {
      // Only Chromium is installed in this environment, so the iPhone profile runs on Chromium
      // with the iPhone viewport, device scale factor, touch support and mobile user agent.
      name: 'iphone-14',
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
    },
    {
      name: 'small-android',
      use: { ...devices['Pixel 5'], browserName: 'chromium' },
    },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 90_000,
      },
});
