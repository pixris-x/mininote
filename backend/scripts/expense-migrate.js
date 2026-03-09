const fs = require('fs')
const path = require('path')
const pool = require('../config/db')

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '../config/expense-migrate.sql'), 'utf8')
  try {
    await pool.query(sql)
    console.log('✅ 记账模块迁移完成：expense_categories + expenses 表已创建，默认分类已插入')
  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

run()
