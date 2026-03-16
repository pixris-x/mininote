import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.scss'
import { registerSW } from 'virtual:pwa-register'

// 有新版本时自动更新 Service Worker
registerSW({
  onNeedRefresh() {},
  onOfflineReady() {
    console.log('[PWA] 已可离线使用')
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
