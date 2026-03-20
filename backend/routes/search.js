const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

const PLAN_STATUS_SET = new Set(['active', 'completed', 'paused'])
const PLAN_STEP_STATUS_SET = new Set(['pending', 'in_progress', 'completed', 'skipped'])
const NOTE_STATUS_SET = new Set(['archived', 'unarchived'])
const STEP_STATUS_ALIAS = {
  step_completed: 'completed'
}
const ALL_STATUS_SET = new Set([
  ...PLAN_STATUS_SET,
  ...PLAN_STEP_STATUS_SET,
  ...NOTE_STATUS_SET,
  ...Object.keys(STEP_STATUS_ALIAS)
])

function parseBoolean(value) {
  if (value === undefined || value === null || value === '') return null
  if (value === true || value === 'true' || value === '1' || value === 1) return true
  if (value === false || value === 'false' || value === '0' || value === 0) return false
  return null
}

function parseDateString(value) {
  if (!value) return null
  const str = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const [year, month, day] = str.split('-').map(num => parseInt(num, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  if (!isValid) return null
  return str
}

function parseTags(value) {
  if (value === undefined || value === null || value === '') return []
  const rawItems = Array.isArray(value) ? value : [value]
  const normalized = rawItems
    .flatMap(item => String(item).split(','))
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 10)
  return [...new Set(normalized)]
}

function parseLimit(value) {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 10
  return Math.min(parsed, 50)
}

function parseStatus(value) {
  if (!value) return ''
  return String(value).trim().toLowerCase()
}

function resolveSearchScope({ tags, pinned, status }) {
  const scope = new Set(['notes', 'plans', 'expenses'])
  const intersectWith = (allowed) => {
    for (const moduleName of [...scope]) {
      if (!allowed.has(moduleName)) scope.delete(moduleName)
    }
  }

  if (tags.length > 0 || pinned !== null) {
    intersectWith(new Set(['notes']))
  }

  if (status) {
    if (NOTE_STATUS_SET.has(status)) {
      intersectWith(new Set(['notes']))
    } else if (PLAN_STATUS_SET.has(status) || PLAN_STEP_STATUS_SET.has(status) || STEP_STATUS_ALIAS[status]) {
      intersectWith(new Set(['plans']))
    }
  }

  return scope
}

async function searchNotes({
  userId,
  keyword,
  tags,
  dateFrom,
  dateTo,
  status,
  pinned,
  limit
}) {
  let where = 'WHERE n.user_id = $1'
  const params = [userId]
  let paramIdx = 2

  if (keyword) {
    where += `
      AND (
        n.title ILIKE $${paramIdx}
        OR n.content ILIKE $${paramIdx}
        OR EXISTS (
          SELECT 1
          FROM unnest(n.tags) AS t(tag_value)
          WHERE t.tag_value ILIKE $${paramIdx}
        )
      )
    `
    params.push(`%${keyword}%`)
    paramIdx++
  }

  if (tags.length > 0) {
    where += `
      AND EXISTS (
        SELECT 1
        FROM unnest(n.tags) AS t(tag_value)
        WHERE t.tag_value = ANY($${paramIdx}::text[])
      )
    `
    params.push(tags)
    paramIdx++
  }

  if (status === 'archived') {
    where += ' AND n.is_archived = TRUE'
  } else if (status === 'unarchived') {
    where += ' AND n.is_archived = FALSE'
  }

  if (pinned !== null) {
    where += ` AND n.is_pinned = $${paramIdx}`
    params.push(pinned)
    paramIdx++
  }

  if (dateFrom) {
    where += ` AND n.updated_at >= $${paramIdx}::date`
    params.push(dateFrom)
    paramIdx++
  }

  if (dateTo) {
    where += ` AND n.updated_at < ($${paramIdx}::date + INTERVAL '1 day')`
    params.push(dateTo)
    paramIdx++
  }

  const query = `
    SELECT
      n.id,
      n.title,
      n.content,
      n.color,
      n.tags,
      n.is_pinned,
      n.is_archived,
      n.created_at,
      n.updated_at,
      COUNT(*) OVER()::int AS total_count
    FROM notes n
    ${where}
    ORDER BY n.is_pinned DESC, n.updated_at DESC
    LIMIT $${paramIdx}
  `
  params.push(limit)

  const result = await pool.query(query, params)
  const total = result.rows.length ? Number(result.rows[0].total_count) : 0
  const items = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    tags: row.tags || [],
    is_pinned: row.is_pinned,
    is_archived: row.is_archived,
    created_at: row.created_at,
    updated_at: row.updated_at
  }))

  return { total, items }
}

