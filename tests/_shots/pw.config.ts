import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  workers: 4,
  use: { baseURL: 'http://localhost:5173', contextOptions: { reducedMotion: 'reduce' } },
  projects: [
    { name: 'pc', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } } },
    { name: 'tel', use: { ...devices['Pixel 7 landscape'], viewport: { width: 812, height: 375 } } },
  ],
});
