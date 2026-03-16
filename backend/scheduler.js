/**
 * MiniList 后台定时任务调度器
 *
 * 任务列表：
 *  1. 清理过期分享链接        每天 03:00
 *  2. 清理孤儿上传图片        每周日 04:00
 *  3. 计划步骤到期提醒邮件    每天 08:00
 */

const cron = require('node-cron')
const fs = require('fs')
const path = require('path')
// 确保无论从哪个目录运行，都能找到 backend/.env
require('dotenv').config({ path: path.join(__dirname, '.env') })
const pool = require('./config/db')
const { Resend } = require('resend')

// 延迟初始化，确保 dotenv 已加载后再读取 API Key
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'images')

// ─── 工具 ───────────────────────────────────────────────────────────────────

function log(tag, msg) {
  const ts = new Date().toISOString()
  console.log(`[Scheduler][${ts}][${tag}] ${msg}`)
}

/**
 * 将任务执行结果写入 scheduler_logs 表
 * @param {string} taskName
 * @param {'success'|'error'} status
 * @param {string} message
 * @param {number} affected  受影响记录数
 * @param {number} durationMs 执行耗时
 */
async function writeLog(taskName, status, message, affected = 0, durationMs = 0) {
  try {
    await pool.query(
      `INSERT INTO scheduler_logs (task_name, status, message, affected, duration_ms)
       VALUES ($1, $2, $3, $4, $5)`,
      [taskName, status, message, affected, durationMs]
    )
  } catch (err) {
    // 日志写入失败不影响主流程，仅打印
    log('LOG_WRITE_ERR', err.message)
  }
}

// ─── 任务 1：清理过期分享链接 ────────────────────────────────────────────────

async function cleanExpiredShares() {
  const t0 = Date.now()
  try {
    const res = await pool.query(`
      UPDATE plans
      SET share_token      = NULL,
          share_pin        = NULL,
          share_expires_at = NULL
      WHERE share_expires_at IS NOT NULL
        AND share_expires_at < NOW()
      RETURNING id
    `)
    const msg = res.rowCount > 0
      ? `已清理 ${res.rowCount} 条过期分享链接`
      : '无过期分享链接'
    log('SHARE_CLEAN', msg)
    await writeLog('share_clean', 'success', msg, res.rowCount, Date.now() - t0)
  } catch (err) {
    log('SHARE_CLEAN', `错误: ${err.message}`)
    await writeLog('share_clean', 'error', err.message, 0, Date.now() - t0)
  }
}

// ─── 任务 2：清理孤儿上传图片 ────────────────────────────────────────────────
// 扫描磁盘上的图片文件，若不再被任何 note / plan_step 引用则删除

