export default defineNuxtConfig({
  compatibilityDate: '2026-03-27',
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/styles/main.scss'],
  pwa: {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
    manifest: {
      name: 'Mini Note',
      short_name: 'Mini Note',
      description: '可爱扁平化记事应用',
      theme_color: '#FFB3C6',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      lang: 'zh-CN',
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
    },
    devOptions: {
      enabled: false,
      type: 'module'
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api'),
      uploadsBase: process.env.NUXT_PUBLIC_UPLOADS_BASE || '/uploads'
    }
  },
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: process.env.NUXT_UPLOADS_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
