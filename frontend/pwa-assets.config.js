import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimalPreset,
    appleTouchIcon: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: '#FFB3C6' }
    },
    maskable: {
      sizes: [512],
      padding: 0.1,
      resizeOptions: { background: '#FFB3C6' }
    },
    favicon: {
      sizes: [64, 48, 32, 16],
      padding: 0.05
    }
  },
  images: ['public/favicon.svg']
})
