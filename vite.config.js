import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Load environment variables
const apiKey = process.env.VITE_GOOGLE_AI_API_KEY || ''

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // Inject API key at build time
    'import.meta.env.VITE_GOOGLE_AI_API_KEY': JSON.stringify(apiKey),
    'window.__VITE_GOOGLE_AI_API_KEY__': JSON.stringify(apiKey)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Güncelleme gelince otomatik yenile
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'YKS Hub - Takip Sistemi',
        short_name: 'YKS Hub',
        description: 'YKS deneme takibi ve analiz platformu',
        theme_color: '#4f46e5', // İndigo rengimiz
        background_color: '#ffffff',
        display: 'standalone', // Tarayıcı barını gizler, tam uygulama gibi açılır
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', // Public klasörüne attığın resim
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Public klasörüne attığın resim
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Android ikonları için gerekli
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2015', // Daha eski tarayıcılar için derler
    outDir: 'dist',
    minify: 'terser',
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
        }
      }
    }
  },
  server: {
    headers: {
      'Cache-Control': 'public, max-age=300'
    },
    middlewareMode: false,
    hmr: {
      host: 'localhost',
      protocol: 'ws'
    }
  }
})