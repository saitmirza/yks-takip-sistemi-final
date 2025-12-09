import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'YKS Hub - Takip Sistemi',
        short_name: 'YKS Hub',
        description: 'YKS deneme takibi ve analiz platformu',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    // iOS 12+ ve eski tarayıcılar için uyumluluk
    target: ['es2015', 'safari12', 'ios12'],
    outDir: 'dist',
    minify: 'terser', // 'npm install -D terser' komutunu unutma
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
        }
      }
    }
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=300'
    },
    hmr: {
      overlay: false
    }
  }
})