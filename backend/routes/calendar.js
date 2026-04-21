const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

const REPEAT_TYPES = new Set(['none', 'yearly'])
const REMINDER_OFFSETS = new Set([0, 3, 7])

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0

  const text = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(text)) return true
  if (['0', 'false', 'no', 'off'].includes(text)) return false
  return defaultValue
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return false
  return date.toISOString().slice(0, 10) === value
}

function normalizeTime(value) {
  const text = String(value || '').trim()
  if (!text) return '09:00:00'
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(text)) return `${text}:00`
  if (/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(text)) return text
  return null
}

function normalizeRemindOffsets(raw, notifyEnabled) {
  const source = Array.isArray(raw) ? raw : []
  const values = []

  for (const item of source) {
    const n = Number.parseInt(item, 10)
    if (Number.isInteger(n) && REMINDER_OFFSETS.has(n) && !values.includes(n)) {
      values.push(n)
    }
  }

  values.sort((a, b) => b - a)
  if (notifyEnabled && values.length === 0) return [0]
  return values
}

function normalizeBirthdayPayload(input = {}) {
  const title = String(input.title || '').trim().slice(0, 80)
  if (!title) return { error: '请填写生日标题' }

  const solarDate = String(input.solar_date || '').trim()
  if (!isValidIsoDate(solarDate)) return { error: '日期格式不正确，请使用 YYYY-MM-DD' }

  const repeatType = String(input.repeat_type || 'yearly').trim()
  if (!REPEAT_TYPES.has(repeatType)) return { error: '循环类型不支持' }

  const isLunar = toBoolean(input.is_lunar, false)
  let lunarMonth = null
  let lunarDay = null
  let lunarIsLeap = false

  if (isLunar) {
    lunarMonth = Number.parseInt(input.lunar_month, 10)
    lunarDay = Number.parseInt(input.lunar_day, 10)
    lunarIsLeap = toBoolean(input.lunar_is_leap, false)

    if (!Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12) {
      return { error: '农历月份无效' }
    }
    if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30) {
      return { error: '农历日期无效' }
    }
  }

  const notifyEnabled = toBoolean(input.notify_enabled, true)
  const notifyTime = normalizeTime(input.notify_time)
  if (!notifyTime) return { error: '提醒时间格式不正确，请使用 HH:mm' }

  const remindOffsets = normalizeRemindOffsets(input.remind_offsets, notifyEnabled)
  const note = String(input.note || '').trim().slice(0, 1000) || null

  const colorRaw = String(input.color || '').trim()
  const color = /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw.toUpperCase() : '#FF6B6B'

  return {
    data: {
      title,
      solar_date: solarDate,
      is_lunar: isLunar,
      lunar_month: isLunar ? lunarMonth : null,
      lunar_day: isLunar ? lunarDay : null,
      lunar_is_leap: isLunar ? lunarIsLeap : false,
      repeat_type: repeatType,
      notify_enabled: notifyEnabled,
      notify_time: notifyTime,
      remind_offsets: remindOffsets,
      color,
      note
    }
  }
}

