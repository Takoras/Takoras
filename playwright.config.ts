import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout :
// - site construit (npm run preview), en téléphone (375 px) et sur PC (1280 px) ;
// - « lab » : les moteurs portés (Ring, cinématiques) sur le serveur de dev, où vit le labo /__lab.
const external = process.env.E2E_URL;
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: external ?? 'http://localhost:4173', contextOptions: { reducedMotion: 'reduce' } },
  webServer: external
    ? undefined
    : [
        { command: 'npm run build && npm run preview', port: 4173, reuseExistingServer: true },
        { command: 'npx vite --port 5174 --strictPort', port: 5174, reuseExistingServer: true },
      ],
  projects: [
    // téléphone tenu à l'horizontale (le jeu se joue en paysage)
    {
      name: 'mobile',
      testIgnore: /(lab|match)\.spec/,
      use: { ...devices['Pixel 7 landscape'], viewport: { width: 812, height: 375 } },
    },
    {
      name: 'desktop',
      testIgnore: /(lab|match)\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'lab',
      testMatch: /(lab|match)\.spec/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174', contextOptions: {} },
    },
    // partie complète du Ring au tactile, en 375 px
    {
      name: 'lab-mobile',
      testMatch: /match\.spec/,
      use: {
        ...devices['Pixel 7 landscape'],
        viewport: { width: 812, height: 375 },
        baseURL: 'http://localhost:5174',
        contextOptions: {},
      },
    },
  ],
});
