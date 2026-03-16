/**
 * 手动发送测试 Push 通知
 * 用法：
 *   node backend/scripts/test-push.js              # 发给所有有订阅的用户
 *   node backend/scripts/test-push.js <username>   # 发给指定用户名
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const webpush = require('web-push')
const pool = require('../config/db')

const publicKey  = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const subject    = process.env.VAPID_SUBJECT || `mailto:noreply@example.com`

if (!publicKey || !privateKey) {
  console.error('❌ VAPID 密钥未配置，请检查 .env 文件')
  process.exit(1)
}

webpush.setVapidDetails(subject, publicKey, privateKey)

async function main() {
  const targetUser = process.argv[2] || null
  const title   = process.argv[3] || '🌸 Mini Note 测试通知'
  const body    = process.argv[4] || '这是一条手动触发的测试推送消息！'

  let query, params
  if (targetUser) {
    query  = `SELECT s.endpoint, s.p256dh, s.auth, u.username
              FROM push_subscriptions s
              JOIN users u ON u.id = s.user_id
              WHERE u.username = $1`
    params = [targetUser]
  } else {
    query  = `SELECT s.endpoint, s.p256dh, s.auth, u.username
              FROM push_subscriptions s
              JOIN users u ON u.id = s.user_id`
    params = []
  }

  const result = await pool.query(query, params)
  if (result.rowCount === 0) {
    console.log(targetUser ? `⚠️  用户 "${targetUser}" 没有有效的 Push 订阅` : '⚠️  没有任何用户订阅了 Push 通知')
    await pool.end()
    return
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    url: '/'
  })

  let sent = 0
  const expired = []

  for (const row of result.rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payload
      )
      console.log(`✅ 已发送给 ${row.username}`)
      sent++
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`⚠️  ${row.username} 的订阅已失效，将清理`)
        expired.push(row.endpoint)
      } else {
        console.error(`❌ 发送给 ${row.username} 失败:`, err.message)
      }
    }
  }

  if (expired.length > 0) {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ANY($1)', [expired])
    console.log(`🗑  已清理 ${expired.length} 条失效订阅`)
  }

  console.log(`\n📊 发送完成：成功 ${sent} / 共 ${result.rowCount} 条`)
  await pool.end()
}

main().catch(err => {
  console.error('脚本执行失败:', err)
  pool.end()
  process.exit(1)
})
