/**
 * 系统日志工具
 * 将后端运行错误/事件写入 system_logs 表 + logs/ 文件
 */
const pool = require('../config/db')
const fs = require('fs')
const path = require('path')

// 确保 logs 目录存在
const LOGS_DIR = path.join(__dirname, '../logs')
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

/**
 * 写入日志文件（按天分割）
 */
function writeLogFile(level, message, extras = {}) {
  try {
    const now = new Date()
    const date = now.toISOString().slice(0, 10) // 2026-03-09
    const time = now.toISOString().replace('T', ' ').slice(0, 23) // 2026-03-09 14:24:41.123

    const parts = [
      `[${time}]`,
      `[${level.toUpperCase().padEnd(5)}]`,
      message,
    ]
    if (extras.route)       parts.push(`route=${extras.route}`)
    if (extras.method)      parts.push(`method=${extras.method}`)
    if (extras.statusCode)  parts.push(`status=${extras.statusCode}`)
    if (extras.userId)      parts.push(`userId=${extras.userId}`)
    if (extras.ip)          parts.push(`ip=${extras.ip}`)
    if (extras.detail)      parts.push(`\n  detail: ${extras.detail}`)
    if (extras.errorStack)  parts.push(`\n  stack: ${extras.errorStack}`)

    const line = parts.join('  ') + '\n'

    // 写入按日期分割的日志文件
    fs.appendFileSync(path.join(LOGS_DIR, `${date}.log`), line, 'utf8')

    // error 级别同时写入 error.log 永久日志
    if (level === 'error') {
      fs.appendFileSync(path.join(LOGS_DIR, 'error.log'), line, 'utf8')
    }
  } catch (e) {
    console.error('[Logger] 文件写入失败:', e.message)
  }
}

/**
 * 写入日志（数据库 + 文件）
 * @param { level, message, detail, route, method, statusCode, errorStack, userId, ip }
 */
async function writeLog({ level = 'error', message, detail, route, method, statusCode, errorStack, userId, ip }) {
  // 同步写入文件（确保即使 DB 挂了也有日志）
  writeLogFile(level, message, { detail, route, method, statusCode, errorStack, userId, ip })

  // 同时输出到控制台
  const consoleMsg = `[${level.toUpperCase()}] ${message}${detail ? ` | ${detail}` : ''}`
  if (level === 'error') console.error(consoleMsg)
  else if (level === 'warn') console.warn(consoleMsg)
  else console.log(consoleMsg)

  try {
    await pool.query(
      `INSERT INTO system_logs (level, message, route, method, status_code, error_stack, user_id, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [level, detail ? `${message} | ${detail}` : message, route || null, method || null, statusCode || null, errorStack || null, userId || null, ip || null]
    )
  } catch (err) {
    console.error('[Logger] 数据库日志写入失败:', err.message)
  }
}

const logger = {
  error: (message, extras = {}) => writeLog({ level: 'error', message, ...extras }),
  warn:  (message, extras = {}) => writeLog({ level: 'warn',  message, ...extras }),
  info:  (message, extras = {}) => writeLog({ level: 'info',  message, ...extras }),
}

/**
 * Express 全局错误日志中间件
 * 挂载到 app.use 末尾（在其他路由之后）
 */
function errorLoggerMiddleware(err, req, res, next) {
  const userId = req.user?.id || null
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null

  logger.error(err.message || '未知错误', {
    route: req.path,
    method: req.method,
    statusCode: err.status || 500,
    errorStack: err.stack,
    userId,
    ip
  })

  res.status(err.status || 500).json({ success: false, message: '服务器内部错误' })
}

/**
 * Express 请求日志中间件（仅记录 4xx/5xx）
 */
function requestLoggerMiddleware(req, res, next) {
  const originalJson = res.json.bind(res)
  res.json = function (body) {
    if (res.statusCode >= 400) {
      const userId = req.user?.id || null
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
      logger.warn(body?.message || `HTTP ${res.statusCode}`, {
        route: req.path,
        method: req.method,
        statusCode: res.statusCode,
        userId,
        ip
      })
    }
    return originalJson(body)
  }
  next()
}

module.exports = { logger, errorLoggerMiddleware, requestLoggerMiddleware }
