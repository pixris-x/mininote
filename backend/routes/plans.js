const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

// 所有接口需要登录
router.use(authMiddleware)

// GET /api/plans — 获取当前用户所有计划（含步骤进度统计）
router.get('/', async (req, res) => {
  const { status } = req.query
  let query = `
    SELECT
      p.*,
      COUNT(ps.id)                                          AS total_steps,
      COUNT(ps.id) FILTER (WHERE ps.status = 'completed')  AS done_steps
    FROM plans p
    LEFT JOIN plan_steps ps ON ps.plan_id = p.id
    WHERE p.user_id = $1
  `
  const params = [req.user.id]
  if (status) {
    query += ` AND p.status = $2`
    params.push(status)
  }
  query += ` GROUP BY p.id ORDER BY p.sort_order ASC, p.created_at DESC`

  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

// GET /api/plans/:id — 获取单个计划（含所有步骤）
router.get('/:id', async (req, res) => {
  const planRes = await pool.query(
    `SELECT p.*,
      COUNT(ps.id)                                          AS total_steps,
      COUNT(ps.id) FILTER (WHERE ps.status = 'completed')  AS done_steps
     FROM plans p
     LEFT JOIN plan_steps ps ON ps.plan_id = p.id
     WHERE p.id = $1 AND p.user_id = $2
     GROUP BY p.id`,
    [req.params.id, req.user.id]
  )
  if (planRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }

  const stepsRes = await pool.query(
    `SELECT * FROM plan_steps
     WHERE plan_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [req.params.id]
  )

  res.json({
    success: true,
    data: { ...planRes.rows[0], steps: stepsRes.rows }
  })
})

// POST /api/plans — 创建计划
router.post('/', async (req, res) => {
  const { title, description, color, icon, status } = req.body
  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: '计划标题不能为空' })
  }

  const result = await pool.query(
    `INSERT INTO plans (user_id, title, description, color, icon, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      req.user.id,
      title.trim(),
      description || '',
      color || '#FFFFFF',
      icon || '🎯',
      status || 'active'
    ]
  )
  res.status(201).json({ success: true, data: { ...result.rows[0], total_steps: 0, done_steps: 0, steps: [] } })
})

// PUT /api/plans/:id — 更新计划
router.put('/:id', async (req, res) => {
  const { title, description, color, icon, status, sort_order } = req.body

  const check = await pool.query(
    'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  )
  if (check.rows.length === 0) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }

  const result = await pool.query(
    `UPDATE plans
     SET title       = COALESCE($1, title),
         description = COALESCE($2, description),
         color       = COALESCE($3, color),
         icon        = COALESCE($4, icon),
         status      = COALESCE($5, status),
         sort_order  = COALESCE($6, sort_order)
     WHERE id = $7 AND user_id = $8
     RETURNING *`,
    [title, description, color, icon, status, sort_order, req.params.id, req.user.id]
  )
  res.json({ success: true, data: result.rows[0] })
})

// DELETE /api/plans/:id — 删除计划（步骤级联删除）
router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM plans WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }
  res.json({ success: true, message: '计划已删除' })
})

// POST /api/plans/:id/share — 生成分享 token（每次调用都重新生成 PIN 和过期时间）
const crypto = require('crypto')
router.post('/:id/share', async (req, res) => {
  const { expiresIn = 7 } = req.body // 天数，0 表示永久
  const check = await pool.query(
    'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  )
  if (check.rows.length === 0) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const pin = String(Math.floor(1000 + Math.random() * 9000)) // 4位随机数字
  const expiresAt = Number(expiresIn) > 0
    ? new Date(Date.now() + Number(expiresIn) * 24 * 60 * 60 * 1000)
    : null

  await pool.query(
    `UPDATE plans
     SET share_token = $1, share_pin = $2, share_expires_at = $3
     WHERE id = $4 AND user_id = $5`,
    [token, pin, expiresAt, req.params.id, req.user.id]
  )

  res.json({ success: true, token, pin, expiresAt })
})

// DELETE /api/plans/:id/share — 撤销分享 token
router.delete('/:id/share', async (req, res) => {
  const check = await pool.query(
    'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  )
  if (check.rows.length === 0) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }
  await pool.query(
    'UPDATE plans SET share_token = NULL, share_pin = NULL, share_expires_at = NULL WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  )
  res.json({ success: true, message: '分享已撤销' })
})

module.exports = router
