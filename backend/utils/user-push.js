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
  if (!value) return '/'
  if (/^https?:\/\//i.test(value)) return value
  return value.startsWith('/') ? value : `/${value}`
}

async function sendPushToUser(userId, input = {}) {
  const targetUserId = Number.parseInt(userId, 10)
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return { enabled: false, reason: 'invalid_user', total: 0, sent: 0, failed: 0, cleaned: 0 }
  }

  const title = String(input.title || '').trim()
  const body = String(input.body || '').trim()
  if (!title || !body) {
    return { enabled: false, reason: 'invalid_payload', total: 0, sent: 0, failed: 0, cleaned: 0 }
  }

  const { publicKey, privateKey, subject } = getVapidConfig()
  if (!publicKey || !privateKey) {
    return { enabled: false, reason: 'missing_vapid', total: 0, sent: 0, failed: 0, cleaned: 0 }
  }

  const subs = await pool.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [targetUserId]
  )
  if (subs.rowCount === 0) {
    return { enabled: true, reason: 'no_subscription', total: 0, sent: 0, failed: 0, cleaned: 0 }
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  const payload = JSON.stringify({
    title,
    body,
    icon: input.icon || '/pwa-192x192.png',
    badge: input.badge || '/pwa-64x64.png',
    url: normalizeNotificationUrl(input.url),
    payload: input.payload || {}
  })

  const results = await Promise.all(
    subs.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        return { ok: true, endpoint: sub.endpoint }
      } catch (err) {
        return { ok: false, endpoint: sub.endpoint, statusCode: err?.statusCode || 0 }
      }
    })
  )

  const sent = results.filter(item => item.ok).length
  const failed = results.length - sent
  const expiredEndpoints = results
    .filter(item => !item.ok && (item.statusCode === 404 || item.statusCode === 410))
    .map(item => item.endpoint)

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
    enabled: true,
    reason: 'ok',
    total: results.length,
    sent,
    failed,
    cleaned
  }
}

module.exports = {
  sendPushToUser
}
