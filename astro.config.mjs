import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  site: 'https://pew.app',
  integrations: [
    react(),
    tailwind({
      // Tailwind configuration
      applyBaseStyles: false, // We'll handle base styles manually
    }),
  ],
  vite: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Pocket Expense Wallet',
          short_name: 'PEW',
          description: 'Track your expenses offline with advanced PWA features',
          theme_color: '#1f2937',
          background_color: '#111827',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,ico,png,webp}'],
        },
        devOptions: {
          enabled: true,
        },
      })
    ],
    // Vite 6 optimizations
    build: {
      // Bundle splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React chunks
            'react-vendor': ['react', 'react-dom'],
            // Database and storage
            'storage-vendor': ['dexie', 'idb-keyval'],
            // PWA utilities
            'pwa-vendor': ['workbox-window'],
          },
        },
      },
      // Modern build target
      target: 'esnext',
    },
    // Development optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'dexie', 'idb-keyval'],
    },
    // Modern ES modules
    esbuild: {
      target: 'esnext',
    },
  },
  // TypeScript strict mode
  typescript: {
    strict: true,
  },
  // Modern output
  output: 'static',
  adapter: undefined,
});
