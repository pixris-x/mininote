const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')

// 获取消费记录列表（支持月份筛选、分类筛选、分页）
router.get('/', authMiddleware, async (req, res) => {
  const { year, month, category_id, page = 1, limit = 50 } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  try {
    let query = `
      SELECT e.*, ec.name AS category_name, ec.icon AS category_icon, ec.color AS category_color
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.user_id = $1
    `
    const params = [req.user.id]
    let idx = 2

    if (year && month) {
      query += ` AND EXTRACT(YEAR FROM e.expense_date) = $${idx} AND EXTRACT(MONTH FROM e.expense_date) = $${idx + 1}`
      params.push(Number(year), Number(month))
      idx += 2
    } else if (year) {
      query += ` AND EXTRACT(YEAR FROM e.expense_date) = $${idx}`
      params.push(Number(year))
      idx++
    }

    if (category_id) {
      query += ` AND e.category_id = $${idx}`
      params.push(Number(category_id))
      idx++
    }

    query += ` ORDER BY e.expense_date DESC, e.created_at DESC`
    query += ` LIMIT $${idx} OFFSET $${idx + 1}`
    params.push(Number(limit), offset)

    const result = await pool.query(query, params)

    // 总条数（用于分页）
    let countQuery = `SELECT COUNT(*) FROM expenses e WHERE e.user_id = $1`
    const countParams = [req.user.id]
    let ci = 2
    if (year && month) {
      countQuery += ` AND EXTRACT(YEAR FROM e.expense_date) = $${ci} AND EXTRACT(MONTH FROM e.expense_date) = $${ci + 1}`
      countParams.push(Number(year), Number(month))
      ci += 2
    }
    if (category_id) {
      countQuery += ` AND e.category_id = $${ci}`
      countParams.push(Number(category_id))
    }
    const countResult = await pool.query(countQuery, countParams)

    res.json({
      success: true,
      data: result.rows,
      total: Number(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    })
  } catch (err) {
    console.error('获取消费记录错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 获取统计数据（按年月）
router.get('/stats', authMiddleware, async (req, res) => {
  const { year, month } = req.query
  if (!year || !month) {
    return res.status(400).json({ success: false, message: '请提供年份和月份' })
  }

  try {
    // 本月总支出
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM expenses
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM expense_date) = $2
         AND EXTRACT(MONTH FROM expense_date) = $3`,
      [req.user.id, Number(year), Number(month)]
    )

    // 今日支出
    const todayResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = $1 AND expense_date = CURRENT_DATE`,
      [req.user.id]
    )

    // 按分类汇总
    const categoryResult = await pool.query(
      `SELECT ec.id, ec.name, ec.icon, ec.color,
              COALESCE(SUM(e.amount), 0) AS total,
              COUNT(e.id) AS count
       FROM expense_categories ec
       LEFT JOIN expenses e ON e.category_id = ec.id
         AND e.user_id = $1
         AND EXTRACT(YEAR FROM e.expense_date) = $2
         AND EXTRACT(MONTH FROM e.expense_date) = $3
       WHERE ec.user_id IS NULL OR ec.user_id = $1
       GROUP BY ec.id, ec.name, ec.icon, ec.color
       HAVING SUM(e.amount) > 0
       ORDER BY total DESC`,
      [req.user.id, Number(year), Number(month)]
    )

    // 本月每天支出（用于绘制走势）
    const dailyResult = await pool.query(
      `SELECT expense_date::text AS date, COALESCE(SUM(amount), 0) AS total
       FROM expenses
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM expense_date) = $2
         AND EXTRACT(MONTH FROM expense_date) = $3
       GROUP BY expense_date
       ORDER BY expense_date ASC`,
      [req.user.id, Number(year), Number(month)]
    )

    res.json({
      success: true,
      data: {
        monthly_total: Number(totalResult.rows[0].total),
        monthly_count: Number(totalResult.rows[0].count),
        today_total: Number(todayResult.rows[0].total),
        category_breakdown: categoryResult.rows.map(r => ({
          ...r,
          total: Number(r.total),
          count: Number(r.count)
        })),
        daily_trend: dailyResult.rows.map(r => ({
          date: r.date,
          total: Number(r.total)
        }))
      }
    })
  } catch (err) {
    console.error('获取消费统计错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 新增消费记录
router.post('/', authMiddleware, async (req, res) => {
  const { category_id, amount, note, expense_date } = req.body
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: '金额必须大于 0' })
  }
  try {
    const result = await pool.query(
      `INSERT INTO expenses (user_id, category_id, amount, note, expense_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.id,
        category_id || null,
        Number(amount).toFixed(2),
        note?.trim() || '',
        expense_date || new Date().toISOString().split('T')[0]
      ]
    )
    // 补充分类信息
    const expense = result.rows[0]
    if (expense.category_id) {
      const cat = await pool.query('SELECT name, icon, color FROM expense_categories WHERE id = $1', [expense.category_id])
      if (cat.rows.length > 0) {
        expense.category_name = cat.rows[0].name
        expense.category_icon = cat.rows[0].icon
        expense.category_color = cat.rows[0].color
      }
    }
    res.json({ success: true, data: expense })
  } catch (err) {
    console.error('新增消费记录错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 修改消费记录
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { category_id, amount, note, expense_date } = req.body
  try {
    const result = await pool.query(
      `UPDATE expenses
       SET category_id = $1,
           amount      = $2,
           note        = $3,
           expense_date = $4,
           updated_at  = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        category_id || null,
        amount ? Number(amount).toFixed(2) : undefined,
        note?.trim() ?? '',
        expense_date,
        id,
        req.user.id
      ]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('修改消费记录错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 删除消费记录
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      `DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' })
    }
    res.json({ success: true, message: '已删除' })
  } catch (err) {
    console.error('删除消费记录错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

module.exports = router
