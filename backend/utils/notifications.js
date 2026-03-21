const pool = require('../config/db')

const NOTIFICATION_TYPES = {
  PUSH: 'push',
  DUE_REMINDER: 'due_reminder',
  SYSTEM: 'system'
}

const VALID_TYPES = new Set(Object.values(NOTIFICATION_TYPES))

function normalizeType(rawType) {
  const value = String(rawType || '').trim()
  if (VALID_TYPES.has(value)) return value
  if (value === 'due') return NOTIFICATION_TYPES.DUE_REMINDER
  return NOTIFICATION_TYPES.SYSTEM
}

function normalizeText(raw, fallback = '') {
  return String(raw || fallback).trim()
}

function normalizeUrl(rawUrl) {
  const value = String(rawUrl || '').trim()
  if (!value) return '/plans'
  if (/^https?:\/\//i.test(value)) return value
  return value.startsWith('/') ? value : `/${value}`
}

function normalizePayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {}
  }
  return rawPayload
}

function normalizeNotification(input) {
  if (!input || !Number.isInteger(Number(input.userId)) || Number(input.userId) <= 0) {
    return null
  }

  const title = normalizeText(input.title)
  const content = normalizeText(input.content)
  if (!title || !content) return null

  return {
    user_id: Number(input.userId),
    type: normalizeType(input.type),
    source: normalizeText(input.source, 'app').slice(0, 40) || 'app',
    title: title.slice(0, 120),
    content,
    link_url: normalizeUrl(input.linkUrl).slice(0, 300),
    payload: normalizePayload(input.payload)
  }
}

function isMissingTableError(err) {
  return err?.code === '42P01'
}

async function createUserNotification(input) {
  const row = normalizeNotification(input)
  if (!row) return { created: 0 }

  try {
    await pool.query(
      `INSERT INTO user_notifications
        (user_id, type, source, title, content, link_url, payload)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        row.user_id,
        row.type,
        row.source,
        row.title,
        row.content,
        row.link_url,
        JSON.stringify(row.payload)
      ]
    )
    return { created: 1 }
  } catch (err) {
    if (isMissingTableError(err)) return { created: 0 }
    throw err
  }
}

async function createNotifications(items = []) {
  const normalized = items
    .map(normalizeNotification)
    .filter(Boolean)

  if (normalized.length === 0) return { created: 0 }

  try {
    await pool.query(
      `INSERT INTO user_notifications
        (user_id, type, source, title, content, link_url, payload)
       SELECT
        x.user_id,
        x.type,
        x.source,
        x.title,
        x.content,
        x.link_url,
        x.payload::jsonb
       FROM jsonb_to_recordset($1::jsonb) AS x(
        user_id INTEGER,
        type TEXT,
        source TEXT,
        title TEXT,
        content TEXT,
        link_url TEXT,
        payload JSONB
       )`,
      [JSON.stringify(normalized)]
    )
    return { created: normalized.length }
  } catch (err) {
    if (isMissingTableError(err)) return { created: 0 }
    throw err
  }
}

async function createNotificationsForPushSubscribers(input = {}) {
  const title = normalizeText(input.title)
  const content = normalizeText(input.content)
  if (!title || !content) return { created: 0 }

  try {
    const usersRes = await pool.query(
      `SELECT DISTINCT user_id
       FROM push_subscriptions
       WHERE user_id IS NOT NULL`
    )

    if (usersRes.rowCount === 0) return { created: 0 }

    const rows = usersRes.rows.map(item => ({
      userId: item.user_id,
      type: input.type || NOTIFICATION_TYPES.SYSTEM,
      source: input.source || 'admin_push',
      title,
      content,
      linkUrl: input.linkUrl || '/plans',
      payload: input.payload || {}
    }))

    return createNotifications(rows)
  } catch (err) {
    if (isMissingTableError(err)) return { created: 0 }
    throw err
  }
}

module.exports = {
  NOTIFICATION_TYPES,
  createUserNotification,
  createNotifications,
  createNotificationsForPushSubscribers
}
