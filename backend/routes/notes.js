const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')
const {
  parseNotesListOptions,
  buildNotesWhereClause,
  buildNotesListMeta
} = require('../utils/notes-list-query')

// 获取所有记事（支持搜索、标签过滤）
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { hasPagination, pageNum, limitNum, offset } = parseNotesListOptions(req.query)
    const { whereClause, params: whereParams, paramIdx } = buildNotesWhereClause(req.query)
    const params = [req.user.id]
    params.push(...whereParams)

    const orderByClause = ` ORDER BY is_pinned DESC, updated_at DESC`

    if (!hasPagination) {
      const query = `
        SELECT * FROM notes
        ${whereClause}
        ${orderByClause}
      `
      const result = await pool.query(query, params)
      return res.json({ success: true, data: result.rows })
    }

    const listQuery = `
      SELECT * FROM notes
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `
    const countQuery = `
      SELECT COUNT(*) AS count
      FROM notes
      ${whereClause}
    `

    const [listResult, countResult] = await Promise.all([
      pool.query(listQuery, [...params, limitNum, offset]),
      pool.query(countQuery, params)
    ])

    const meta = buildNotesListMeta(countResult.rows[0]?.count, pageNum, limitNum)

    res.json({
      success: true,
      data: listResult.rows,
      ...meta
    })
  } catch (err) {
    console.error('获取记事错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 获取记事详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记事不存在' })
    }
    // 获取关联的日历日期
    const calResult = await pool.query(
      'SELECT calendar_date FROM calendar_notes WHERE note_id = $1',
      [req.params.id]
    )
    const note = result.rows[0]
    note.calendar_dates = calResult.rows.map(r => r.calendar_date)
    res.json({ success: true, data: note })
  } catch (err) {
    console.error('获取记事详情错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 创建记事
router.post('/', authMiddleware, async (req, res) => {
  const { title, content, color, tags, calendar_dates } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content, color, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.id,
        title || '无标题',
        content || '',
        color || '#FFFFFF',
        tags || []
      ]
    )
    const note = result.rows[0]

    // 如果提供了日历日期，创建关联
    if (calendar_dates && calendar_dates.length > 0) {
      for (const date of calendar_dates) {
        await pool.query(
          'INSERT INTO calendar_notes (user_id, note_id, calendar_date) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [req.user.id, note.id, date]
        )
      }
    }

    res.status(201).json({ success: true, message: '记事创建成功', data: note })
  } catch (err) {
    console.error('创建记事错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 更新记事
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, content, color, tags, is_pinned, is_archived, calendar_dates } = req.body

  try {
    const checkResult = await pool.query(
      'SELECT id FROM notes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记事不存在' })
    }

    const result = await pool.query(
      `UPDATE notes
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           color = COALESCE($3, color),
           tags = COALESCE($4, tags),
           is_pinned = COALESCE($5, is_pinned),
           is_archived = COALESCE($6, is_archived)
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [title, content, color, tags, is_pinned, is_archived, req.params.id, req.user.id]
    )

    // 更新日历关联
    if (calendar_dates !== undefined) {
      await pool.query('DELETE FROM calendar_notes WHERE note_id = $1', [req.params.id])
      for (const date of calendar_dates) {
        await pool.query(
          'INSERT INTO calendar_notes (user_id, note_id, calendar_date) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [req.user.id, req.params.id, date]
        )
      }
    }

    res.json({ success: true, message: '记事更新成功', data: result.rows[0] })
  } catch (err) {
    console.error('更新记事错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 删除记事
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记事不存在' })
    }
    res.json({ success: true, message: '记事已删除' })
  } catch (err) {
    console.error('删除记事错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

module.exports = router
