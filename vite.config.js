import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // registered from main.js, only when served over http(s)
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
      manifest: {
        name: 'Gym Tracker',
        short_name: 'GymTracker',
        description: 'Track your gym workouts',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/gt/',
        scope: '/gt/',
        icons: [
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  resolve: {
    // pouchdb-browser extends Node's EventEmitter; point it at the npm polyfill
    alias: { events: 'events' }
  },
  optimizeDeps: { include: ['pouchdb-browser', 'events'] },
  base: '/gt/',
  build: {
    outDir: 'dist'
  }
});
