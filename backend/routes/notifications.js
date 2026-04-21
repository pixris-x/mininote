const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')
const { createNotifications, NOTIFICATION_TYPES } = require('../utils/notifications')
const { sendPushToUser } = require('../utils/user-push')

const STATUS_FILTERS = new Set(['all', 'unread', 'read'])
const TYPE_FILTERS = new Set(['all', 'push', 'due_reminder', 'birthday_reminder', 'system'])
const BIRTHDAY_REMINDER_OFFSETS = new Set([0, 3, 7])

const SUMMARY_SELECT_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE is_read = FALSE) AS unread_total,
    COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'push') AS unread_push,
    COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'due_reminder') AS unread_due_reminder,
    COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'birthday_reminder') AS unread_birthday_reminder,
    COUNT(*) FILTER (WHERE is_read = FALSE AND type = 'system') AS unread_system
  FROM user_notifications
  WHERE user_id = $1
`

function normalizeStatusFilter(raw) {
  const value = String(raw || 'all').trim()
  return STATUS_FILTERS.has(value) ? value : 'all'
}

function normalizeTypeFilter(raw) {
  const value = String(raw || 'all').trim()
  return TYPE_FILTERS.has(value) ? value : 'all'
}

function normalizePage(raw) {
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : 1
}

function normalizeLimit(raw) {
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) return 20
  return Math.min(100, value)
}

function normalizeBirthdaySyncEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) return []

  const dedup = new Map()
  for (const item of rawEntries) {
    const birthdayId = Number.parseInt(item?.birthday_id, 10)
    const offsetDays = Number.parseInt(item?.offset_days, 10)
    const occurrenceDate = String(item?.occurrence_date || '').trim()

    if (!Number.isInteger(birthdayId) || birthdayId <= 0) continue
    if (!BIRTHDAY_REMINDER_OFFSETS.has(offsetDays)) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) continue

    const key = `${birthdayId}|${occurrenceDate}|${offsetDays}`
    if (!dedup.has(key)) {
      dedup.set(key, {
        birthday_id: birthdayId,
        occurrence_date: occurrenceDate,
        offset_days: offsetDays
      })
    }
  }

  return [...dedup.values()]
}

function toShanghaiDateString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(date)
  const map = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }
  return `${map.year}-${map.month}-${map.day}`
}

function toShanghaiTimeString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const parts = formatter.formatToParts(date)
  const map = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  }
  return `${map.hour}:${map.minute}:${map.second}`
}

function shiftDateByDays(isoDate, deltaDays) {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function isValidSolarYearlyOccurrence(baseDate, occurrenceDate) {
  const baseMd = String(baseDate || '').slice(5, 10)
  const occMd = String(occurrenceDate || '').slice(5, 10)
  if (!baseMd || !occMd) return false
  if (baseMd === occMd) return true

  if (baseMd === '02-29') {
    const year = Number.parseInt(String(occurrenceDate).slice(0, 4), 10)
    if (!Number.isInteger(year)) return false
    return !isLeapYear(year) && occMd === '02-28'
  }
  return false
}

function buildBirthdayReminderContent(title, offsetDays) {
  if (offsetDays === 0) {
    return `今天是「${title}」的生日，记得送上祝福`
  }
  return `「${title}」还有 ${offsetDays} 天生日，别忘了提前准备`
}

function buildListWhere({ userId, status, type }) {
  const where = ['user_id = $1']
  const params = [userId]

  if (status === 'unread') {
    where.push('is_read = FALSE')
  } else if (status === 'read') {
    where.push('is_read = TRUE')
  }

  if (type !== 'all') {
    params.push(type)
    where.push(`type = $${params.length}`)
  }

  return { whereSql: where.join(' AND '), params }
}

router.use(authMiddleware)

// GET /api/notifications/summary
router.get('/summary', async (req, res) => {
  try {
    const summaryRes = await pool.query(SUMMARY_SELECT_SQL, [req.user.id])

    res.json({
      success: true,
      data: {
        unread_total: Number(summaryRes.rows[0]?.unread_total || 0),
        unread_push: Number(summaryRes.rows[0]?.unread_push || 0),
        unread_due_reminder: Number(summaryRes.rows[0]?.unread_due_reminder || 0),
        unread_birthday_reminder: Number(summaryRes.rows[0]?.unread_birthday_reminder || 0),
        unread_system: Number(summaryRes.rows[0]?.unread_system || 0)
      }
    })
  } catch (err) {
    console.error('获取通知摘要失败:', err)
    res.status(500).json({ success: false, message: '获取通知摘要失败' })
  }
})

// GET /api/notifications
router.get('/', async (req, res) => {
  const status = normalizeStatusFilter(req.query.status)
  const type = normalizeTypeFilter(req.query.type)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit

  try {
    const { whereSql, params } = buildListWhere({ userId: req.user.id, status, type })

    const [listRes, totalRes, summaryRes] = await Promise.all([
      pool.query(
        `SELECT
           id, type, source, title, content, link_url, payload,
           is_read, read_at, created_at, updated_at
         FROM user_notifications
         WHERE ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS count
         FROM user_notifications
         WHERE ${whereSql}`,
        params
      ),
      pool.query(
        SUMMARY_SELECT_SQL,
        [req.user.id]
      ),
    ])

    const total = Number(totalRes.rows[0]?.count || 0)
    const pages = Math.max(1, Math.ceil(total / Math.max(limit, 1)))

    res.json({
      success: true,
      data: {
        items: listRes.rows,
        total,
        page,
        limit,
        pages,
        filters: { status, type },
        summary: {
          unread_total: Number(summaryRes.rows[0]?.unread_total || 0),
          unread_push: Number(summaryRes.rows[0]?.unread_push || 0),
          unread_due_reminder: Number(summaryRes.rows[0]?.unread_due_reminder || 0),
          unread_birthday_reminder: Number(summaryRes.rows[0]?.unread_birthday_reminder || 0),
          unread_system: Number(summaryRes.rows[0]?.unread_system || 0)
        }
      }
    })
  } catch (err) {
    console.error('获取通知列表失败:', err)
    res.status(500).json({ success: false, message: '获取通知列表失败' })
  }
})

// POST /api/notifications/birthday/sync
// 前端根据农历/循环规则计算“今天需要提醒”的生日项，再由后端幂等入库通知中心
router.post('/birthday/sync', async (req, res) => {
  const entries = normalizeBirthdaySyncEntries(req.body?.entries)
  if (entries.length === 0) {
    return res.json({ success: true, data: { received: 0, accepted: 0, created: 0 } })
  }

  try {
    const birthdayIds = [...new Set(entries.map(item => item.birthday_id))]
    const birthdayRes = await pool.query(
      `SELECT id, title, solar_date, repeat_type, is_lunar, notify_enabled, notify_time, remind_offsets
       FROM birthdays
       WHERE user_id = $1
         AND id = ANY($2::int[])`,
      [req.user.id, birthdayIds]
    )

    const birthdayMap = new Map()
    for (const row of birthdayRes.rows) {
      birthdayMap.set(Number(row.id), row)
    }

    const today = toShanghaiDateString()
    const nowTime = toShanghaiTimeString()
    const logsToInsert = []
    const notificationsByKey = new Map()

    for (const entry of entries) {
      const birthday = birthdayMap.get(entry.birthday_id)
      if (!birthday || !birthday.notify_enabled) continue

      const offsets = Array.isArray(birthday.remind_offsets)
        ? birthday.remind_offsets.map(item => Number.parseInt(item, 10)).filter(Number.isInteger)
        : []
      if (!offsets.includes(entry.offset_days)) continue

      const notifyTime = String(birthday.notify_time || '').slice(0, 8)
      if (notifyTime && nowTime < notifyTime) continue

      const reminderDate = shiftDateByDays(entry.occurrence_date, -entry.offset_days)
      if (!reminderDate || reminderDate !== today) continue

      if (birthday.repeat_type === 'none' && String(birthday.solar_date).slice(0, 10) !== entry.occurrence_date) {
        continue
      }

      if (birthday.repeat_type === 'yearly' && !birthday.is_lunar) {
        if (!isValidSolarYearlyOccurrence(String(birthday.solar_date).slice(0, 10), entry.occurrence_date)) {
          continue
        }
      }

      const key = `${entry.birthday_id}|${entry.occurrence_date}|${entry.offset_days}`
      logsToInsert.push({
        user_id: req.user.id,
        birthday_id: entry.birthday_id,
        occurrence_date: entry.occurrence_date,
        offset_days: entry.offset_days
      })

      notificationsByKey.set(key, {
        userId: req.user.id,
        type: NOTIFICATION_TYPES.BIRTHDAY_REMINDER,
        source: 'birthday_sync',
        title: entry.offset_days === 0 ? '生日当天提醒' : '生日临近提醒',
        content: buildBirthdayReminderContent(birthday.title, entry.offset_days),
        linkUrl: '/calendar',
        payload: {
          birthday_id: entry.birthday_id,
          occurrence_date: entry.occurrence_date,
          offset_days: entry.offset_days
        }
      })
    }

    if (logsToInsert.length === 0) {
      return res.json({ success: true, data: { received: entries.length, accepted: 0, created: 0 } })
    }

    const insertRes = await pool.query(
      `INSERT INTO birthday_notification_logs (user_id, birthday_id, occurrence_date, offset_days)
       SELECT x.user_id, x.birthday_id, x.occurrence_date::date, x.offset_days
       FROM jsonb_to_recordset($1::jsonb) AS x(
         user_id INTEGER,
         birthday_id INTEGER,
         occurrence_date TEXT,
         offset_days INTEGER
       )
       ON CONFLICT (user_id, birthday_id, occurrence_date, offset_days) DO NOTHING
       RETURNING birthday_id, occurrence_date, offset_days`,
      [JSON.stringify(logsToInsert)]
    )

    const toCreate = []
    for (const row of insertRes.rows) {
      const key = `${row.birthday_id}|${String(row.occurrence_date).slice(0, 10)}|${row.offset_days}`
      const item = notificationsByKey.get(key)
      if (item) toCreate.push(item)
    }

    const createdRes = await createNotifications(toCreate)

    let push = null
    if (toCreate.length > 0) {
      const pushTitle = toCreate.length === 1 ? toCreate[0].title : '生日提醒'
      const pushBody = toCreate.length === 1
        ? toCreate[0].content
        : `你有 ${toCreate.length} 条生日提醒，点击查看`

      try {
        push = await sendPushToUser(req.user.id, {
          title: `🎂 ${pushTitle}`,
          body: pushBody,
          url: '/notifications?type=birthday_reminder'
        })
      } catch (pushErr) {
        console.error('生日提醒 Push 发送失败:', pushErr)
      }
    }

    res.json({
      success: true,
      data: {
        received: entries.length,
        accepted: logsToInsert.length,
        created: Number(createdRes.created || 0),
        push
      }
    })
  } catch (err) {
    if (err?.code === '42P01') {
      return res.status(503).json({ success: false, message: '生日提醒通知尚未初始化，请先执行数据库迁移' })
    }
    console.error('生日提醒同步失败:', err)
    res.status(500).json({ success: false, message: '生日提醒同步失败' })
  }
})

// PATCH /api/notifications/read/all
router.patch('/read/all', async (req, res) => {
  const type = normalizeTypeFilter(req.body?.type)
  const params = [req.user.id]
  let typeClause = ''

  if (type !== 'all') {
    params.push(type)
    typeClause = ` AND type = $${params.length}`
  }

  try {
    const result = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE,
           read_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1
         AND is_read = FALSE
         ${typeClause}`,
      params
    )

    res.json({
      success: true,
      message: `已标记 ${result.rowCount} 条通知为已读`,
      data: { affected: result.rowCount }
    })
  } catch (err) {
    console.error('全部已读失败:', err)
    res.status(500).json({ success: false, message: '批量已读失败' })
  }
})

// PATCH /api/notifications/read/batch
router.patch('/read/batch', async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map(id => Number.parseInt(id, 10)).filter(id => Number.isInteger(id) && id > 0)
    : []

  if (ids.length === 0) {
    return res.status(400).json({ success: false, message: '请传入要批量已读的通知 ID' })
  }
  if (ids.length > 500) {
    return res.status(400).json({ success: false, message: '单次批量数量不能超过 500 条' })
  }

  try {
    const result = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE,
           read_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1
         AND id = ANY($2::bigint[])
         AND is_read = FALSE`,
      [req.user.id, ids]
    )

    res.json({
      success: true,
      message: `已标记 ${result.rowCount} 条通知为已读`,
      data: { affected: result.rowCount }
    })
  } catch (err) {
    console.error('批量已读失败:', err)
    res.status(500).json({ success: false, message: '批量已读失败' })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: '通知 ID 无效' })
  }

  try {
    const result = await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE,
           read_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2
       RETURNING id, is_read, read_at`,
      [id, req.user.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '通知不存在' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('通知已读失败:', err)
    res.status(500).json({ success: false, message: '通知已读失败' })
  }
})

module.exports = router
