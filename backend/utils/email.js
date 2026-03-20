const { Resend } = require('resend')
require('dotenv').config()

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * 发送忘记密码验证码邮件
 * @param {string} to - 收件人邮箱
 * @param {string} code - 6位验证码
 * @param {string} username - 用户名（用于邮件称呼）
 */
async function sendResetPasswordEmail(to, code, username) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Mini Note 密码重置</title>
</head>
<body style="margin:0;padding:0;background:#fdf6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(255,182,193,0.15);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ffb3c6 0%,#c7ceea 100%);padding:36px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🌸</div>
              <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:1px;">Mini Note</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">记录每一个美好瞬间 ✨</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 16px;font-size:16px;color:#555;">你好，<strong style="color:#333;">${username}</strong> 👋</p>
              <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.7;">
                我们收到了你的密码重置申请。请使用下方验证码完成身份验证：
              </p>

              <!-- 验证码 -->
              <div style="background:linear-gradient(135deg,#fff0f5 0%,#f0f0ff 100%);border:2px dashed #ffb3c6;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <div style="font-size:13px;color:#999;margin-bottom:10px;letter-spacing:1px;">验证码</div>
                <div style="font-size:44px;font-weight:800;letter-spacing:12px;color:#e8698a;font-family:'Courier New',monospace;">${code}</div>
                <div style="font-size:12px;color:#bbb;margin-top:12px;">⏰ 验证码 15 分钟内有效</div>
              </div>

              <p style="margin:0 0 12px;font-size:14px;color:#888;line-height:1.7;">
                如果这不是你本人操作，请忽略此邮件，你的账号密码不会发生任何变化。
              </p>
              <p style="margin:0;font-size:14px;color:#bbb;">
                请勿将验证码告知他人 🔒
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fdf6f9;padding:20px 40px;text-align:center;border-top:1px solid #fce4ec;">
              <p style="margin:0;font-size:12px;color:#ccc;">
                此邮件由 <a href="https://${process.env.FRONTEND_URL || 'mininote.pixris.online'}" style="color:#ffb3c6;text-decoration:none;">Mini Note</a> 自动发送，请勿直接回复
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Mini Note <noreply@mininote.pixris.online>',
    to,
    subject: '🌸 Mini Note 密码重置验证码',
    html
  })

  if (error) {
    throw new Error(`邮件发送失败: ${error.message}`)
  }

  return data
}

/**
 * 发送注册邮箱验证码
 * @param {string} to - 收件人邮箱
 * @param {string} code - 6位验证码
 */
async function sendRegisterVerifyEmail(to, code) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Mini Note 邮箱验证</title>
</head>
<body style="margin:0;padding:0;background:#fdf6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(255,182,193,0.15);">
          <tr>
            <td style="background:linear-gradient(135deg,#ffb3c6 0%,#c7ceea 100%);padding:36px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🌸</div>
              <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:1px;">Mini Note</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">记录每一个美好瞬间 ✨</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 16px;font-size:16px;color:#555;">你好 👋</p>
              <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.7;">
                感谢注册 Mini Note！请使用下方验证码完成邮箱验证：
              </p>
              <div style="background:linear-gradient(135deg,#fff0f5 0%,#f0f0ff 100%);border:2px dashed #ffb3c6;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <div style="font-size:13px;color:#999;margin-bottom:10px;letter-spacing:1px;">注册验证码</div>
                <div style="font-size:44px;font-weight:800;letter-spacing:12px;color:#e8698a;font-family:'Courier New',monospace;">${code}</div>
                <div style="font-size:12px;color:#bbb;margin-top:12px;">⏰ 验证码 15 分钟内有效</div>
              </div>
              <p style="margin:0 0 12px;font-size:14px;color:#888;line-height:1.7;">
                如果你没有进行此操作，请忽略此邮件。
              </p>
              <p style="margin:0;font-size:14px;color:#bbb;">请勿将验证码告知他人 🔒</p>
            </td>
          </tr>
          <tr>
            <td style="background:#fdf6f9;padding:20px 40px;text-align:center;border-top:1px solid #fce4ec;">
              <p style="margin:0;font-size:12px;color:#ccc;">
                此邮件由 <a href="https://${process.env.FRONTEND_URL || 'mininote.pixris.online'}" style="color:#ffb3c6;text-decoration:none;">Mini Note</a> 自动发送，请勿直接回复
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Mini Note <noreply@mininote.pixris.online>',
    to,
    subject: '🌸 Mini Note 注册验证码',
    html
  })

  if (error) {
    throw new Error(`邮件发送失败: ${error.message}`)
  }

  return data
}

