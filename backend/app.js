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
