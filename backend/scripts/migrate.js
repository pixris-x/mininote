/**
 * 数据库迁移脚本（为已有数据库添加新功能）
 * 运行: node scripts/migrate.js
 */
const pool = require('../config/db')
const fs = require('fs')
const path = require('path')

async function migrate() {
  console.log('🔧 开始数据库迁移...')
  try {
    await pool.query('SELECT 1')
    console.log('✅ 数据库连接成功')

    const sqlFile = path.join(__dirname, '../config/migrate.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    await pool.query(sql)

    console.log('✅ 迁移完成：添加 is_admin 字段 + system_logs 表')
    console.log('💡 如需创建管理员账号，运行: node scripts/create-admin.js')
  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

migrate()