/**
 * 发送通知邮件（协作邀请、移除、接受等）
 * @param {string} to - 收件人邮箱
 * @param {string} title - 通知标题（如 🤝 协作邀请）
 * @param {string} body - 通知正文
 */
async function sendNotificationEmail(to, title, body) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#fdf6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(255,182,193,0.15);">
        <tr><td style="background:linear-gradient(135deg,#ffb3c6 0%,#c7ceea 100%);padding:36px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">🌸</div>
          <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:1px;">Mini Note</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <div style="font-size:20px;font-weight:700;color:#333;margin-bottom:16px;">${title}</div>
          <p style="font-size:15px;color:#555;line-height:1.8;margin:0 0 24px;">${body}</p>
          <a href="https://${process.env.FRONTEND_URL || 'mininote.pixris.online'}/plans"
             style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#ffb3c6,#e8698a);color:#fff;text-decoration:none;border-radius:24px;font-weight:600;font-size:14px;">
            前往查看 →
          </a>
        </td></tr>
        <tr><td style="background:#fdf6f9;padding:20px 40px;text-align:center;border-top:1px solid #fce4ec;">
          <p style="margin:0;font-size:12px;color:#ccc;">
            此邮件由 <a href="https://${process.env.FRONTEND_URL || 'mininote.pixris.online'}" style="color:#ffb3c6;text-decoration:none;">Mini Note</a> 自动发送
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Mini Note <noreply@mininote.pixris.online>',
      to,
      subject: `🌸 Mini Note - ${title}`,
      html
    })
  } catch (_) { /* 静默失败 */ }
}

/**
 * 发送二步验证验证码邮件
 * @param {string} to - 收件邮箱
 * @param {string} code - 6位验证码
 * @param {string} actionText - 操作描述（登录验证/启用二步验证/关闭二步验证）
 */
async function sendTwoFactorCodeEmail(to, code, actionText = '登录验证') {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Mini Note 二步验证</title>
</head>
<body style="margin:0;padding:0;background:#fdf6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(255,182,193,0.15);">
          <tr>
            <td style="background:linear-gradient(135deg,#ffb3c6 0%,#c7ceea 100%);padding:36px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🌸</div>
              <div style="font-size:26px;font-weight:700;color:#fff;letter-spacing:1px;">Mini Note</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">账号安全验证</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 16px;font-size:16px;color:#555;">你好 👋</p>
              <p style="margin:0 0 28px;font-size:15px;color:#666;line-height:1.7;">
                你正在进行 <strong style="color:#333;">${actionText}</strong>，请输入下方验证码完成验证：
              </p>
              <div style="background:linear-gradient(135deg,#fff0f5 0%,#f0f0ff 100%);border:2px dashed #ffb3c6;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <div style="font-size:13px;color:#999;margin-bottom:10px;letter-spacing:1px;">安全验证码</div>
                <div style="font-size:44px;font-weight:800;letter-spacing:12px;color:#e8698a;font-family:'Courier New',monospace;">${code}</div>
                <div style="font-size:12px;color:#bbb;margin-top:12px;">⏰ 验证码 10 分钟内有效</div>
              </div>
              <p style="margin:0 0 12px;font-size:14px;color:#888;line-height:1.7;">
                如果这不是你本人操作，请尽快修改密码并检查设备登录情况。
              </p>
              <p style="margin:0;font-size:14px;color:#bbb;">请勿将验证码告知他人 🔒</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Mini Note <noreply@mininote.pixris.online>',
    to,
    subject: '🌸 Mini Note 二步验证验证码',
    html
  })

  if (error) {
    throw new Error(`邮件发送失败: ${error.message}`)
  }

  return data
}

module.exports = {
  sendResetPasswordEmail,
  sendRegisterVerifyEmail,
  sendNotificationEmail,
  sendTwoFactorCodeEmail
}