function normalizeBirthdayId(raw) {
  const id = Number.parseInt(raw, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

function isMissingBirthdaysTable(err) {
  return err?.code === '42P01'
}

const BIRTHDAY_COLUMNS = `
  id, user_id, title, solar_date, is_lunar, lunar_month, lunar_day, lunar_is_leap,
  repeat_type, notify_enabled, notify_time, remind_offsets, color, note, created_at, updated_at
`

// 获取某月的日历记事概览
router.get('/month', authMiddleware, async (req, res) => {
  const { year, month } = req.query

  if (!year || !month) {
    return res.status(400).json({ success: false, message: '请提供年份和月份' })
  }

  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const result = await pool.query(
      `SELECT cn.calendar_date, COUNT(cn.note_id) as note_count,
              json_agg(json_build_object('id', n.id, 'title', n.title, 'color', n.color)) as notes
       FROM calendar_notes cn
       JOIN notes n ON cn.note_id = n.id
       WHERE cn.user_id = $1
         AND cn.calendar_date BETWEEN $2 AND $3
         AND n.is_archived = FALSE
       GROUP BY cn.calendar_date
       ORDER BY cn.calendar_date`,
      [req.user.id, startDate, endDate]
    )

    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('获取日历记事错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 获取某天的所有记事
router.get('/day', authMiddleware, async (req, res) => {
  const { date } = req.query

  if (!date) {
    return res.status(400).json({ success: false, message: '请提供日期' })
  }

  try {
    const result = await pool.query(
      `SELECT n.*
       FROM notes n
       JOIN calendar_notes cn ON n.id = cn.note_id
       WHERE cn.user_id = $1
         AND cn.calendar_date = $2
         AND n.is_archived = FALSE
       ORDER BY n.updated_at DESC`,
      [req.user.id, date]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('获取当天记事错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 为记事关联日期
router.post('/link', authMiddleware, async (req, res) => {
  const { note_id, date } = req.body

  if (!note_id || !date) {
    return res.status(400).json({ success: false, message: '请提供记事ID和日期' })
  }

  try {
    // 验证记事归属
    const noteCheck = await pool.query(
      'SELECT id FROM notes WHERE id = $1 AND user_id = $2',
      [note_id, req.user.id]
    )
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记事不存在' })
    }

    await pool.query(
      'INSERT INTO calendar_notes (user_id, note_id, calendar_date) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.user.id, note_id, date]
    )
    res.json({ success: true, message: '日历关联成功' })
  } catch (err) {
    console.error('关联日历记事错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 取消记事日期关联
router.delete('/link', authMiddleware, async (req, res) => {
  const { note_id, date } = req.body

  try {
    await pool.query(
      'DELETE FROM calendar_notes WHERE note_id = $1 AND calendar_date = $2 AND user_id = $3',
      [note_id, date, req.user.id]
    )
    res.json({ success: true, message: '日历关联已取消' })
  } catch (err) {
    console.error('取消日历关联错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 获取生日提醒列表
router.get('/birthdays', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${BIRTHDAY_COLUMNS}
       FROM birthdays
       WHERE user_id = $1
       ORDER BY updated_at DESC, id DESC`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    if (isMissingBirthdaysTable(err)) {
      return res.json({ success: true, data: [] })
    }
    console.error('获取生日提醒失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 新增生日提醒
router.post('/birthdays', authMiddleware, async (req, res) => {
  const parsed = normalizeBirthdayPayload(req.body || {})
  if (parsed.error) {
    return res.status(400).json({ success: false, message: parsed.error })
  }

  const payload = parsed.data

  try {
    const result = await pool.query(
      `INSERT INTO birthdays (
         user_id, title, solar_date, is_lunar, lunar_month, lunar_day, lunar_is_leap,
         repeat_type, notify_enabled, notify_time, remind_offsets, color, note
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11::int[], $12, $13
       )
       RETURNING ${BIRTHDAY_COLUMNS}`,
      [
        req.user.id,
        payload.title,
        payload.solar_date,
        payload.is_lunar,
        payload.lunar_month,
        payload.lunar_day,
        payload.lunar_is_leap,
        payload.repeat_type,
        payload.notify_enabled,
        payload.notify_time,
        payload.remind_offsets,
        payload.color,
        payload.note
      ]
    )

    res.json({ success: true, data: result.rows[0], message: '生日提醒已创建' })
  } catch (err) {
    if (isMissingBirthdaysTable(err)) {
      return res.status(503).json({ success: false, message: '生日提醒功能尚未初始化，请先执行数据库迁移' })
    }
    console.error('创建生日提醒失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 更新生日提醒
router.put('/birthdays/:id', authMiddleware, async (req, res) => {
  const birthdayId = normalizeBirthdayId(req.params.id)
  if (!birthdayId) {
    return res.status(400).json({ success: false, message: '生日提醒 ID 无效' })
  }

  const parsed = normalizeBirthdayPayload(req.body || {})
  if (parsed.error) {
    return res.status(400).json({ success: false, message: parsed.error })
  }

  const payload = parsed.data

  try {
    const result = await pool.query(
      `UPDATE birthdays
       SET title = $3,
           solar_date = $4,
           is_lunar = $5,
           lunar_month = $6,
           lunar_day = $7,
           lunar_is_leap = $8,
           repeat_type = $9,
           notify_enabled = $10,
           notify_time = $11,
           remind_offsets = $12::int[],
           color = $13,
           note = $14,
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
       RETURNING ${BIRTHDAY_COLUMNS}`,
      [
        birthdayId,
        req.user.id,
        payload.title,
        payload.solar_date,
        payload.is_lunar,
        payload.lunar_month,
        payload.lunar_day,
        payload.lunar_is_leap,
        payload.repeat_type,
        payload.notify_enabled,
        payload.notify_time,
        payload.remind_offsets,
        payload.color,
        payload.note
      ]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '生日提醒不存在' })
    }

    res.json({ success: true, data: result.rows[0], message: '生日提醒已更新' })
  } catch (err) {
    if (isMissingBirthdaysTable(err)) {
      return res.status(503).json({ success: false, message: '生日提醒功能尚未初始化，请先执行数据库迁移' })
    }
    console.error('更新生日提醒失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 删除生日提醒
router.delete('/birthdays/:id', authMiddleware, async (req, res) => {
  const birthdayId = normalizeBirthdayId(req.params.id)
  if (!birthdayId) {
    return res.status(400).json({ success: false, message: '生日提醒 ID 无效' })
  }

  try {
    const result = await pool.query(
      `DELETE FROM birthdays
       WHERE id = $1
         AND user_id = $2`,
      [birthdayId, req.user.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '生日提醒不存在' })
    }

    res.json({ success: true, message: '生日提醒已删除' })
  } catch (err) {
    if (isMissingBirthdaysTable(err)) {
      return res.status(503).json({ success: false, message: '生日提醒功能尚未初始化，请先执行数据库迁移' })
    }
    console.error('删除生日提醒失败:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 获取某月有日期的计划步骤（用于日历上显示计划标记）
router.get('/plan-steps', authMiddleware, async (req, res) => {
  const { year, month } = req.query
  if (!year || !month) {
    return res.status(400).json({ success: false, message: '请提供年份和月份' })
  }

  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const result = await pool.query(
      `SELECT ps.id, ps.plan_id, ps.title, ps.status, ps.start_date, ps.due_date,
              p.title AS plan_title, p.icon AS plan_icon, p.color AS plan_color
       FROM plan_steps ps
       JOIN plans p ON p.id = ps.plan_id
       LEFT JOIN plan_collaborators c ON c.plan_id = p.id AND c.user_id = $1
       WHERE (p.user_id = $1 OR c.user_id = $1)
         AND (
           (ps.start_date IS NOT NULL AND ps.start_date BETWEEN $2 AND $3) OR
           (ps.due_date IS NOT NULL AND ps.due_date BETWEEN $2 AND $3)
         )
       ORDER BY COALESCE(ps.start_date, ps.due_date) ASC`,
      [req.user.id, startDate, endDate]
    )

    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('获取日历计划步骤错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

module.exports = router
