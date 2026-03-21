const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')
const webpush = require('web-push')
const { sendNotificationEmail } = require('../utils/email')
const { DEFAULT_PLAN_ICON, sanitizePlanIcon, toPlanIconKey } = require('../utils/plan-icons')
const { createUserNotification, NOTIFICATION_TYPES } = require('../utils/notifications')
const { normalizeShareMaxVisits, getShareUnavailableResponse, consumeShareVisit } = require('../utils/share-access')

// 发送推送通知 + 邮件给指定用户
async function notifyUser(userId, payload) {
  // Push 通知
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || `mailto:${process.env.EMAIL_FROM || 'noreply@example.com'}`
  if (publicKey && privateKey) {
    try {
      const subs = await pool.query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id=$1',
        [userId]
      )
      if (subs.rowCount > 0) {
        webpush.setVapidDetails(subject, publicKey, privateKey)
        await Promise.allSettled(
          subs.rows.map(sub =>
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify(payload)
            ).catch(() => {})
          )
        )
      }
    } catch (_) {}
  }

  // 邮件通知
  try {
    const userRes = await pool.query('SELECT email FROM users WHERE id=$1', [userId])
    const email = userRes.rows[0]?.email
    if (email) {
      sendNotificationEmail(email, payload.title, payload.body)
    }
  } catch (_) {}

  // 通知中心落库
  try {
    await createUserNotification({
      userId,
      type: payload.type || NOTIFICATION_TYPES.PUSH,
      source: payload.source || 'plans',
      title: payload.title || '新通知',
      content: payload.body || '',
      linkUrl: payload.url || '/plans',
      payload
    })
  } catch (_) {}
}

// 所有接口需要登录
router.use(authMiddleware)

// 判断用户对计划的权限：'owner' | 'collaborator' | null
async function getPlanRole(planId, userId) {
  const res = await pool.query(
    `SELECT
       CASE WHEN p.user_id = $2 THEN 'owner'
            WHEN c.id IS NOT NULL THEN 'collaborator'
            ELSE NULL
       END AS role
     FROM plans p
     LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $2 AND c.status = 'accepted'
     WHERE p.id = $1`,
    [planId, userId]
  )
  return res.rows[0]?.role || null
}

// GET /api/plans — 获取用户的所有计划（自己的 + 协作的）
router.get('/', async (req, res) => {
  const { status } = req.query
  let query = `
    SELECT
      p.*,
      COUNT(ps.id)                                          AS total_steps,
      COUNT(ps.id) FILTER (WHERE ps.status = 'completed')  AS done_steps,
      CASE WHEN p.user_id = $1 THEN 'owner' ELSE 'collaborator' END AS role,
      ou.nickname AS owner_name
    FROM plans p
    LEFT JOIN plan_steps ps ON ps.plan_id = p.id
    LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $1 AND c.status = 'accepted'
    LEFT JOIN users ou ON ou.id = p.user_id
    WHERE (p.user_id = $1 OR c.user_id = $1)
  `
  const params = [req.user.id]
  if (status) {
    query += ` AND p.status = $2`
    params.push(status)
  }
  query += ` GROUP BY p.id, ou.nickname ORDER BY p.sort_order ASC, p.created_at DESC`

  const result = await pool.query(query, params)
  res.json({ success: true, data: result.rows })
})

// GET /api/plans/invites — 获取当前用户的待处理邀请
router.get('/invites', async (req, res) => {
  const result = await pool.query(
    `SELECT c.id, c.plan_id, c.added_at,
            p.title AS plan_title, p.icon AS plan_icon, p.color AS plan_color,
            ou.nickname AS owner_name, ou.avatar_color AS owner_avatar_color
     FROM plan_collaborators c
     JOIN plans p ON p.id = c.plan_id
     JOIN users ou ON ou.id = p.user_id
     WHERE c.user_id = $1 AND c.status = 'pending'
     ORDER BY c.added_at DESC`,
    [req.user.id]
  )
  res.json({ success: true, data: result.rows })
})

