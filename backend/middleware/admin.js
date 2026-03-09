const pool = require('../config/db')

/**
 * 管理员权限中间件（须在 authMiddleware 之后使用）
 */
const adminMiddleware = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id])
    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, message: '无管理员权限' })
    }
    next()
  } catch (err) {
    res.status(500).json({ success: false, message: '权限验证失败' })
  }
}

module.exports = adminMiddleware
