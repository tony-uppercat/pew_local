import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { VitePWA } from 'vite-plugin-pwa';

// https://astro.build/config
export default defineConfig({
  site: 'https://tony-uppercat.github.io/pew_local',
  base: '/pew_local',
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
        includeAssets: ['favicon.svg', 'icon-192x192.png', 'icon-512x512.png'],
        manifest: {
          name: 'Pocket Expense Wallet',
          short_name: 'PEW',
          description: 'Track your expenses offline with advanced PWA features',
          theme_color: '#1f2937',
          background_color: '#111827',
          display: 'standalone',
          scope: '/pew_local/',
          start_url: '/pew_local/',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
            },
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
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
});
