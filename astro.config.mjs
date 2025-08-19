import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  site: 'https://[TUO-USERNAME].github.io/[NOME-REPO]', // Sostituisci con il tuo username e nome repo
  base: '/[NOME-REPO]', // Sostituisci con il nome del tuo repository
  // Disable dev toolbar to avoid axobject-query import issues
  devToolbar: {
    enabled: false,
  },
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
          scope: '/[NOME-REPO]/', // Aggiorna con il nome del repo
          start_url: '/[NOME-REPO]/', // Aggiorna con il nome del repo
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
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
            {
              urlPattern: /^https:\/\/api\./,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
        injectRegister: 'auto',
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
