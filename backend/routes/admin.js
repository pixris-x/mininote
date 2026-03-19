const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')
const adminMiddleware = require('../middleware/admin')
const {
  getPushSubscriberCount,
  normalizeNotificationUrl,
  sendBroadcastPush
} = require('../utils/admin-push')

// 所有管理员接口都需要登录 + 管理员权限
router.use(authMiddleware, adminMiddleware)

// ====== 报表数据总览 ======
router.get('/stats', async (req, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const [
      totalUsers,
      todayUsers,
      totalNotes,
      todayNotes,
      totalLogs,
      todayLogs,
      errorLogs,
      recentUsers,
      notesTrend,
      usersTrend,
      logLevelStats
    ] = await Promise.all([
      // 总用户数
      pool.query('SELECT COUNT(*) FROM users WHERE is_admin = FALSE'),
      // 今日新增用户
      pool.query('SELECT COUNT(*) FROM users WHERE is_admin = FALSE AND created_at >= $1', [todayStart]),
      // 总记事数
      pool.query('SELECT COUNT(*) FROM notes'),
      // 今日新增记事
      pool.query('SELECT COUNT(*) FROM notes WHERE created_at >= $1', [todayStart]),
      // 总日志数
      pool.query('SELECT COUNT(*) FROM system_logs'),
      // 今日新增日志
      pool.query('SELECT COUNT(*) FROM system_logs WHERE created_at >= $1', [todayStart]),
      // 错误日志数
      pool.query("SELECT COUNT(*) FROM system_logs WHERE level = 'error'"),
      // 最近注册的5个用户（脱敏）
      pool.query(`
        SELECT id, username, nickname, avatar_color, created_at
        FROM users WHERE is_admin = FALSE
        ORDER BY created_at DESC LIMIT 5
      `),
      // 近7天每天记事新增趋势
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM notes
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      // 近7天每天用户注册趋势
      pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `),
      // 日志级别分布
      pool.query(`
        SELECT level, COUNT(*) as count
        FROM system_logs
        GROUP BY level
        ORDER BY count DESC
      `)
    ])

    res.json({
      success: true,
      data: {
        overview: {
          total_users:  parseInt(totalUsers.rows[0].count),
          today_users:  parseInt(todayUsers.rows[0].count),
          total_notes:  parseInt(totalNotes.rows[0].count),
          today_notes:  parseInt(todayNotes.rows[0].count),
          total_logs:   parseInt(totalLogs.rows[0].count),
          today_logs:   parseInt(todayLogs.rows[0].count),
          error_logs:   parseInt(errorLogs.rows[0].count),
        },
        recent_users:    recentUsers.rows,
        notes_trend:     notesTrend.rows,
        users_trend:     usersTrend.rows,
        log_level_stats: logLevelStats.rows,
      }
    })
  } catch (err) {
    console.error('管理员统计错误:', err)
    res.status(500).json({ success: false, message: '获取统计数据失败' })
  }
})

// ====== 日志列表（分页 + 过滤）======
router.get('/logs', async (req, res) => {
  const { level, page = 1, limit = 50, search } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)

  try {
    let where = []
    let params = []
    let idx = 1

    if (level && level !== 'all') {
      where.push(`level = $${idx++}`)
      params.push(level)
    }
    if (search) {
      where.push(`(message ILIKE $${idx} OR route ILIKE $${idx})`)
      params.push(`%${search}%`)
      idx++
    }

    const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''

    const [logs, total] = await Promise.all([
      pool.query(
        `SELECT sl.*, u.username
         FROM system_logs sl
         LEFT JOIN users u ON sl.user_id = u.id
         ${whereStr}
         ORDER BY sl.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM system_logs ${whereStr}`, params)
    ])

    res.json({
      success: true,
      data: {
        logs: logs.rows,
        total: parseInt(total.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(total.rows[0].count) / parseInt(limit))
      }
    })
  } catch (err) {
    console.error('获取日志错误:', err)
    res.status(500).json({ success: false, message: '获取日志失败' })
  }
})

// ====== 清理旧日志（保留最近N天）======
router.delete('/logs/clean', async (req, res) => {
  const { days = 30 } = req.query
  try {
    const result = await pool.query(
      'DELETE FROM system_logs WHERE created_at < NOW() - ($1 || \' days\')::INTERVAL RETURNING id',
      [parseInt(days)]
    )
    res.json({ success: true, message: `已清理 ${result.rowCount} 条日志`, deleted: result.rowCount })
  } catch (err) {
    res.status(500).json({ success: false, message: '清理失败' })
  }
})

// ====== 用户列表（脱敏，不含密码）======
router.get('/users', async (req, res) => {
  const { page = 1, limit = 20 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  try {
    const [users, total] = await Promise.all([
      pool.query(
        `SELECT id, username, nickname, email, avatar_color, theme, is_admin, created_at,
                (SELECT COUNT(*) FROM notes n WHERE n.user_id = users.id) as note_count
         FROM users
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [parseInt(limit), offset]
      ),
      pool.query('SELECT COUNT(*) FROM users')
    ])
    res.json({
      success: true,
      data: {
        users: users.rows,
        total: parseInt(total.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: '获取用户列表失败' })
  }
})

// ====== 推送通知管理 ======

function validatePushPayload(body) {
  const title = String(body?.title || '').trim()
  const content = String(body?.body || '').trim()
  const url = normalizeNotificationUrl(body?.url)

  if (!title) return { ok: false, message: '通知标题不能为空' }
  if (!content) return { ok: false, message: '通知内容不能为空' }
  if (title.length > 120) return { ok: false, message: '通知标题最多 120 个字符' }
  if (content.length > 1000) return { ok: false, message: '通知内容最多 1000 个字符' }

  return { ok: true, data: { title, body: content, url } }
}

