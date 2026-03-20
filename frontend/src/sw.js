import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Workbox 预缓存（由 vite-plugin-pwa 注入清单）
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// API 缓存白名单：仅缓存公开、无用户隐私的数据
registerRoute(
  ({ request, url }) =>
    request.method === 'GET' &&
    url.pathname === '/api/push/vapid-public-key',
  new NetworkFirst({
    cacheName: 'api-public-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 })]
  })
)

// 上传资源：缓存优先
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads/'),
  new CacheFirst({
    cacheName: 'uploads-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 604800 })]
  })
)

// 清理历史运行时缓存（旧版本曾使用 api-cache 缓存全部 API）
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames
        .filter((name) => name === 'api-cache')
        .map((name) => caches.delete(name))
    )
    await self.clients.claim()
  })())
})

// ── Push 通知处理 ──────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Mini Note', body: event.data.text() }
  }

  const title = data.title || 'Mini Note'
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-64x64.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── 点击通知跳转 ───────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 已有窗口则聚焦并跳转
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // 没有窗口则新开
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
