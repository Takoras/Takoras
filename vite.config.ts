/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Build du site : sortie dans dist/ (servie par Cloudflare, voir wrangler.jsonc).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Parties de supabase-js que le site n'utilise pas (stockage de fichiers, Edge Functions) : remplacées par des modules vides
      '@supabase/storage-js': fileURLToPath(new URL('./src/lib/stubs/supabase-storage.ts', import.meta.url)),
      '@supabase/functions-js': fileURLToPath(new URL('./src/lib/stubs/supabase-functions.ts', import.meta.url)),
    },
  },
  build: { target: 'es2022', sourcemap: true },
  css: { modules: { localsConvention: 'camelCase' } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
