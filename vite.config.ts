/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Identifiant de cette version du site : écrit dans le JS et dans dist/version.json.
// Les pages ouvertes comparent les deux et se rechargent toutes seules quand une nouvelle version est en ligne.
const BUILD_ID = Date.now().toString(36);
const versionFile = (): Plugin => ({
  name: 'takoras-version',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) });
  },
});

// Build du site : sortie dans dist/ (servie par Cloudflare, voir wrangler.jsonc).
export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Parties de supabase-js que le site n'utilise pas (stockage de fichiers, Edge Functions) : remplacées par des modules vides
      '@supabase/storage-js': fileURLToPath(new URL('./src/lib/stubs/supabase-storage.ts', import.meta.url)),
      '@supabase/functions-js': fileURLToPath(new URL('./src/lib/stubs/supabase-functions.ts', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rolldownOptions: {
      output: {
        // Moins de petits fichiers au premier chargement (chacun coûte un aller-retour réseau) :
        // les bibliothèques ensemble, et les petits outils partagés du site ensemble. Les pages et moteurs restent à part.
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /node_modules/ },
            { name: 'shared', test: /src\/(api|lib|data|ui|i18n\/(index|useT|Rich|fr)|app\/ui-store|features\/(social\/social|eco\/eco|info\/store|beta\/store))[/.]/ },
          ],
        },
      },
    },
  },
  css: { modules: { localsConvention: 'camelCase' } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
