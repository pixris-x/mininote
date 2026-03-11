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
const uploadRoutes = require('./routes/upload')
const plansRoutes = require('./routes/plans')
const planStepsRoutes = require('./routes/plan-steps')
const { errorLoggerMiddleware, requestLoggerMiddleware } = require('./utils/logger')

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
  res.json({ status: 'ok', message: 'MiniList API 运行中 🎉', time: new Date().toISOString() })
})

// API 路由
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/expense-categories', expenseCategoriesRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/plans', plansRoutes)
app.use('/api/plan-steps', planStepsRoutes)

// 公开分享只读接口（无需登录）
const pool = require('./config/db')
app.get('/api/share/:token', async (req, res) => {
  const { token } = req.params
  const planRes = await pool.query(
    `SELECT p.id, p.title, p.description, p.color, p.icon, p.status,
            u.nickname AS author_name
     FROM plans p
     JOIN users u ON u.id = p.user_id
     WHERE p.share_token = $1`,
    [token]
  )
  if (planRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '分享链接无效或已失效' })
  }

  const plan = planRes.rows[0]
  const stepsRes = await pool.query(
    `SELECT id, title, description, status, badge, badge_color,
            due_date, start_date, image_urls, location, sort_order
     FROM plan_steps
     WHERE plan_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [plan.id]
  )

  res.json({ success: true, data: { ...plan, steps: stepsRes.rows } })
})

// 公开分享：切换步骤完成状态（无需登录）
app.patch('/api/share/:token/steps/:stepId/status', async (req, res) => {
  const { token, stepId } = req.params
  const { status } = req.body
  const allowed = ['pending', 'in_progress', 'completed', 'skipped']
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: '无效状态' })
  }
  // 验证 token 对应的计划
  const planRes = await pool.query(
    'SELECT id FROM plans WHERE share_token = $1', [token]
  )
  if (planRes.rows.length === 0) {
    return res.status(404).json({ success: false, message: '分享链接无效' })
  }
  const planId = planRes.rows[0].id
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

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════╗
║   🌸 MiniList API 已启动       ║
║   端口: ${PORT}                    ║
║   环境: ${process.env.NODE_ENV || 'development'}              ║
╚════════════════════════════════╝
  `)
})

module.exports = app