// GET /api/admin/push/notifications — 获取通知概览 + 定时通知列表
router.get('/push/notifications', async (req, res) => {
  try {
    const [subscribedUsers, scheduledCount, notifications] = await Promise.all([
      getPushSubscriberCount(),
      pool.query("SELECT COUNT(*) AS count FROM admin_push_notifications WHERE status = 'scheduled'"),
      pool.query(`
        SELECT
          n.id,
          n.title,
          n.body,
          n.target_url,
          n.scheduled_for,
          n.status,
          n.total_count,
          n.sent_count,
          n.failed_count,
          n.expired_count,
          n.last_error,
          n.sent_at,
          n.created_at,
          n.updated_at,
          u.username AS created_by_username,
          u.nickname AS created_by_nickname
        FROM admin_push_notifications n
        LEFT JOIN users u ON u.id = n.created_by
        ORDER BY n.created_at DESC
        LIMIT 100
      `)
    ])

    res.json({
      success: true,
      data: {
        summary: {
          subscribed_users: subscribedUsers,
          scheduled_count: parseInt(scheduledCount.rows[0]?.count || '0')
        },
        notifications: notifications.rows
      }
    })
  } catch (err) {
    console.error('获取管理员通知列表失败:', err)
    res.status(500).json({ success: false, message: '获取通知列表失败' })
  }
})

// POST /api/admin/push/send — 立即推送给所有已订阅用户
router.post('/push/send', async (req, res) => {
  const validated = validatePushPayload(req.body)
  if (!validated.ok) {
    return res.status(400).json({ success: false, message: validated.message })
  }

  try {
    const result = await sendBroadcastPush(validated.data)
    const message = result.total === 0
      ? '当前没有已开启推送通知的用户'
      : `发送完成：成功 ${result.sent}，失败 ${result.failed}`

    res.json({
      success: true,
      message,
      data: result
    })
  } catch (err) {
    console.error('管理员立即推送失败:', err)
    res.status(500).json({ success: false, message: err.message || '发送失败' })
  }
})

// POST /api/admin/push/notifications — 新建定时推送任务
router.post('/push/notifications', async (req, res) => {
  const validated = validatePushPayload(req.body)
  if (!validated.ok) {
    return res.status(400).json({ success: false, message: validated.message })
  }

  const scheduledFor = new Date(req.body?.scheduled_for)
  if (!req.body?.scheduled_for || Number.isNaN(scheduledFor.getTime())) {
    return res.status(400).json({ success: false, message: '定时发送时间无效' })
  }
  if (scheduledFor.getTime() <= Date.now()) {
    return res.status(400).json({ success: false, message: '定时发送时间必须晚于当前时间' })
  }

  try {
    const created = await pool.query(
      `INSERT INTO admin_push_notifications (
        title, body, target_url, scheduled_for, created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, body, target_url, scheduled_for, status, created_at`,
      [
        validated.data.title,
        validated.data.body,
        validated.data.url,
        scheduledFor.toISOString(),
        req.user.id
      ]
    )

    res.json({
      success: true,
      message: '定时通知已创建',
      data: created.rows[0]
    })
  } catch (err) {
    console.error('创建定时通知失败:', err)
    res.status(500).json({ success: false, message: '创建定时通知失败' })
  }
})

// POST /api/admin/push/notifications/:id/send-now — 立即触发定时通知
router.post('/push/notifications/:id/send-now', async (req, res) => {
  const id = parseInt(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: '通知任务 ID 无效' })
  }

  try {
    const lockRes = await pool.query(
      `UPDATE admin_push_notifications
       SET status = 'sending', updated_at = NOW(), last_error = NULL
       WHERE id = $1
         AND status IN ('scheduled', 'failed')
       RETURNING id, title, body, target_url`,
      [id]
    )

    if (lockRes.rowCount === 0) {
      const curRes = await pool.query(
        'SELECT status FROM admin_push_notifications WHERE id = $1',
        [id]
      )
      if (curRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: '通知任务不存在' })
      }
      return res.status(409).json({
        success: false,
        message: curRes.rows[0].status === 'sent'
          ? '该通知已发送，无需重复触发'
          : '该通知正在发送中，请稍后再试'
      })
    }

    const notification = lockRes.rows[0]
    const result = await sendBroadcastPush({
      title: notification.title,
      body: notification.body,
      url: notification.target_url
    })

    const finalStatus = (result.total > 0 && result.sent === 0) ? 'failed' : 'sent'
    await pool.query(
      `UPDATE admin_push_notifications
       SET status = $2,
           total_count = $3,
           sent_count = $4,
           failed_count = $5,
           expired_count = $6,
           sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END,
           last_error = CASE WHEN $2 = 'failed' THEN '全部发送失败' ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1`,
      [id, finalStatus, result.total, result.sent, result.failed, result.expired]
    )

    res.json({
      success: true,
      message: finalStatus === 'sent'
        ? `发送完成：成功 ${result.sent}，失败 ${result.failed}`
        : '发送失败：所有推送均未送达',
      data: { id, status: finalStatus, ...result }
    })
  } catch (err) {
    try {
      await pool.query(
        `UPDATE admin_push_notifications
         SET status = 'failed', last_error = $2, updated_at = NOW()
         WHERE id = $1`,
        [id, err.message || '发送失败']
      )
    } catch (updateErr) {
      console.error('回写通知失败状态失败:', updateErr)
    }
    console.error('立即触发定时通知失败:', err)
    res.status(500).json({ success: false, message: err.message || '发送失败' })
  }
})

module.exports = router
