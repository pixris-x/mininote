const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

const STEP_STATUS_SET = new Set(['pending', 'in_progress', 'completed', 'skipped'])
const RECURRENCE_UNIT_SET = new Set(['day', 'week', 'month'])

router.use(authMiddleware)

// 检查用户是否有权访问某计划（owner 或 collaborator）
async function canAccessPlan(planId, userId) {
  const res = await pool.query(
    `SELECT p.id FROM plans p
     LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $2 AND c.status = 'accepted'
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
     LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $2 AND c.status = 'accepted'
     WHERE ps.id = $1 AND (p.user_id = $2 OR c.user_id = $2)`,
    [stepId, userId]
  )
  return res.rows.length > 0
}

function parseStrictDateString(value) {
  if (!value) return null
  const str = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null

  const [year, month, day] = str.split('-').map(v => parseInt(v, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  return isValid ? str : null
}

function normalizeOptionalDateForCreate(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null }
  }
  const parsed = parseStrictDateString(value)
  if (!parsed) return { ok: false, value: null }
  return { ok: true, value: parsed }
}

function normalizeOptionalDateForUpdate(value) {
  if (value === undefined) {
    return { provided: false, ok: true, value: undefined }
  }
  if (value === null || value === '') {
    return { provided: true, ok: true, value: null }
  }
  const parsed = parseStrictDateString(value)
  if (!parsed) return { provided: true, ok: false, value: null }
  return { provided: true, ok: true, value: parsed }
}

function sanitizeStatus(value, fallback = 'pending') {
  const normalized = String(value || fallback).trim()
  return STEP_STATUS_SET.has(normalized) ? normalized : null
}

function sanitizeImageUrls(value) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 9)
}

function formatDateUtc(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function shiftDateByUnit(baseDateString, unit, amount) {
  if (!baseDateString) return null
  if (!Number.isFinite(amount) || amount <= 0) return baseDateString

  const [year, month, day] = baseDateString.split('-').map(v => parseInt(v, 10))
  const base = new Date(Date.UTC(year, month - 1, day))

  if (unit === 'day') {
    base.setUTCDate(base.getUTCDate() + amount)
    return formatDateUtc(base)
  }

  if (unit === 'week') {
    base.setUTCDate(base.getUTCDate() + amount * 7)
    return formatDateUtc(base)
  }

  if (unit === 'month') {
    const totalMonths = (month - 1) + amount
    const targetYear = year + Math.floor(totalMonths / 12)
    const targetMonthIndex = ((totalMonths % 12) + 12) % 12

    const monthEnd = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate()
    const targetDay = Math.min(day, monthEnd)
    const result = new Date(Date.UTC(targetYear, targetMonthIndex, targetDay))
    return formatDateUtc(result)
  }

  return baseDateString
}

async function getNextSortOrder(client, planId) {
  const maxRes = await client.query(
    'SELECT COALESCE(MAX(sort_order), 0) AS max FROM plan_steps WHERE plan_id = $1',
    [planId]
  )
  return parseInt(maxRes.rows[0].max, 10) + 1
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

// GET /api/plan-steps/templates — 获取当前用户的步骤模板
router.get('/templates', async (req, res) => {
  const result = await pool.query(
    `SELECT *
     FROM plan_step_templates
     WHERE user_id = $1
     ORDER BY updated_at DESC, id DESC`,
    [req.user.id]
  )
  res.json({ success: true, data: result.rows })
})

// POST /api/plan-steps/templates — 保存步骤模板
router.post('/templates', async (req, res) => {
  const name = String(req.body.name || '').trim()
  const title = String(req.body.title || '').trim()
  const status = sanitizeStatus(req.body.status || 'pending')

  if (!name) {
    return res.status(400).json({ success: false, message: '模板名称不能为空' })
  }
  if (!title) {
    return res.status(400).json({ success: false, message: '步骤标题不能为空' })
  }
  if (!status) {
    return res.status(400).json({ success: false, message: '步骤状态不合法' })
  }

  const startDate = normalizeOptionalDateForCreate(req.body.start_date)
  const dueDate = normalizeOptionalDateForCreate(req.body.due_date)
  if (!startDate.ok || !dueDate.ok) {
    return res.status(400).json({ success: false, message: '日期格式不正确，应为 YYYY-MM-DD' })
  }

  const imageUrls = sanitizeImageUrls(req.body.image_urls)

  try {
    const result = await pool.query(
      `INSERT INTO plan_step_templates
         (user_id, name, title, description, status, badge, badge_color, image_urls, location, start_date, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
       RETURNING *`,
      [
        req.user.id,
        name,
        title,
        req.body.description || '',
        status,
        req.body.badge || '',
        req.body.badge_color || '',
        JSON.stringify(imageUrls),
        req.body.location || '',
        startDate.value,
        dueDate.value
      ]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: '模板名称已存在，请更换一个名称' })
    }
    throw err
  }
})

