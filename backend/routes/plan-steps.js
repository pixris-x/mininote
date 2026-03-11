const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

router.use(authMiddleware)

// GET /api/plan-steps?plan_id=xx — 获取计划的所有步骤
router.get('/', async (req, res) => {
  const { plan_id } = req.query
  if (!plan_id) {
    return res.status(400).json({ success: false, message: '请提供 plan_id' })
  }

  // 验证计划归属
  const planCheck = await pool.query(
    'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
    [plan_id, req.user.id]
  )
  if (planCheck.rows.length === 0) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }

  const result = await pool.query(
    `SELECT * FROM plan_steps WHERE plan_id = $1 ORDER BY sort_order ASC, created_at ASC`,
    [plan_id]
  )
  res.json({ success: true, data: result.rows })
})

// POST /api/plan-steps — 新增步骤
router.post('/', async (req, res) => {
  const { plan_id, title, description, status, badge, badge_color, due_date, start_date, sort_order, image_urls, location } = req.body
  if (!plan_id || !title?.trim()) {
    return res.status(400).json({ success: false, message: 'plan_id 和步骤标题不能为空' })
  }

  // 验证计划归属
  const planCheck = await pool.query(
    'SELECT id FROM plans WHERE id = $1 AND user_id = $2',
    [plan_id, req.user.id]
  )
  if (planCheck.rows.length === 0) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }

  // 默认排序：当前最大序号 + 1
  let nextOrder = sort_order
  if (nextOrder === undefined || nextOrder === null) {
    const maxRes = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS max FROM plan_steps WHERE plan_id = $1',
      [plan_id]
    )
    nextOrder = parseInt(maxRes.rows[0].max) + 1
  }

  const urlsJson = JSON.stringify(Array.isArray(image_urls) ? image_urls : [])
  const stepStatus = status || 'pending'
  const completedAt = stepStatus === 'completed' ? new Date() : null
  // 空字符串日期转 null
  const dueDateVal = due_date || null
  const startDateVal = start_date || null

  const result = await pool.query(
    `INSERT INTO plan_steps
       (plan_id, user_id, title, description, status, badge, badge_color, due_date, sort_order, image_urls, location, start_date, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)
     RETURNING *`,
    [
      plan_id, req.user.id,
      title.trim(),
      description || '',
      stepStatus,
      badge || '',
      badge_color || '',
      dueDateVal,
      nextOrder,
      urlsJson,
      location || '',
      startDateVal,
      completedAt
    ]
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

// PUT /api/plan-steps/:id — 更新步骤
router.put('/:id', async (req, res) => {
  const { title, description, status, badge, badge_color, image_url, image_urls, due_date, start_date, sort_order, location } = req.body

  // 空字符串日期转 null，避免 PostgreSQL DATE 类型报错
  const dueDateVal = due_date || null
  const startDateVal = start_date || null

  const check = await pool.query(
    'SELECT id FROM plan_steps WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  )
  if (check.rows.length === 0) {
    return res.status(404).json({ success: false, message: '步骤不存在' })
  }

  // 如果标记为完成，记录完成时间
  let completedAt = undefined
  if (status === 'completed') {
    completedAt = new Date()
  } else if (status && status !== 'completed') {
    completedAt = null
  }

  const urlsJson = image_urls !== undefined ? JSON.stringify(Array.isArray(image_urls) ? image_urls : []) : null

  const result = await pool.query(
    `UPDATE plan_steps
     SET title        = COALESCE($1, title),
         description  = COALESCE($2, description),
         status       = COALESCE($3, status),
         badge        = COALESCE($4, badge),
         badge_color  = COALESCE($5, badge_color),
         image_url    = COALESCE($6, image_url),
         image_urls   = CASE WHEN $7::text IS NOT NULL THEN $7::jsonb ELSE image_urls END,
         due_date     = COALESCE($8, due_date),
         sort_order   = COALESCE($9, sort_order),
         location     = COALESCE($10, location),
         completed_at = CASE WHEN $11::boolean THEN $12::timestamp
                             WHEN $13::boolean THEN NULL
                             ELSE completed_at END,
         start_date   = COALESCE($16, start_date)
     WHERE id = $14 AND user_id = $15
     RETURNING *`,
    [
      title, description, status, badge, badge_color, image_url,
      urlsJson,
      dueDateVal, sort_order,
      location !== undefined ? location : null,
      status === 'completed',
      completedAt,
      status !== undefined && status !== 'completed',
      req.params.id, req.user.id,
      start_date !== undefined ? startDateVal : null
    ]
  )
  res.json({ success: true, data: result.rows[0] })
})

// PATCH /api/plan-steps/reorder — 批量更新步骤排序
router.patch('/reorder', async (req, res) => {
  const { items } = req.body // [{ id, sort_order }, ...]
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: '请提供排序数据' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const item of items) {
      await client.query(
        'UPDATE plan_steps SET sort_order = $1 WHERE id = $2 AND user_id = $3',
        [item.sort_order, item.id, req.user.id]
      )
    }
    await client.query('COMMIT')
    res.json({ success: true, message: '排序已更新' })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// DELETE /api/plan-steps/:id — 删除步骤
router.delete('/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM plan_steps WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: '步骤不存在' })
  }
  res.json({ success: true, message: '步骤已删除' })
})

module.exports = router
