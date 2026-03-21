const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const notesRoutes = require('./routes/notes')
const calendarRoutes = require('./routes/calendar')
const adminRoutes = require('./routes/admin')
const expensesRoutes = require('./routes/expenses')
const expenseCategoriesRoutes = require('./routes/expense-categories')
const searchRoutes = require('./routes/search')
const uploadRoutes = require('./routes/upload')
const plansRoutes = require('./routes/plans')
const planStepsRoutes = require('./routes/plan-steps')
const pushRoutes = require('./routes/push')
const { errorLoggerMiddleware, requestLoggerMiddleware } = require('./utils/logger')
const { startScheduler } = require('./scheduler')

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173']

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(requestLoggerMiddleware)

// 静态文件：上传的图片
const path = require('path')
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mini Note API 运行中 🎉', time: new Date().toISOString() })
})

// API 路由
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/expense-categories', expenseCategoriesRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/plans', plansRoutes)
app.use('/api/plan-steps', planStepsRoutes)
app.use('/api/push', pushRoutes)

// 公开分享：获取基本信息（用于显示验证码输入页，必须 PIN）
const pool = require('./config/db')
app.get('/api/share/:token', async (req, res) => {
  const { token } = req.params
  const planRes = await pool.query(
    `SELECT p.id, p.title, p.icon, p.share_pin IS NOT NULL AS needs_pin,
            p.share_expires_at, u.nickname AS author_name
     FROM plans p
     JOIN users u ON u.id = p.user_id
     WHERE p.share_token = $1`,
    [token]
  )
  if (planRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '分享链接无效或已失效' })
  }
  const plan = planRes.rows[0]
  if (plan.share_expires_at && new Date(plan.share_expires_at) < new Date()) {
    return res.status(410).json({ success: false, message: '分享链接已过期', expired: true })
  }
  if (!plan.needs_pin) {
    return res.status(403).json({ success: false, message: '该分享链接未设置访问码，请联系分享者重新生成' })
  }
  res.json({
    success: true,
    data: {
      title: plan.title,
      icon: plan.icon,
      authorName: plan.author_name,
      needsPin: true,
      expiresAt: plan.share_expires_at
    }
  })
})

// 公开分享：验证 PIN 并返回完整计划内容
app.post('/api/share/:token/verify', async (req, res) => {
  const { token } = req.params
  const { pin } = req.body
  const planRes = await pool.query(
    `SELECT p.id, p.title, p.description, p.color, p.icon, p.status,
            p.share_pin, p.share_expires_at, u.nickname AS author_name
     FROM plans p
     JOIN users u ON u.id = p.user_id
     WHERE p.share_token = $1`,
    [token]
  )
  if (planRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '分享链接无效或已失效' })
  }
  const plan = planRes.rows[0]
  if (plan.share_expires_at && new Date(plan.share_expires_at) < new Date()) {
    return res.status(410).json({ success: false, message: '分享链接已过期', expired: true })
  }
  if (!plan.share_pin) {
    return res.status(403).json({ success: false, message: '该分享链接未设置访问码，请联系分享者重新生成' })
  }
  if (plan.share_pin !== String(pin || '')) {
    return res.status(401).json({ success: false, message: '访问码错误，请重新输入' })
  }
  const stepsRes = await pool.query(
    `SELECT id, title, description, status, badge, badge_color,
            due_date, start_date, image_urls, location, sort_order
     FROM plan_steps
     WHERE plan_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [plan.id]
  )
  const { share_pin, share_expires_at, ...planData } = plan
  res.json({ success: true, data: { ...planData, steps: stepsRes.rows } })
})

// 公开分享：切换步骤完成状态（无需登录）
app.patch('/api/share/:token/steps/:stepId/status', async (req, res) => {
  const { token, stepId } = req.params
  const { status, pin } = req.body
  const allowed = ['pending', 'in_progress', 'completed', 'skipped']
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: '无效状态' })
  }
  // 验证 token 对应的计划
  const planRes = await pool.query(
    'SELECT id, share_pin, share_expires_at FROM plans WHERE share_token = $1', [token]
  )
  if (planRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '分享链接无效' })
  }
  const { id: planId, share_pin, share_expires_at } = planRes.rows[0]
  if (share_expires_at && new Date(share_expires_at) < new Date()) {
    return res.status(410).json({ success: false, message: '分享链接已过期', expired: true })
  }
  if (!share_pin) {
    return res.status(403).json({ success: false, message: '该分享链接未设置访问码，请联系分享者重新生成' })
  }
  if (share_pin !== String(pin || '')) {
    return res.status(401).json({ success: false, message: '访问码错误，请重新输入' })
  }
  // 验证步骤属于该计划
  const checkRes = await pool.query(
    'SELECT id FROM plan_steps WHERE id = $1 AND plan_id = $2', [stepId, planId]
  )
  if (checkRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '步骤不存在' })
  }
  const completedAt = status === 'completed' ? new Date() : null
  const upd = await pool.query(
    `UPDATE plan_steps SET status = $1, completed_at = $2 WHERE id = $3
     RETURNING id, status, completed_at`,
    [status, completedAt, stepId]
  )
  res.json({ success: true, data: upd.rows[0] })
})

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' })
})

// 全局错误处理（带日志记录）
app.use(errorLoggerMiddleware)

function startServer() {
  return app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════╗
║   🌸 Mini Note API 已启动      ║
║   端口: ${PORT}                    ║
║   环境: ${process.env.NODE_ENV || 'development'}              ║
╚════════════════════════════════╝
  `)
    startScheduler()
  })
}

if (require.main === module) {
  startServer()
}

module.exports = app
module.exports.startServer = startServer
