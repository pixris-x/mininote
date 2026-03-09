const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

// 获取当前用户信息
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, nickname, avatar_color, theme, bio, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('获取用户信息错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 更新用户信息
router.put('/profile', authMiddleware, async (req, res) => {
  const { nickname, avatar_color, theme, bio } = req.body

  const validThemes = ['pink', 'mint', 'lavender', 'peach', 'sky', 'lemon']
  if (theme && !validThemes.includes(theme)) {
    return res.status(400).json({ success: false, message: '无效的主题色' })
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET nickname = COALESCE($1, nickname),
           avatar_color = COALESCE($2, avatar_color),
           theme = COALESCE($3, theme),
           bio = COALESCE($4, bio)
       WHERE id = $5
       RETURNING id, username, email, nickname, avatar_color, theme, bio, is_admin, created_at`,
      [nickname, avatar_color, theme, bio, req.user.id]
    )
    res.json({ success: true, message: '更新成功', data: result.rows[0] })
  } catch (err) {
    console.error('更新用户信息错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 修改密码
router.put('/password', authMiddleware, async (req, res) => {
  const bcrypt = require('bcryptjs')
  const { old_password, new_password } = req.body

  if (!old_password || !new_password) {
    return res.status(400).json({ success: false, message: '请提供旧密码和新密码' })
  }
  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: '新密码长度不能少于6位' })
  }

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    const user = result.rows[0]
    const isValid = await bcrypt.compare(old_password, user.password_hash)

    if (!isValid) {
      return res.status(401).json({ success: false, message: '旧密码不正确' })
    }

    const newHash = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id])
    res.json({ success: true, message: '密码修改成功' })
  } catch (err) {
    console.error('修改密码错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

module.exports = router
