const express = require('express')
const router = express.Router()
const webpush = require('web-push')
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

function getVapidKeys() {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || `mailto:${process.env.EMAIL_FROM || 'noreply@example.com'}`
  }
}

// GET /api/push/vapid-public-key — 返回公钥给前端
router.get('/vapid-public-key', (req, res) => {
  const { publicKey } = getVapidKeys()
  if (!publicKey) {
    return res.status(503).json({ success: false, message: 'Push 通知未配置' })
  }
  res.json({ success: true, publicKey })
})

// POST /api/push/subscribe — 保存订阅
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ success: false, message: '订阅信息不完整' })
  }

  try {
    // 先清除其他用户对同一 endpoint 的订阅，确保一个设备只属于一个用户
    await pool.query(
      'DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id!=$2',
      [endpoint, req.user.id]
    )
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh=$3, auth=$4`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('保存 push 订阅失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// DELETE /api/push/unsubscribe — 删除订阅
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
  const { endpoint } = req.body
  if (!endpoint) {
    return res.status(400).json({ success: false, message: '缺少 endpoint' })
  }

  try {
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2',
      [req.user.id, endpoint]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('删除 push 订阅失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// GET /api/push/status — 当前用户是否有订阅
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id FROM push_subscriptions WHERE user_id=$1 LIMIT 1',
      [req.user.id]
    )
    res.json({ success: true, subscribed: result.rowCount > 0 })
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// POST /api/push/test — 发送测试通知（开发用）
router.post('/test', authMiddleware, async (req, res) => {
  const { publicKey, privateKey, subject } = getVapidKeys()
  if (!publicKey || !privateKey) {
    return res.status(503).json({ success: false, message: 'Push 通知未配置' })
  }

  try {
    const subs = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=$1',
      [req.user.id]
    )
    if (subs.rowCount === 0) {
      return res.status(404).json({ success: false, message: '尚未订阅通知' })
    }

    webpush.setVapidDetails(subject, publicKey, privateKey)

    const payload = JSON.stringify({
      title: '🌸 Mini Note 测试通知',
      body: '推送通知配置成功！',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      url: '/'
    })

    const results = await Promise.allSettled(
      subs.rows.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    res.json({ success: true, sent })
  } catch (err) {
    console.error('发送测试通知失败:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
