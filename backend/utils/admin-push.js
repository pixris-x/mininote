const webpush = require('web-push')
const pool = require('../config/db')

function getVapidConfig() {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || `mailto:${process.env.EMAIL_FROM || 'noreply@example.com'}`
  }
}

function normalizeNotificationUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) return '/plans'
  if (/^https?:\/\//i.test(value)) return value
  return value.startsWith('/') ? value : `/${value}`
}

async function getPushSubscriberCount() {
  const res = await pool.query('SELECT COUNT(DISTINCT user_id) AS count FROM push_subscriptions')
  return parseInt(res.rows[0]?.count || '0')
}

async function sendBroadcastPush({ title, body, url, icon, badge }) {
  const normalizedTitle = String(title || '').trim()
  const normalizedBody = String(body || '').trim()

  if (!normalizedTitle) throw new Error('通知标题不能为空')
  if (!normalizedBody) throw new Error('通知内容不能为空')

  const { publicKey, privateKey, subject } = getVapidConfig()
  if (!publicKey || !privateKey) {
    throw new Error('Push 通知未配置 VAPID 密钥')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  const subs = await pool.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions'
  )

  if (subs.rowCount === 0) {
    return { total: 0, sent: 0, failed: 0, expired: 0, cleaned: 0 }
  }

  const payload = JSON.stringify({
    title: normalizedTitle,
    body: normalizedBody,
    icon: icon || '/pwa-192x192.png',
    badge: badge || '/pwa-64x64.png',
    url: normalizeNotificationUrl(url)
  })

  const results = await Promise.all(
    subs.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          payload
        )
        return { ok: true, endpoint: sub.endpoint }
      } catch (err) {
        return {
          ok: false,
          endpoint: sub.endpoint,
          statusCode: err.statusCode || 0
        }
      }
    })
  )

  const sent = results.filter(r => r.ok).length
  const failed = results.length - sent
  const expiredEndpoints = results
    .filter(r => !r.ok && (r.statusCode === 404 || r.statusCode === 410))
    .map(r => r.endpoint)

  let cleaned = 0
  if (expiredEndpoints.length > 0) {
    const deduped = [...new Set(expiredEndpoints)]
    const delRes = await pool.query(
      'DELETE FROM push_subscriptions WHERE endpoint = ANY($1)',
      [deduped]
    )
    cleaned = delRes.rowCount
  }

  return {
    total: results.length,
    sent,
    failed,
    expired: expiredEndpoints.length,
    cleaned
  }
}

module.exports = {
  normalizeNotificationUrl,
  getPushSubscriberCount,
  sendBroadcastPush
}