async function searchPlans({
  userId,
  keyword,
  dateFrom,
  dateTo,
  status,
  limit
}) {
  const normalizedStepStatus = STEP_STATUS_ALIAS[status] || status

  let where = `
    WHERE (
      p.user_id = $1
      OR EXISTS (
        SELECT 1
        FROM plan_collaborators c
        WHERE c.plan_id = p.id
          AND c.user_id = $1
          AND c.status = 'accepted'
      )
    )
  `

  const params = [userId]
  let paramIdx = 2

  if (keyword) {
    where += `
      AND (
        p.title ILIKE $${paramIdx}
        OR p.description ILIKE $${paramIdx}
        OR EXISTS (
          SELECT 1
          FROM plan_steps ps_search
          WHERE ps_search.plan_id = p.id
            AND (
              ps_search.title ILIKE $${paramIdx}
              OR ps_search.description ILIKE $${paramIdx}
              OR COALESCE(ps_search.location, '') ILIKE $${paramIdx}
            )
        )
      )
    `
    params.push(`%${keyword}%`)
    paramIdx++
  }

  if (status) {
    if (PLAN_STATUS_SET.has(status)) {
      where += ` AND p.status = $${paramIdx}`
      params.push(status)
      paramIdx++
    } else if (PLAN_STEP_STATUS_SET.has(normalizedStepStatus)) {
      where += `
        AND EXISTS (
          SELECT 1
          FROM plan_steps ps_status
          WHERE ps_status.plan_id = p.id
            AND ps_status.status = $${paramIdx}
        )
      `
      params.push(normalizedStepStatus)
      paramIdx++
    }
  }

  if (dateFrom) {
    where += ` AND p.updated_at >= $${paramIdx}::date`
    params.push(dateFrom)
    paramIdx++
  }

  if (dateTo) {
    where += ` AND p.updated_at < ($${paramIdx}::date + INTERVAL '1 day')`
    params.push(dateTo)
    paramIdx++
  }

  const query = `
    SELECT plan_rows.*, COUNT(*) OVER()::int AS total_count
    FROM (
      SELECT
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.color,
        p.icon,
        p.status,
        p.created_at,
        p.updated_at,
        COUNT(ps.id)::int AS total_steps,
        COUNT(ps.id) FILTER (WHERE ps.status = 'completed')::int AS done_steps,
        CASE WHEN p.user_id = $1 THEN 'owner' ELSE 'collaborator' END AS role,
        owner_user.nickname AS owner_name
      FROM plans p
      JOIN users owner_user ON owner_user.id = p.user_id
      LEFT JOIN plan_steps ps ON ps.plan_id = p.id
      ${where}
      GROUP BY p.id, owner_user.nickname
    ) plan_rows
    ORDER BY plan_rows.updated_at DESC
    LIMIT $${paramIdx}
  `
  params.push(limit)

  const result = await pool.query(query, params)
  const total = result.rows.length ? Number(result.rows[0].total_count) : 0
  const items = result.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    color: row.color,
    icon: row.icon,
    status: row.status,
    total_steps: row.total_steps,
    done_steps: row.done_steps,
    role: row.role,
    owner_name: row.owner_name,
    created_at: row.created_at,
    updated_at: row.updated_at
  }))

  return { total, items }
}

