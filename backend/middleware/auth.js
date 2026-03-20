const jwt = require('jsonwebtoken')
const pool = require('../config/db')
require('dotenv').config()

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // 新版：基于 session_id 校验设备会话有效性
    if (decoded.sid) {
      const sessionResult = await pool.query(
        `SELECT revoked_at
         FROM user_sessions
         WHERE session_id = $1 AND user_id = $2
         LIMIT 1`,
        [decoded.sid, decoded.id]
      )

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({ success: false, message: '登录会话不存在，请重新登录', code: 'SESSION_INVALID' })
      }
      if (sessionResult.rows[0].revoked_at) {
        return res.status(401).json({ success: false, message: '该设备登录已失效，请重新登录', code: 'SESSION_REVOKED' })
      }

      // 仅在超过 5 分钟未更新时刷新活跃时间，降低写入压力
      await pool.query(
        `UPDATE user_sessions
         SET last_active_at = NOW()
         WHERE session_id = $1
           AND last_active_at < NOW() - INTERVAL '5 minutes'`,
        [decoded.sid]
      )
    } else if (decoded.tv !== undefined) {
      // 兼容旧版 token_version 令牌
      const result = await pool.query(
        'SELECT token_version FROM users WHERE id = $1',
        [decoded.id]
      )
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: '用户不存在' })
      }
      if (result.rows[0].token_version !== decoded.tv) {
        return res.status(401).json({ success: false, message: '账号已在其他设备登录，请重新登录', code: 'SESSION_REPLACED' })
      }
    }

    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '令牌已过期，请重新登录' })
    }
    return res.status(401).json({ success: false, message: '无效的认证令牌' })
  }
}

module.exports = authMiddleware

