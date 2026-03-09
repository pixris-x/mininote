/**
 * 数据库初始化脚本
 * 运行: node scripts/init-db.js
 */
const pool = require('../config/db')
const fs = require('fs')
const path = require('path')

async function initDB() {
  console.log('🌸 开始初始化数据库...')
  
  try {
    // 测试连接
    await pool.query('SELECT 1')
    console.log('✅ 数据库连接成功')
    
    // 读取并执行 SQL 文件
    const sqlFile = path.join(__dirname, '../config/init.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    
    await pool.query(sql)
    console.log('✅ 数据库表结构创建成功')
    console.log('🎉 初始化完成！')
  } catch (err) {
    console.error('❌ 初始化失败:', err.message)
    console.error(err.detail || '')
  } finally {
    await pool.end()
    process.exit(0)
  }
}

initDB()