async function cleanOrphanUploads() {
  const t0 = Date.now()
  try {
    // 从数据库取出所有还在使用的图片路径片段
    const [noteRes, stepRes] = await Promise.all([
      pool.query(`SELECT content FROM notes WHERE content IS NOT NULL`),
      pool.query(`SELECT image_url, image_urls FROM plan_steps`)
    ])

    const usedPaths = new Set()

    // 笔记内容中的图片（TipTap src 属性）
    for (const row of noteRes.rows) {
      const matches = (row.content || '').matchAll(/\/uploads\/images\/([^"'\s)]+)/g)
      for (const m of matches) usedPaths.add(m[1])
    }

    // 步骤图片
    for (const row of stepRes.rows) {
      if (row.image_url) {
        const rel = row.image_url.replace(/^.*\/uploads\/images\//, '')
        usedPaths.add(rel)
      }
      if (row.image_urls) {
        const urls = Array.isArray(row.image_urls) ? row.image_urls : JSON.parse(row.image_urls || '[]')
        for (const url of urls) {
          const rel = url.replace(/^.*\/uploads\/images\//, '')
          usedPaths.add(rel)
        }
      }
    }

    let deleted = 0

    // 递归扫描上传目录
    function scanDir(dir, base) {
      if (!fs.existsSync(dir)) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        const rel = path.join(base, entry.name).replace(/\\/g, '/')
        if (entry.isDirectory()) {
          scanDir(full, rel)
        } else if (entry.isFile()) {
          if (!usedPaths.has(rel)) {
            fs.unlinkSync(full)
            deleted++
          }
        }
      }
    }

    scanDir(UPLOADS_DIR, '')
    const msg = deleted > 0 ? `已删除 ${deleted} 个孤儿图片文件` : '无孤儿图片文件'
    log('ORPHAN_CLEAN', msg)
    await writeLog('orphan_clean', 'success', msg, deleted, Date.now() - t0)
  } catch (err) {
    log('ORPHAN_CLEAN', `错误: ${err.message}`)
    await writeLog('orphan_clean', 'error', err.message, 0, Date.now() - t0)
  }
}

// ─── 任务 3：计划步骤到期提醒邮件 ───────────────────────────────────────────
// 查找明天截止、未完成、未跳过的步骤，按用户归组后发一封汇总邮件

async function sendDueDateReminders() {
  const t0 = Date.now()
  try {
    const res = await pool.query(`
      SELECT
        ps.id,
        ps.title,
        ps.due_date,
        ps.plan_id,
        p.title  AS plan_title,
        p.icon   AS plan_icon,
        u.email,
        u.nickname
      FROM plan_steps ps
      JOIN plans      p ON p.id      = ps.plan_id
      JOIN users      u ON u.id      = ps.user_id
      WHERE ps.status NOT IN ('completed', 'skipped')
        AND ps.due_date::date = (CURRENT_DATE + INTERVAL '1 day')::date
        AND u.email IS NOT NULL
      ORDER BY u.id, ps.due_date
    `)

    if (res.rowCount === 0) {
      const msg = '今日无需发送到期提醒'
      log('REMINDER', msg)
      await writeLog('due_reminder', 'success', msg, 0, Date.now() - t0)
      return
    }

    // 按用户邮箱合并步骤
    const byUser = new Map()
    for (const row of res.rows) {
      if (!byUser.has(row.email)) {
        byUser.set(row.email, { nickname: row.nickname, steps: [] })
      }
      byUser.get(row.email).steps.push(row)
    }

    let sent = 0
    for (const [email, { nickname, steps }] of byUser) {
      const listHtml = steps.map(s => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #fce4ec;">
            ${s.plan_icon || '🎯'} <strong>${s.plan_title}</strong>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #fce4ec;color:#555;">
            ${s.title}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #fce4ec;color:#e8698a;white-space:nowrap;">
            ${new Date(s.due_date).toLocaleDateString('zh-CN')}
          </td>
        </tr>`).join('')

      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#fdf6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(255,182,193,0.15);">
        <tr>
          <td style="background:linear-gradient(135deg,#ffb3c6,#c7ceea);padding:32px 40px;text-align:center;">
            <div style="font-size:38px;margin-bottom:6px;">🌸</div>
            <div style="font-size:22px;font-weight:700;color:#fff;">Mini Note</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">计划步骤到期提醒</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#555;">你好 ${nickname || ''}，</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.8;">
              以下计划步骤将于 <strong style="color:#e8698a;">明天</strong> 到期，记得及时完成哦 🎯
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #fce4ec;border-radius:12px;overflow:hidden;font-size:13px;">
              <thead>
                <tr style="background:#fff5f8;">
                  <th style="padding:10px 12px;text-align:left;color:#e8698a;font-weight:600;">计划</th>
                  <th style="padding:10px 12px;text-align:left;color:#e8698a;font-weight:600;">步骤</th>
                  <th style="padding:10px 12px;text-align:left;color:#e8698a;font-weight:600;">截止日</th>
                </tr>
              </thead>
              <tbody>${listHtml}</tbody>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#bbb;text-align:center;">
              加油！你可以的 💪
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#fdf6f9;padding:16px 40px;text-align:center;border-top:1px solid #fce4ec;">
            <p style="margin:0;font-size:12px;color:#ccc;">
              此邮件由 <a href="https://${process.env.FRONTEND_URL || 'minilist.pixris.online'}"
                style="color:#ffb3c6;text-decoration:none;">Mini Note</a> 自动发送，请勿直接回复
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      await getResend().emails.send({
        from: process.env.EMAIL_FROM || 'Mini Note <noreply@minilist.pixris.online>',
        to: email,
        subject: `📅 Mini Note · ${steps.length} 个步骤明天到期`,
        html
      })
      sent++
    }

    const msg = `已向 ${sent} 位用户发送到期提醒，共 ${res.rowCount} 条步骤`
    log('REMINDER', msg)
    await writeLog('due_reminder', 'success', msg, res.rowCount, Date.now() - t0)
  } catch (err) {
    log('REMINDER', `错误: ${err.message}`)
    await writeLog('due_reminder', 'error', err.message, 0, Date.now() - t0)
  }
}

// ─── 注册定时任务 ────────────────────────────────────────────────────────────

function startScheduler() {
  // 每天 03:00  清理过期分享
  cron.schedule('0 3 * * *', cleanExpiredShares, { timezone: 'Asia/Shanghai' })

  // 每周日 04:00  清理孤儿图片
  cron.schedule('0 4 * * 0', cleanOrphanUploads, { timezone: 'Asia/Shanghai' })

  // 每天 08:00  发到期提醒
  cron.schedule('0 8 * * *', sendDueDateReminders, { timezone: 'Asia/Shanghai' })

  log('INIT', '定时任务已启动 ✅')
  log('INIT', '  - 过期分享清理   : 每天 03:00')
  log('INIT', '  - 孤儿图片清理   : 每周日 04:00')
  log('INIT', '  - 步骤到期提醒   : 每天 08:00')
}

module.exports = { startScheduler, cleanExpiredShares, cleanOrphanUploads, sendDueDateReminders }
