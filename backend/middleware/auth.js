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

    // 校验 token_version，若旧设备 token 已被新登录顶替则拒绝
    if (decoded.tv !== undefined) {
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
