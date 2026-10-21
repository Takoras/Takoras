import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout : sur le serveur local (npm run preview), en téléphone (375 px) et sur PC (1280 px).
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: process.env.E2E_URL ?? 'http://localhost:4173' },
  webServer: process.env.E2E_URL ? undefined : { command: 'npm run build && npm run preview', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 760 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
});