// GET /api/plans/:id — 获取单个计划（含所有步骤 + 协作者列表）
router.get('/:id', async (req, res) => {
  const role = await getPlanRole(req.params.id, req.user.id)
  if (!role) {
    return res.status(404).json({ success: false, message: '计划不存在' })
  }

  const [planRes, stepsRes, collabRes] = await Promise.all([
    pool.query(
      `SELECT p.*,
        COUNT(ps.id)                                          AS total_steps,
        COUNT(ps.id) FILTER (WHERE ps.status = 'completed')  AS done_steps
       FROM plans p
       LEFT JOIN plan_steps ps ON ps.plan_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [req.params.id]
    ),
    pool.query(
      `SELECT * FROM plan_steps
       WHERE plan_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [req.params.id]
    ),
    pool.query(
      `SELECT u.id, u.username, u.nickname, u.avatar_color
       FROM plan_collaborators c
       JOIN users u ON u.id = c.user_id
       WHERE c.plan_id = $1
       ORDER BY c.added_at`,
      [req.params.id]
    )
  ])

  res.json({
    success: true,
    data: {
      ...planRes.rows[0],
      role,
      steps: stepsRes.rows,
      collaborators: collabRes.rows
    }
  })
})

// POST /api/plans — 创建计划
router.post('/', async (req, res) => {
  const { title, description, color, icon, status } = req.body
  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: '计划标题不能为空' })
  }
  const hasIconField = Object.prototype.hasOwnProperty.call(req.body, 'icon')
  let iconValue = DEFAULT_PLAN_ICON
  if (hasIconField) {
    const raw = String(icon ?? '').trim()
    if (!raw) {
      return res.status(400).json({ success: false, message: '计划图标不能为空' })
    }
    const normalized = toPlanIconKey(icon)
    if (!normalized) {
      return res.status(400).json({ success: false, message: '计划图标不合法' })
    }
    iconValue = normalized
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
      iconValue,
      status || 'active'
    ]
  )
  res.status(201).json({ success: true, data: { ...result.rows[0], total_steps: 0, done_steps: 0, steps: [] } })
})

