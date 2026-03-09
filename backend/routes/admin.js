const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')
const adminMiddleware = require('../middleware/admin')

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

module.exports = router
