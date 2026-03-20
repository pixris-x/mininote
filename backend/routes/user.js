const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')
const { sendTwoFactorCodeEmail } = require('../utils/email')
const { generate6DigitCode } = require('../utils/auth-security')

function securityPurpose(action) {
  if (action === 'enable') return 'enable_2fa'
  if (action === 'disable') return 'disable_2fa'
  return null
}

// 获取当前用户信息
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, nickname, avatar_color, theme, bio,
              is_admin, two_factor_enabled, created_at
       FROM users WHERE id = $1`,
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
       RETURNING id, username, email, nickname, avatar_color, theme, bio, is_admin, two_factor_enabled, created_at`,
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

// 安全概览（2FA状态 + 当前会话标识）
router.get('/security', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }
    res.json({
      success: true,
      data: {
        two_factor_enabled: result.rows[0].two_factor_enabled,
        current_session_id: req.user.sid || null
      }
    })
  } catch (err) {
    console.error('获取安全信息错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 发送 2FA 开关验证码（action: enable | disable）
router.post('/security/2fa/send-code', authMiddleware, async (req, res) => {
  const { action } = req.body
  const purpose = securityPurpose(action)
  if (!purpose) {
    return res.status(400).json({ success: false, message: '无效操作' })
  }

  try {
    const userResult = await pool.query(
      'SELECT email, two_factor_enabled FROM users WHERE id = $1',
      [req.user.id]
    )
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const user = userResult.rows[0]
    if (action === 'enable' && user.two_factor_enabled) {
      return res.status(400).json({ success: false, message: '二步验证已开启' })
    }
    if (action === 'disable' && !user.two_factor_enabled) {
      return res.status(400).json({ success: false, message: '二步验证尚未开启' })
    }

    const recent = await pool.query(
      `SELECT id FROM user_verification_codes
       WHERE user_id = $1
         AND purpose = $2
         AND used = FALSE
         AND created_at > NOW() - INTERVAL '1 minute'`,
      [req.user.id, purpose]
    )
    if (recent.rows.length > 0) {
      return res.status(429).json({ success: false, message: '发送太频繁，请 1 分钟后再试' })
    }

    await pool.query(
      `UPDATE user_verification_codes
       SET used = TRUE
       WHERE user_id = $1 AND purpose = $2 AND used = FALSE`,
      [req.user.id, purpose]
    )

    const code = generate6DigitCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await pool.query(
      `INSERT INTO user_verification_codes (user_id, purpose, code, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, purpose, code, expiresAt]
    )

    await sendTwoFactorCodeEmail(user.email, code, action === 'enable' ? '启用二步验证' : '关闭二步验证')
    res.json({ success: true, message: '验证码已发送到你的邮箱（10分钟内有效）' })
  } catch (err) {
    console.error('发送2FA开关验证码失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 校验 2FA 开关验证码
router.post('/security/2fa/verify', authMiddleware, async (req, res) => {
  const { action, code } = req.body
  const purpose = securityPurpose(action)
  if (!purpose || !code) {
    return res.status(400).json({ success: false, message: '请求参数不完整' })
  }

  try {
    const codeResult = await pool.query(
      `SELECT id
       FROM user_verification_codes
       WHERE user_id = $1
         AND purpose = $2
         AND code = $3
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id, purpose, String(code).trim()]
    )

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: '验证码无效或已过期' })
    }

    const enable = action === 'enable'
    await pool.query(
      'UPDATE users SET two_factor_enabled = $1 WHERE id = $2',
      [enable, req.user.id]
    )
    await pool.query(
      'UPDATE user_verification_codes SET used = TRUE WHERE id = $1',
      [codeResult.rows[0].id]
    )

    res.json({
      success: true,
      message: enable ? '二步验证已开启' : '二步验证已关闭',
      data: { two_factor_enabled: enable }
    })
  } catch (err) {
    console.error('校验2FA开关验证码失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 设备会话列表
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT session_id, device_name, user_agent, ip_address, created_at, last_active_at, revoked_at
       FROM user_sessions
       WHERE user_id = $1
         AND revoked_at IS NULL
       ORDER BY last_active_at DESC, created_at DESC`,
      [req.user.id]
    )

    const sessions = result.rows.map((row) => ({
      ...row,
      is_current: req.user.sid ? row.session_id === req.user.sid : false
    }))

    res.json({ success: true, data: sessions })
  } catch (err) {
    console.error('获取设备会话失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 踢出某个设备
router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
  const { sessionId } = req.params
  if (!sessionId) {
    return res.status(400).json({ success: false, message: '缺少会话标识' })
  }

  try {
    const result = await pool.query(
      `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND session_id = $2
         AND revoked_at IS NULL
       RETURNING session_id`,
      [req.user.id, sessionId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '会话不存在或已失效' })
    }
    res.json({ success: true, message: '设备已移除' })
  } catch (err) {
    console.error('移除设备会话失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 踢出其他设备
router.delete('/sessions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE user_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND session_id <> $2`,
      [req.user.id, req.user.sid || '']
    )
    res.json({ success: true, message: '已踢出其他设备', data: { revoked_count: result.rowCount } })
  } catch (err) {
    console.error('踢出其他设备失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

module.exports = router


