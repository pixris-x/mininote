import { pushApi } from '@/api'

/**
 * 将 base64url 字符串转为 Uint8Array（Web Push 订阅需要）
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

/**
 * 检查当前浏览器是否支持 Web Push
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * 获取当前通知权限状态
 * @returns {'granted'|'denied'|'default'|'unsupported'}
 */
export function getPermissionStatus() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * 请求通知权限 + 订阅 Web Push，并将订阅发送给后端
 * @returns {Promise<'granted'|'denied'|'error'>}
 */
export async function subscribePush() {
  if (!isPushSupported()) return 'unsupported'

  // 1. 请求权限
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  try {
    // 2. 获取 VAPID 公钥
    const { publicKey } = await pushApi.getVapidPublicKey()

    // 3. 获取 SW registration
    const registration = await navigator.serviceWorker.ready

    // 4. 创建 Push 订阅
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    })

    // 5. 发给后端保存
    await pushApi.subscribe(subscription.toJSON())
    return 'granted'
  } catch (err) {
    console.error('[Push] 订阅失败:', err)
    return 'error'
  }
}

/**
 * 取消 Web Push 订阅
 */
export async function unsubscribePush() {
  if (!isPushSupported()) return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await pushApi.unsubscribe(subscription.endpoint)
      await subscription.unsubscribe()
    }
  } catch (err) {
    console.error('[Push] 取消订阅失败:', err)
  }
}

/**
 * 检查当前设备是否已订阅（后端 + 本地双重确认）
 */
export async function checkPushSubscribed() {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready
    const local = await registration.pushManager.getSubscription()
    if (!local) return false

    const { subscribed } = await pushApi.getStatus()
    return subscribed
  } catch {
    return false
  }
}
