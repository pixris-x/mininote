const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const { sendResetPasswordEmail } = require('../utils/email')
const { logger } = require('../utils/logger')
require('dotenv').config()

// 注册
router.post('/register', async (req, res) => {
  const { username, email, password, nickname } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: '用户名、邮箱和密码为必填项' })
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: '密码长度不能少于6位' })
  }

  try {
    const usernameCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    )
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: '该用户名已被使用', field: 'username' })
    }

    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: '该邮箱已被注册', field: 'email' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const colors = ['#FFB3C6', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#E2F0CB', '#FF9AA2']
    const avatarColor = colors[Math.floor(Math.random() * colors.length)]

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, nickname, avatar_color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, nickname, avatar_color, theme, bio, is_admin, created_at`,
      [username, email, passwordHash, nickname || username, avatarColor]
    )

    const user = result.rows[0]
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    res.status(201).json({ success: true, message: '注册成功', data: { user, token } })
  } catch (err) {
    console.error('注册错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码为必填项' })
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: '账号不存在，请检查用户名或邮筱' })
    }

    const user = result.rows[0]
    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return res.status(401).json({ success: false, message: '密码错误，请重新输入' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    const { password_hash, ...userInfo } = user
    res.json({ success: true, message: '登录成功', data: { user: userInfo, token } })
  } catch (err) {
    console.error('登录错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 发送忘记密码验证码
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ success: false, message: '请输入邮箱' })
  }

  try {
    // 查询用户是否存在
    const result = await pool.query('SELECT id, username FROM users WHERE email = $1', [email])
    // 无论是否存在都返回成功，防止枚举邮箱
    if (result.rows.length === 0) {
      return res.json({ success: true, message: '如果该邮箱已注册，验证码将发送至你的邮箱' })
    }

    const user = result.rows[0]

    // 限制频率：同一邮箱 1 分钟内只能发一次
    const recent = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute' AND used = FALSE`,
      [email]
    )
    if (recent.rows.length > 0) {
      return res.status(429).json({ success: false, message: '发送太频繁，请 1 分钟后再试' })
    }

    // 让旧验证码失效
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE email = $1 AND used = FALSE`,
      [email]
    )

    // 生成 6 位数字验证码
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 分钟

    await pool.query(
      `INSERT INTO password_reset_tokens (email, code, expires_at) VALUES ($1, $2, $3)`,
      [email, code, expiresAt]
    )

    await sendResetPasswordEmail(email, code, user.username)

    res.json({ success: true, message: '验证码已发送，请查收邮件（15分钟内有效）' })
  } catch (err) {
    // 区分邮件发送失败 vs 数据库错误
    const isEmailError = err.message?.includes('邮件发送失败') || err.message?.includes('resend')
    const detail = isEmailError
      ? `Resend 邮件发送失败 → ${err.message}`
      : `数据库或其他错误 → ${err.message}`
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
    logger.error('忘记密码流程失败', {
      detail,
      route: req.path,
      method: req.method,
      statusCode: 500,
      errorStack: err.stack,
      ip
    })
    res.status(500).json({ success: false, message: '发送失败，请稍后重试' })
  }
})

// 使用验证码重置密码
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body

  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, message: '邮箱、验证码和新密码均为必填项' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: '密码长度不能少于6位' })
  }

  try {
    // 查找有效验证码
    const tokenResult = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()`,
      [email, code]
    )

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: '验证码无效或已过期' })
    }

    // 更新密码
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email])

    // 标记验证码已使用
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE email = $1 AND code = $2`,
      [email, code]
    )

    res.json({ success: true, message: '密码重置成功，请使用新密码登录' })
  } catch (err) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
    logger.error('重置密码流程失败', {
      detail: err.message,
      route: req.path,
      method: req.method,
      statusCode: 500,
      errorStack: err.stack,
      ip
    })
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

module.exports = router