async function searchExpenses({
  userId,
  keyword,
  dateFrom,
  dateTo,
  limit
}) {
  let where = 'WHERE e.user_id = $1'
  const params = [userId]
  let paramIdx = 2

  if (keyword) {
    where += `
      AND (
        e.note ILIKE $${paramIdx}
        OR COALESCE(ec.name, '') ILIKE $${paramIdx}
      )
    `
    params.push(`%${keyword}%`)
    paramIdx++
  }

  if (dateFrom) {
    where += ` AND e.expense_date >= $${paramIdx}::date`
    params.push(dateFrom)
    paramIdx++
  }

  if (dateTo) {
    where += ` AND e.expense_date < ($${paramIdx}::date + INTERVAL '1 day')`
    params.push(dateTo)
    paramIdx++
  }

  const query = `
    SELECT
      e.id,
      e.category_id,
      e.amount,
      e.note,
      e.expense_date,
      e.created_at,
      e.updated_at,
      ec.name AS category_name,
      ec.icon AS category_icon,
      ec.color AS category_color,
      COUNT(*) OVER()::int AS total_count
    FROM expenses e
    LEFT JOIN expense_categories ec ON ec.id = e.category_id
    ${where}
    ORDER BY e.expense_date DESC, e.created_at DESC
    LIMIT $${paramIdx}
  `
  params.push(limit)

  const result = await pool.query(query, params)
  const total = result.rows.length ? Number(result.rows[0].total_count) : 0
  const items = result.rows.map(row => ({
    id: row.id,
    category_id: row.category_id,
    amount: Number(row.amount),
    note: row.note,
    expense_date: row.expense_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category_name: row.category_name,
    category_icon: row.category_icon,
    category_color: row.category_color
  }))

  return { total, items }
}

router.get('/global', authMiddleware, async (req, res) => {
  const keyword = String(req.query.q || req.query.search || '').trim().slice(0, 120)
  const tags = parseTags(req.query.tags || req.query.tag)
  const status = parseStatus(req.query.status)
  const pinned = parseBoolean(req.query.pinned)
  const dateFrom = parseDateString(req.query.date_from || req.query.from || '')
  const dateTo = parseDateString(req.query.date_to || req.query.to || '')
  const limit = parseLimit(req.query.limit || req.query.per_module_limit)

  if ((req.query.date_from || req.query.from) && !dateFrom) {
    return res.status(400).json({ success: false, message: '开始日期格式不正确，应为 YYYY-MM-DD' })
  }
  if ((req.query.date_to || req.query.to) && !dateTo) {
    return res.status(400).json({ success: false, message: '结束日期格式不正确，应为 YYYY-MM-DD' })
  }
  if (req.query.pinned !== undefined && pinned === null) {
    return res.status(400).json({ success: false, message: '置顶筛选值不支持，请使用 true 或 false' })
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return res.status(400).json({ success: false, message: '日期区间不合法：开始日期不能晚于结束日期' })
  }
  if (status && !ALL_STATUS_SET.has(status)) {
    return res.status(400).json({ success: false, message: '状态筛选值不支持' })
  }

  const scopeSet = resolveSearchScope({ tags, pinned, status })
  const scope = ['notes', 'plans', 'expenses'].filter(moduleName => scopeSet.has(moduleName))

  try {
    const notesPromise = scopeSet.has('notes')
      ? searchNotes({
          userId: req.user.id,
          keyword,
          tags,
          dateFrom,
          dateTo,
          status,
          pinned,
          limit
        })
      : Promise.resolve({ total: 0, items: [] })

    const plansPromise = scopeSet.has('plans')
      ? searchPlans({
          userId: req.user.id,
          keyword,
          dateFrom,
          dateTo,
          status,
          limit
        })
      : Promise.resolve({ total: 0, items: [] })

    const expensesPromise = scopeSet.has('expenses')
      ? searchExpenses({
          userId: req.user.id,
          keyword,
          dateFrom,
          dateTo,
          limit
        })
      : Promise.resolve({ total: 0, items: [] })

    const [notesResult, plansResult, expensesResult] = await Promise.all([
      notesPromise,
      plansPromise,
      expensesPromise
    ])

    res.json({
      success: true,
      data: {
        notes: notesResult.items,
        plans: plansResult.items,
        expenses: expensesResult.items,
        summary: {
          notes: notesResult.total,
          plans: plansResult.total,
          expenses: expensesResult.total,
          total: notesResult.total + plansResult.total + expensesResult.total
        },
        scope,
        filters: {
          q: keyword,
          tags,
          status,
          pinned,
          date_from: dateFrom,
          date_to: dateTo,
          limit
        }
      }
    })
  } catch (err) {
    console.error('全局搜索错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

module.exports = router