// PUT /api/plans/:id — 更新计划（owner + collaborator 都可以）
router.put('/:id', async (req, res) => {
  const { title, description, color, icon, status, sort_order } = req.body
  let normalizedIcon = null
  if (Object.prototype.hasOwnProperty.call(req.body, 'icon')) {
    const raw = String(icon ?? '').trim()
    if (!raw) {
      return res.status(400).json({ success: false, message: '计划图标不能为空' })
    }
    normalizedIcon = toPlanIconKey(icon)
    if (!normalizedIcon) {
      return res.status(400).json({ success: false, message: '计划图标不合法' })
    }
  }

  const role = await getPlanRole(req.params.id, req.user.id)
  if (!role) {
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
     WHERE id = $7
     RETURNING *`,
    [title, description, color, normalizedIcon, status, sort_order, req.params.id]
  )
  res.json({ success: true, data: result.rows[0] })
})

// DELETE /api/plans/:id — 删除计划（仅 owner）
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

// ── 协作者管理（仅 owner 可操作） ───────────────────────────────

// POST /api/plans/:id/collaborators — 邀请协作者（按用户名搜索）
router.post('/:id/collaborators', async (req, res) => {
  const { username } = req.body
  if (!username?.trim()) {
    return res.status(400).json({ success: false, message: '请输入用户名' })
  }

  // 验证是 owner
  const ownerCheck = await pool.query(
    'SELECT p.id, p.title, u.nickname AS owner_name FROM plans p JOIN users u ON u.id = p.user_id WHERE p.id = $1 AND p.user_id = $2',
    [req.params.id, req.user.id]
  )
  if (ownerCheck.rows.length === 0) {
    return res.status(403).json({ success: false, message: '只有计划创建者可以邀请协作者' })
  }
  const plan = ownerCheck.rows[0]

  // 找到目标用户
  const userRes = await pool.query(
    'SELECT id, username, nickname, avatar_color FROM users WHERE username = $1',
    [username.trim()]
  )
  if (userRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '用户不存在' })
  }

  const targetUser = userRes.rows[0]
  if (targetUser.id === req.user.id) {
    return res.status(400).json({ success: false, message: '不能邀请自己' })
  }

  // 检查是否已经是协作者
  const exists = await pool.query(
    'SELECT id FROM plan_collaborators WHERE plan_id = $1 AND user_id = $2',
    [req.params.id, targetUser.id]
  )
  if (exists.rows.length > 0) {
    return res.status(409).json({ success: false, message: '该用户已经是协作者' })
  }

  await pool.query(
    'INSERT INTO plan_collaborators (plan_id, user_id) VALUES ($1, $2)',
    [req.params.id, targetUser.id]
  )

  // 发送推送通知给被邀请用户
  notifyUser(targetUser.id, {
    title: '🤝 你有新的协作邀请',
    body: `${plan.owner_name} 邀请你协作计划「${plan.title}」`,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    url: '/plans'
  })

  res.status(201).json({
    success: true,
    data: { id: targetUser.id, username: targetUser.username, nickname: targetUser.nickname, avatar_color: targetUser.avatar_color }
  })
})

// DELETE /api/plans/:id/collaborators/:userId — 移除协作者（仅 owner）
router.delete('/:id/collaborators/:userId', async (req, res) => {
  const ownerCheck = await pool.query(
    'SELECT p.id, p.title FROM plans p WHERE p.id = $1 AND p.user_id = $2',
    [req.params.id, req.user.id]
  )
  if (ownerCheck.rows.length === 0) {
    return res.status(403).json({ success: false, message: '只有计划创建者可以管理协作者' })
  }

  const result = await pool.query(
    'DELETE FROM plan_collaborators WHERE plan_id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.params.userId]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: '协作者不存在' })
  }

  // 通知被移除的用户
  const planTitle = ownerCheck.rows[0].title
  notifyUser(parseInt(req.params.userId), {
    title: '📋 协作变更通知',
    body: `你已被移出计划「${planTitle}」的协作`,
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    url: '/plans'
  })

  res.json({ success: true, message: '已移除协作者' })
})

// DELETE /api/plans/:id/leave — 协作者主动退出
router.delete('/:id/leave', async (req, res) => {
  const result = await pool.query(
    'DELETE FROM plan_collaborators WHERE plan_id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: '你不是该计划的协作者' })
  }
  res.json({ success: true, message: '已退出协作' })
})


// POST /api/plans/:id/collaborators/accept — 接受邀请
router.post('/:id/collaborators/accept', async (req, res) => {
  const result = await pool.query(
    `UPDATE plan_collaborators SET status = 'accepted'
     WHERE plan_id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id`,
    [req.params.id, req.user.id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: '邀请不存在或已处理' })
  }

  // 通知计划创建者
  const planRes = await pool.query(
    `SELECT p.title, p.user_id, u.nickname AS accepter_name
     FROM plans p, users u
     WHERE p.id = $1 AND u.id = $2`,
    [req.params.id, req.user.id]
  )
  if (planRes.rows[0]) {
    const { title, user_id, accepter_name } = planRes.rows[0]
    notifyUser(user_id, {
      title: '✅ 协作邀请已接受',
      body: `${accepter_name} 接受了计划「${title}」的协作邀请`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      url: '/plans'
    })
  }

  res.json({ success: true, message: '已接受邀请' })
})

// POST /api/plans/:id/collaborators/reject — 拒绝邀请
router.post('/:id/collaborators/reject', async (req, res) => {
  const result = await pool.query(
    `DELETE FROM plan_collaborators
     WHERE plan_id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id`,
    [req.params.id, req.user.id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: '邀请不存在或已处理' })
  }
  res.json({ success: true, message: '已拒绝邀请' })
})

// POST /api/plans/:id/share — 生成分享 token（每次调用都重新生成 PIN 和过期时间）
const crypto = require('crypto')
router.post('/:id/share', async (req, res) => {
  const { expiresIn = 7 } = req.body // 天数，0 表示永久
  const normalizedMaxVisits = normalizeShareMaxVisits(req.body.maxVisits ?? 0)
  if (normalizedMaxVisits.error) {
    return res.status(400).json({ success: false, message: normalizedMaxVisits.error })
  }

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
     SET share_token = $1,
         share_pin = $2,
         share_expires_at = $3,
         share_max_visits = $4,
         share_visit_count = 0,
         share_last_visited_at = NULL
     WHERE id = $5 AND user_id = $6`,
    [token, pin, expiresAt, normalizedMaxVisits.value, req.params.id, req.user.id]
  )

  res.json({
    success: true,
    token,
    pin,
    expiresAt,
    maxVisits: normalizedMaxVisits.value,
    visitCount: 0,
    lastVisitedAt: null
  })
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
    `UPDATE plans
     SET share_token = NULL,
         share_pin = NULL,
         share_expires_at = NULL,
         share_max_visits = NULL,
         share_visit_count = 0,
         share_last_visited_at = NULL
     WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  )
  res.json({ success: true, message: '分享已撤销' })
})

// POST /api/plans/import-share — 从分享链接导入计划（需要登录）
router.post('/import-share', async (req, res) => {
  const { token, pin } = req.body
  if (!token) {
    return res.status(400).json({ success: false, message: '缺少分享令牌' })
  }

  const planRes = await pool.query(
    `SELECT p.id, p.title, p.description, p.color, p.icon,
            p.share_pin, p.share_expires_at, p.share_max_visits, p.share_visit_count
     FROM plans p
     WHERE p.share_token = $1`,
    [token]
  )

  if (planRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '分享链接无效或已失效' })
  }

  const src = planRes.rows[0]

  const unavailable = getShareUnavailableResponse(src)
  if (unavailable) {
    return res.status(unavailable.status).json(unavailable.body)
  }

  if (!src.share_pin) {
    return res.status(403).json({ success: false, message: '该分享链接未设置访问码，请联系分享者重新生成' })
  }

  if (src.share_pin !== String(pin || '')) {
    return res.status(401).json({ success: false, message: '访问码错误' })
  }

  const visitStats = await consumeShareVisit(pool, src.id)
  if (!visitStats) {
    return res.status(410).json({ success: false, message: '分享链接访问次数已达上限', exhausted: true })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const stepsRes = await client.query(
      `SELECT title, description, badge, badge_color, due_date, start_date, image_urls, location, sort_order
       FROM plan_steps
       WHERE plan_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [src.id]
    )

    const newPlanRes = await client.query(
      `INSERT INTO plans (user_id, title, description, color, icon, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [req.user.id, src.title, src.description || '', src.color, sanitizePlanIcon(src.icon, DEFAULT_PLAN_ICON)]
    )
    const newPlan = newPlanRes.rows[0]

    if (stepsRes.rows.length > 0) {
      const stepPayload = stepsRes.rows.map((s, i) => ({
        title: s.title,
        description: s.description || '',
        badge: s.badge || '',
        badge_color: s.badge_color || '',
        due_date: s.due_date || null,
        start_date: s.start_date || null,
        sort_order: s.sort_order || (i + 1),
        image_urls: Array.isArray(s.image_urls) ? s.image_urls : [],
        location: s.location || ''
      }))

      await client.query(
        `INSERT INTO plan_steps
           (plan_id, user_id, title, description, status, badge, badge_color,
            due_date, start_date, sort_order, image_urls, location)
         SELECT
           $1, $2,
           s.title,
           s.description,
           'pending',
           s.badge,
           s.badge_color,
           s.due_date,
           s.start_date,
           s.sort_order,
           s.image_urls,
           s.location
         FROM jsonb_to_recordset($3::jsonb) AS s(
           title text,
           description text,
           badge text,
           badge_color text,
           due_date date,
           start_date date,
           sort_order integer,
           image_urls jsonb,
           location text
         )`,
        [newPlan.id, req.user.id, JSON.stringify(stepPayload)]
      )
    }

    await client.query('COMMIT')
    res.json({
      success: true,
      data: { ...newPlan, total_steps: stepsRes.rows.length, done_steps: 0, steps: [] }
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('导入分享计划失败:', err)
    res.status(500).json({ success: false, message: '导入失败，请稍后重试' })
  } finally {
    client.release()
  }
})

module.exports = router
