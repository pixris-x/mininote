/**
 * 密码重置功能迁移脚本
 * 运行: node scripts/reset-migrate.js
 */
const pool = require('../config/db')
const fs = require('fs')
const path = require('path')

async function migrate() {
  console.log('🔧 开始迁移：创建 password_reset_tokens 表...')
  try {
    await pool.query('SELECT 1')
    console.log('✅ 数据库连接成功')

    const sqlFile = path.join(__dirname, '../config/reset-migrate.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    await pool.query(sql)

    console.log('✅ 迁移完成：password_reset_tokens 表创建成功')
  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

migrate()
