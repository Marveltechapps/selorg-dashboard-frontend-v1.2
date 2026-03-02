import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    // Start backend first in background then start the frontend dev server or production static server.
    // Set E2E_ENV=prod to serve the production build instead of starting the Vite dev server.
    command: process.env.E2E_ENV === 'prod'
      ? `sh -c "if curl -sSf http://localhost:3000 >/dev/null 2>&1; then echo 'Using existing server'; elif curl -sSf http://localhost:5001/api/v1/health >/dev/null 2>&1; then echo 'Backend exists, starting static server only' && cd ../Dashboard && npx serve -s dist -l 3000; else echo 'Starting backend and static server' && cd ../Backend && npm run dev & cd ../Dashboard && npx serve -s dist -l 3000; fi"`
      : `sh -c "if curl -sSf http://localhost:3000 >/dev/null 2>&1; then echo 'Using existing dev server'; else cd ../Backend && npm run dev & npm run dev; fi"`,
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    cwd: './',
  },
});

