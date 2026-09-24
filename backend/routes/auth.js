const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')
const {
  sendResetPasswordEmail,
  sendRegisterVerifyEmail,
  sendTwoFactorCodeEmail
} = require('../utils/email')
const { logger } = require('../utils/logger')
const {
  detectDeviceName,
  extractClientIp,
  generate6DigitCode,
  generateChallengeId,
  generateSessionId
} = require('../utils/auth-security')
require('dotenv').config()

const CODE_PURPOSE_LOGIN_2FA = 'login_2fa'

function maskEmail(email) {
  if (!email || !email.includes('@')) return ''
  const [name, domain] = email.split('@')
  if (name.length <= 2) return `**@${domain}`
  return `${name[0]}${'*'.repeat(Math.max(name.length - 2, 1))}${name[name.length - 1]}@${domain}`
}

function buildAuthToken(user, sessionId) {
  return jwt.sign(
    { id: user.id, username: user.username, sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )
}

async function createUserSession(userId, req) {
  const sessionId = generateSessionId()
  const deviceName = detectDeviceName(req)
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 500)
  const ipAddress = extractClientIp(req)

  await pool.query(
    `INSERT INTO user_sessions (user_id, session_id, device_name, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, sessionId, deviceName, userAgent, ipAddress]
  )

  return sessionId
}

async function issueLoginSuccessResponse(user, req, res) {
  const sessionId = await createUserSession(user.id, req)
  const token = buildAuthToken(user, sessionId)
  const { password_hash, code_id, verify_code, attempts, ...userInfo } = user
  return res.json({ success: true, message: '登录成功', data: { user: userInfo, token } })
}

async function createLoginTwoFactorChallenge(user) {
  const challengeId = generateChallengeId()
  const code = generate6DigitCode()

  await pool.query(
    `UPDATE user_verification_codes
     SET used = TRUE
     WHERE user_id = $1 AND purpose = $2 AND used = FALSE`,
    [user.id, CODE_PURPOSE_LOGIN_2FA]
  )

  // 有效期由数据库时钟生成，避免与应用服务器时区/时钟不一致导致验证码提前过期
  const expiresResult = await pool.query(
    `INSERT INTO user_verification_codes (user_id, purpose, challenge_id, code, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')
     RETURNING expires_at`,
    [user.id, CODE_PURPOSE_LOGIN_2FA, challengeId, code]
  )
  const expiresAt = expiresResult.rows[0].expires_at

  await sendTwoFactorCodeEmail(user.email, code, '登录验证')
  return { challengeId, expiresAt }
}

// 注册
router.post('/register', async (req, res) => {
  const { username, email, password, nickname, code } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: '用户名、邮箱和密码为必填项' })
  }
  if (!code) {
    return res.status(400).json({ success: false, message: '请先进行邮箱验证' })
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: '密码长度不能少于6位' })
  }

  try {
    const tokenResult = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()`,
      [email, code]
    )
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: '验证码无效或已过期', field: 'code' })
    }
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
       RETURNING id, username, email, nickname, avatar_color, theme, bio, is_admin, two_factor_enabled, created_at`,
      [username, email, passwordHash, nickname || username, avatarColor]
    )

    const user = result.rows[0]
    const sessionId = await createUserSession(user.id, req)
    const token = buildAuthToken(user, sessionId)

    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE email = $1 AND used = FALSE`,
      [email]
    )

    res.status(201).json({ success: true, message: '注册成功', data: { user, token } })
  } catch (err) {
    console.error('注册错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 发送注册邮箱验证码
router.post('/send-register-code', async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ success: false, message: '请输入邮箱' })
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: '该邮箱已被注册', field: 'email' })
    }

    const recent = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute' AND used = FALSE`,
      [email]
    )
    if (recent.rows.length > 0) {
      return res.status(429).json({ success: false, message: '发送太频繁，请 1 分钟后再试' })
    }

    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE email = $1 AND used = FALSE`,
      [email]
    )

    const code = generate6DigitCode()

    // 有效期由数据库时钟生成，避免与应用服务器时区/时钟不一致导致验证码提前过期
    await pool.query(
      `INSERT INTO password_reset_tokens (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [email, code]
    )

    await sendRegisterVerifyEmail(email, code)

    res.json({ success: true, message: '验证码已发送，请查收邮件（15分钟内有效）' })
  } catch (err) {
    const isEmailError = err.message?.includes('邮件发送失败') || err.message?.includes('邮件中心')
    logger.error('发送注册验证码失败', { detail: err.message, route: req.path, method: req.method, statusCode: 500, errorStack: err.stack })
    res.status(500).json({ success: false, message: isEmailError ? '邮件发送失败，请稍后重试' : '服务器内部错误' })
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
      return res.status(401).json({ success: false, message: '账号不存在，请检查用户名或邮箱' })
    }

    const user = result.rows[0]
    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return res.status(401).json({ success: false, message: '密码错误，请重新输入' })
    }

    if (user.two_factor_enabled) {
      const challenge = await createLoginTwoFactorChallenge(user)
      return res.json({
        success: true,
        message: '已发送二步验证码',
        data: {
          requires_two_factor: true,
          challenge_id: challenge.challengeId,
          expires_at: challenge.expiresAt.toISOString(),
          email_hint: maskEmail(user.email)
        }
      })
    }

    return issueLoginSuccessResponse(user, req, res)
  } catch (err) {
    console.error('登录错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 二步验证：校验登录验证码
router.post('/login/verify-2fa', async (req, res) => {
  const { challenge_id, code } = req.body
  if (!challenge_id || !code) {
    return res.status(400).json({ success: false, message: '验证码信息不完整' })
  }

  try {
    const result = await pool.query(
      `SELECT c.id AS code_id, c.code AS verify_code, c.attempts, u.*
       FROM user_verification_codes c
       JOIN users u ON u.id = c.user_id
       WHERE c.challenge_id = $1
         AND c.purpose = $2
         AND c.used = FALSE
         AND c.expires_at > NOW()
       LIMIT 1`,
      [challenge_id, CODE_PURPOSE_LOGIN_2FA]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: '验证码无效或已过期' })
    }

    const row = result.rows[0]
    if (String(row.verify_code) !== String(code).trim()) {
      const nextAttempts = Number(row.attempts || 0) + 1
      const lockUsed = nextAttempts >= 5
      await pool.query(
        `UPDATE user_verification_codes
         SET attempts = $1, used = CASE WHEN $2 THEN TRUE ELSE used END
         WHERE id = $3`,
        [nextAttempts, lockUsed, row.code_id]
      )
      if (lockUsed) {
        return res.status(429).json({ success: false, message: '验证码错误次数过多，请重新登录后再试' })
      }
      return res.status(400).json({ success: false, message: '验证码错误，请重新输入' })
    }

    await pool.query(
      'UPDATE user_verification_codes SET used = TRUE WHERE id = $1',
      [row.code_id]
    )

    return issueLoginSuccessResponse(row, req, res)
  } catch (err) {
    console.error('二步验证登录错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 二步验证：重发登录验证码
router.post('/login/resend-2fa', async (req, res) => {
  const { challenge_id } = req.body
  if (!challenge_id) {
    return res.status(400).json({ success: false, message: '缺少 challenge_id' })
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.user_id, c.created_at, u.email
       FROM user_verification_codes c
       JOIN users u ON u.id = c.user_id
       WHERE c.challenge_id = $1
         AND c.purpose = $2
         AND c.used = FALSE
         AND c.expires_at > NOW()
       LIMIT 1`,
      [challenge_id, CODE_PURPOSE_LOGIN_2FA]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: '登录验证已失效，请重新登录' })
    }

    const row = result.rows[0]
    const recent = await pool.query(
      `SELECT id FROM user_verification_codes
       WHERE id = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
      [row.id]
    )
    if (recent.rows.length > 0) {
      return res.status(429).json({ success: false, message: '发送太频繁，请 1 分钟后再试' })
    }

    const newCode = generate6DigitCode()
    // 有效期由数据库时钟生成，避免与应用服务器时区/时钟不一致导致验证码提前过期
    await pool.query(
      `UPDATE user_verification_codes
       SET code = $1, expires_at = NOW() + INTERVAL '10 minutes', created_at = NOW(), attempts = 0
       WHERE id = $2`,
      [newCode, row.id]
    )

    await sendTwoFactorCodeEmail(row.email, newCode, '登录验证')
    return res.json({ success: true, message: '验证码已重新发送' })
  } catch (err) {
    console.error('重发二步验证码错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 当前设备退出登录
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.user?.sid) {
      await pool.query(
        `UPDATE user_sessions
         SET revoked_at = NOW()
         WHERE session_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [req.user.sid, req.user.id]
      )
    }
    res.json({ success: true, message: '已退出登录' })
  } catch (err) {
    console.error('退出登录错误:', err)
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
    const result = await pool.query('SELECT id, username FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return res.json({ success: true, message: '如果该邮箱已注册，验证码将发送至你的邮箱' })
    }

    const user = result.rows[0]

    const recent = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute' AND used = FALSE`,
      [email]
    )
    if (recent.rows.length > 0) {
      return res.status(429).json({ success: false, message: '发送太频繁，请 1 分钟后再试' })
    }

    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE email = $1 AND used = FALSE`,
      [email]
    )

    const code = generate6DigitCode()

    // 有效期由数据库时钟生成，避免与应用服务器时区/时钟不一致导致验证码提前过期
    await pool.query(
      `INSERT INTO password_reset_tokens (email, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [email, code]
    )

    await sendResetPasswordEmail(email, code, user.username)

    res.json({ success: true, message: '验证码已发送，请查收邮件（15分钟内有效）' })
  } catch (err) {
    const isEmailError = err.message?.includes('邮件发送失败') || err.message?.includes('邮件中心')
    const detail = isEmailError
      ? `邮件中心发送失败 → ${err.message}`
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
    const tokenResult = await pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()`,
      [email, code]
    )

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: '验证码无效或已过期' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email])

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


