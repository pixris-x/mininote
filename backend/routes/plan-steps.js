const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

router.use(authMiddleware)

// 检查用户是否有权访问某计划（owner 或 collaborator）
async function canAccessPlan(planId, userId) {
  const res = await pool.query(
    `SELECT p.id FROM plans p
     LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $2
     WHERE p.id = $1 AND (p.user_id = $2 OR c.user_id = $2)`,
    [planId, userId]
  )
  return res.rows.length > 0
}

// 检查用户是否有权操作某步骤
async function canAccessStep(stepId, userId) {
  const res = await pool.query(
    `SELECT ps.id FROM plan_steps ps
     JOIN plans p ON p.id = ps.plan_id
     LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $2
     WHERE ps.id = $1 AND (p.user_id = $2 OR c.user_id = $2)`,
    [stepId, userId]
  )
  return res.rows.length > 0
}

// GET /api/plan-steps?plan_id=xx — 获取计划的所有步骤
router.get('/', async (req, res) => {
  const { plan_id } = req.query
  if (!plan_id) {
    return res.status(400).json({ success: false, message: '请提供 plan_id' })
  }

  if (!(await canAccessPlan(plan_id, req.user.id))) {
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

  if (!(await canAccessPlan(plan_id, req.user.id))) {
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
  // 注意：null / 空字符串 均视为"清除日期"，只有 undefined 才保留原值
  const dueDateVal = due_date === undefined ? undefined : (due_date || null)
  const startDateVal = start_date === undefined ? undefined : (start_date || null)

  const check = await canAccessStep(req.params.id, req.user.id)
  if (!check) {
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

  // 是否显式传了这两个日期字段（undefined = 没传 = 保留原值，否则无论空还是有值都更新）
  const hasDueDate   = due_date   !== undefined
  const hasStartDate = start_date !== undefined

  const result = await pool.query(
    `UPDATE plan_steps
     SET title        = COALESCE($1, title),
         description  = COALESCE($2, description),
         status       = COALESCE($3, status),
         badge        = COALESCE($4, badge),
         badge_color  = COALESCE($5, badge_color),
         image_url    = COALESCE($6, image_url),
         image_urls   = CASE WHEN $7::text IS NOT NULL THEN $7::jsonb ELSE image_urls END,
         due_date     = CASE WHEN $8  THEN $9::date  ELSE due_date   END,
         start_date   = CASE WHEN $10 THEN $11::date ELSE start_date END,
         sort_order   = COALESCE($12, sort_order),
         location     = COALESCE($13, location),
         completed_at = CASE WHEN $14::boolean THEN $15::timestamp
                             WHEN $16::boolean THEN NULL
                             ELSE completed_at END
     WHERE id = $17
     RETURNING *`,
    [
      title, description, status, badge, badge_color, image_url,
      urlsJson,
      hasDueDate,   dueDateVal,    // $8, $9
      hasStartDate, startDateVal,  // $10, $11
      sort_order,                  // $12
      location !== undefined ? location : null,  // $13
      status === 'completed',      // $14
      completedAt,                 // $15
      status !== undefined && status !== 'completed',  // $16
      req.params.id                // $17
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
      // 验证步骤权限（owner 或 collaborator）
      const accessCheck = await client.query(
        `SELECT ps.id FROM plan_steps ps
         JOIN plans p ON p.id = ps.plan_id
         LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $2
         WHERE ps.id = $1 AND (p.user_id = $2 OR c.user_id = $2)`,
        [item.id, req.user.id]
      )
      if (accessCheck.rows.length > 0) {
        await client.query(
          'UPDATE plan_steps SET sort_order = $1 WHERE id = $2',
          [item.sort_order, item.id]
        )
      }
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
  if (!(await canAccessStep(req.params.id, req.user.id))) {
    return res.status(404).json({ success: false, message: '步骤不存在' })
  }
  const result = await pool.query(
    'DELETE FROM plan_steps WHERE id = $1 RETURNING id',
    [req.params.id]
  )
  res.json({ success: true, message: '步骤已删除' })
})

module.exports = router
