const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

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
