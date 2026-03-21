const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

const STATUS_FILTERS = new Set(['all', 'unread', 'read'])
const TYPE_FILTERS = new Set(['all', 'push', 'due_reminder', 'system'])

function normalizeStatusFilter(raw) {
  const value = String(raw || 'all').trim()
  return STATUS_FILTERS.has(value) ? value : 'all'
}

function normalizeTypeFilter(raw) {
  const value = String(raw || 'all').trim()
  return TYPE_FILTERS.has(value) ? value : 'all'
}

function normalizePage(raw) {
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : 1
}

function normalizeLimit(raw) {
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) return 20
  return Math.min(100, value)
}

function buildListWhere({ userId, status, type }) {
  const where = ['user_id = $1']
  const params = [userId]

  if (status === 'unread') {
    where.push('is_read = FALSE')
  } else if (status === 'read') {
    where.push('is_read = TRUE')
  }

  if (type !== 'all') {
    params.push(type)
    where.push(`type = $${params.length}`)
  }

  return { whereSql: where.join(' AND '), params }
}

router.use(authMiddleware)

// GET /api/notifications/summary
router.get('/summary', async (req, res) => {
  try {
    const summaryRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_read = FALSE) AS unread_total,
         COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'push') AS unread_push,
         COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'due_reminder') AS unread_due_reminder,
         COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'system') AS unread_system
       FROM user_notifications
       WHERE user_id = $1`,
      [req.user.id]
    )

    res.json({
      success: true,
      data: {
        unread_total: Number(summaryRes.rows[0]?.unread_total || 0),
        unread_push: Number(summaryRes.rows[0]?.unread_push || 0),
        unread_due_reminder: Number(summaryRes.rows[0]?.unread_due_reminder || 0),
        unread_system: Number(summaryRes.rows[0]?.unread_system || 0)
      }
    })
  } catch (err) {
    console.error('获取通知摘要失败:', err)
    res.status(500).json({ success: false, message: '获取通知摘要失败' })
  }
})

// GET /api/notifications
router.get('/', async (req, res) => {
  const status = normalizeStatusFilter(req.query.status)
  const type = normalizeTypeFilter(req.query.type)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit

  try {
    const { whereSql, params } = buildListWhere({ userId: req.user.id, status, type })

    const [listRes, totalRes, summaryRes] = await Promise.all([
      pool.query(
        `SELECT
           id, type, source, title, content, link_url, payload,
           is_read, read_at, created_at, updated_at
         FROM user_notifications
         WHERE ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS count
         FROM user_notifications
         WHERE ${whereSql}`,
        params
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE is_read = FALSE) AS unread_total,
           COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'push') AS unread_push,
           COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'due_reminder') AS unread_due_reminder,
           COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'system') AS unread_system
         FROM user_notifications
         WHERE user_id = $1`,
        [req.user.id]
      )
    ])

    const total = Number(totalRes.rows[0]?.count || 0)
    const pages = Math.max(1, Math.ceil(total / Math.max(limit, 1)))

    res.json({
      success: true,
      data: {
        items: listRes.rows,
        total,
        page,
        limit,
        pages,
        filters: { status, type },
        summary: {
          unread_total: Number(summaryRes.rows[0]?.unread_total || 0),
          unread_push: Number(summaryRes.rows[0]?.unread_push || 0),
          unread_due_reminder: Number(summaryRes.rows[0]?.unread_due_reminder || 0),
          unread_system: Number(summaryRes.rows[0]?.unread_system || 0)
        }
      }
    })
  } catch (err) {
    console.error('获取通知列表失败:', err)
    res.status(500).json({ success: false, message: '获取通知列表失败' })
  }
})

// PATCH /api/notifications/read/all
router.patch('/read/all', async (req, res) => {
  const type = normalizeTypeFilter(req.body?.type)
  const params = [req.user.id]
  let typeClause = ''

  if (type !== 'all') {
    params.push(type)
    typeClause = ` AND type = $${params.length}`
  }

  try {
    const result = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE,
           read_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1
         AND is_read = FALSE
         ${typeClause}`,
      params
    )

    res.json({
      success: true,
      message: `已标记 ${result.rowCount} 条通知为已读`,
      data: { affected: result.rowCount }
    })
  } catch (err) {
    console.error('全部已读失败:', err)
    res.status(500).json({ success: false, message: '批量已读失败' })
  }
})

// PATCH /api/notifications/read/batch
router.patch('/read/batch', async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map(id => Number.parseInt(id, 10)).filter(id => Number.isInteger(id) && id > 0)
    : []

  if (ids.length === 0) {
    return res.status(400).json({ success: false, message: '请传入要批量已读的通知 ID' })
  }
  if (ids.length > 500) {
    return res.status(400).json({ success: false, message: '单次批量数量不能超过 500 条' })
  }

  try {
    const result = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE,
           read_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1
         AND id = ANY($2::bigint[])
         AND is_read = FALSE`,
      [req.user.id, ids]
    )

    res.json({
      success: true,
      message: `已标记 ${result.rowCount} 条通知为已读`,
      data: { affected: result.rowCount }
    })
  } catch (err) {
    console.error('批量已读失败:', err)
    res.status(500).json({ success: false, message: '批量已读失败' })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: '通知 ID 无效' })
  }

  try {
    const result = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE,
           read_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
       RETURNING id, is_read, read_at`,
      [id, req.user.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '通知不存在' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('通知已读失败:', err)
    res.status(500).json({ success: false, message: '通知已读失败' })
  }
})

module.exports = router
