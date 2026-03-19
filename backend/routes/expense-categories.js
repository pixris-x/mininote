const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authMiddleware = require('../middleware/auth')
const { DEFAULT_EXPENSE_ICON, toExpenseIconKey } = require('../utils/expense-icons')

// 获取所有可用分类（系统默认 + 当前用户自定义）
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM expense_categories
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY is_default DESC, sort_order ASC, created_at ASC`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('获取消费分类错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 新增自定义分类
router.post('/', authMiddleware, async (req, res) => {
  const { name, icon, color } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: '分类名称不能为空' })
  }
  const hasIconField = Object.prototype.hasOwnProperty.call(req.body, 'icon')
  let iconValue = DEFAULT_EXPENSE_ICON
  if (hasIconField) {
    const raw = String(icon ?? '').trim()
    if (!raw) {
      return res.status(400).json({ success: false, message: '分类图标不能为空' })
    }
    const normalized = toExpenseIconKey(icon)
    if (!normalized) {
      return res.status(400).json({ success: false, message: '分类图标不合法' })
    }
    iconValue = normalized
  }
  try {
    // 检查同用户是否已存在同名分类
    const dup = await pool.query(
      `SELECT id FROM expense_categories
       WHERE (user_id = $1 OR user_id IS NULL) AND name = $2`,
      [req.user.id, name.trim()]
    )
    if (dup.rows.length > 0) {
      return res.status(400).json({ success: false, message: '该分类名称已存在' })
    }
    const result = await pool.query(
      `INSERT INTO expense_categories (user_id, name, icon, color, is_default)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING *`,
      [req.user.id, name.trim(), iconValue, color || '#a29bfe']
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('新增消费分类错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 修改自定义分类（只能改自己创建的）
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const { name, icon, color } = req.body
  let normalizedIcon = null
  if (Object.prototype.hasOwnProperty.call(req.body, 'icon')) {
    const raw = String(icon ?? '').trim()
    if (!raw) {
      return res.status(400).json({ success: false, message: '分类图标不能为空' })
    }
    normalizedIcon = toExpenseIconKey(icon)
    if (!normalizedIcon) {
      return res.status(400).json({ success: false, message: '分类图标不合法' })
    }
  }
  try {
    const result = await pool.query(
      `UPDATE expense_categories
       SET name = COALESCE($1, name),
           icon = COALESCE($2, icon),
           color = COALESCE($3, color)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name?.trim() || null, normalizedIcon, color || null, id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '分类不存在或无权限修改' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('修改消费分类错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

// 删除自定义分类（只能删自己创建的）
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(
      `DELETE FROM expense_categories WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '分类不存在或无权限删除' })
    }
    res.json({ success: true, message: '分类已删除' })
  } catch (err) {
    console.error('删除消费分类错误:', err)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
})

module.exports = router