// DELETE /api/plan-steps/templates/:id — 删除模板
router.delete('/templates/:id', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM plan_step_templates WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: '模板不存在' })
  }
  res.json({ success: true, message: '模板已删除' })
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

  const startDate = normalizeOptionalDateForCreate(start_date)
  const dueDate = normalizeOptionalDateForCreate(due_date)
  if (!startDate.ok || !dueDate.ok) {
    return res.status(400).json({ success: false, message: '日期格式不正确，应为 YYYY-MM-DD' })
  }

  const stepStatus = sanitizeStatus(status || 'pending')
  if (!stepStatus) {
    return res.status(400).json({ success: false, message: '步骤状态不合法' })
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

  const urlsJson = JSON.stringify(sanitizeImageUrls(image_urls))
  const completedAt = stepStatus === 'completed' ? new Date() : null

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
      dueDate.value,
      nextOrder,
      urlsJson,
      location || '',
      startDate.value,
      completedAt
    ]
  )
  res.status(201).json({ success: true, data: result.rows[0] })
})

// POST /api/plan-steps/generate — 按天/周/月批量生成步骤
router.post('/generate', async (req, res) => {
  const {
    plan_id,
    title,
    description,
    status,
    badge,
    badge_color,
    due_date,
    start_date,
    image_urls,
    location,
    recurrence
  } = req.body

  if (!plan_id || !String(title || '').trim()) {
    return res.status(400).json({ success: false, message: 'plan_id 和步骤标题不能为空' })
  }

  if (!(await canAccessPlan(plan_id, req.user.id))) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }

  const unit = String(recurrence?.unit || '').trim()
  const count = Number.parseInt(recurrence?.count, 10)
  const interval = Number.parseInt(recurrence?.interval, 10) || 1

  if (!RECURRENCE_UNIT_SET.has(unit)) {
    return res.status(400).json({ success: false, message: '自动生成周期不支持（仅支持 day/week/month）' })
  }
  if (!Number.isInteger(count) || count < 2 || count > 60) {
    return res.status(400).json({ success: false, message: '生成数量必须在 2 到 60 之间' })
  }
  if (!Number.isInteger(interval) || interval < 1 || interval > 30) {
    return res.status(400).json({ success: false, message: '生成间隔必须在 1 到 30 之间' })
  }

  const stepStatus = sanitizeStatus(status || 'pending')
  if (!stepStatus) {
    return res.status(400).json({ success: false, message: '步骤状态不合法' })
  }

  const startDate = normalizeOptionalDateForCreate(start_date)
  const dueDate = normalizeOptionalDateForCreate(due_date)
  if (!startDate.ok || !dueDate.ok) {
    return res.status(400).json({ success: false, message: '日期格式不正确，应为 YYYY-MM-DD' })
  }

  const imageUrls = sanitizeImageUrls(image_urls)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const nextOrder = await getNextSortOrder(client, plan_id)

    const baseTitle = String(title || '').trim()
    const baseDescription = description || ''
    const baseBadge = badge || ''
    const baseBadgeColor = badge_color || ''
    const baseLocation = location || ''

    const rows = []
    for (let idx = 0; idx < count; idx++) {
      const shiftAmount = idx * interval
      rows.push({
        title: baseTitle,
        description: baseDescription,
        status: stepStatus,
        badge: baseBadge,
        badge_color: baseBadgeColor,
        due_date: shiftDateByUnit(dueDate.value, unit, shiftAmount),
        start_date: shiftDateByUnit(startDate.value, unit, shiftAmount),
        sort_order: nextOrder + idx,
        image_urls: imageUrls,
        location: baseLocation
      })
    }

    const insertRes = await client.query(
      `INSERT INTO plan_steps
         (plan_id, user_id, title, description, status, badge, badge_color, due_date, start_date, sort_order, image_urls, location, completed_at)
       SELECT
         $1, $2,
         s.title,
         s.description,
         s.status,
         s.badge,
         s.badge_color,
         s.due_date,
         s.start_date,
         s.sort_order,
         s.image_urls,
         s.location,
         CASE WHEN s.status = 'completed' THEN NOW() ELSE NULL END
       FROM jsonb_to_recordset($3::jsonb) AS s(
         title text,
         description text,
         status varchar(20),
         badge text,
         badge_color text,
         due_date date,
         start_date date,
         sort_order integer,
         image_urls jsonb,
         location text
       )
       RETURNING *`,
      [plan_id, req.user.id, JSON.stringify(rows)]
    )

    await client.query('COMMIT')
    res.status(201).json({
      success: true,
      data: {
        created: insertRes.rows,
        count: insertRes.rows.length,
        recurrence: { unit, count, interval }
      }
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// PUT /api/plan-steps/:id — 更新步骤
router.put('/:id', async (req, res) => {
  const { title, description, status, badge, badge_color, image_url, image_urls, due_date, start_date, sort_order, location } = req.body

  const dueDateParsed = normalizeOptionalDateForUpdate(due_date)
  const startDateParsed = normalizeOptionalDateForUpdate(start_date)
  if (!dueDateParsed.ok || !startDateParsed.ok) {
    return res.status(400).json({ success: false, message: '日期格式不正确，应为 YYYY-MM-DD' })
  }

  if (status !== undefined && !sanitizeStatus(status)) {
    return res.status(400).json({ success: false, message: '步骤状态不合法' })
  }

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

  const urlsJson = image_urls !== undefined ? JSON.stringify(sanitizeImageUrls(image_urls)) : null

  // 是否显式传了这两个日期字段（undefined = 没传 = 保留原值，否则无论空还是有值都更新）
  const hasDueDate = dueDateParsed.provided
  const hasStartDate = startDateParsed.provided

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
      hasDueDate, dueDateParsed.value,    // $8, $9
      hasStartDate, startDateParsed.value,  // $10, $11
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
         LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $2 AND c.status = 'accepted'
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
