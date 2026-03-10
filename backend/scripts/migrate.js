/**
 * 统一数据库迁移脚本
 * 运行: node scripts/migrate.js
 *
 * 迁移文件按顺序存放于 config/migrations/ 目录：
 *   001_admin_and_logs.sql   — is_admin 字段 + system_logs 表
 *   002_expense.sql          — 记账分类 + 消费记录表
 *   003_password_reset.sql   — 密码重置验证码表
 *
 * 已执行的迁移记录在 schema_migrations 表中，不会重复执行。
 */
const pool = require('../config/db')
const fs   = require('fs')
const path = require('path')

const MIGRATIONS_DIR = path.join(__dirname, '../config/migrations')

/** 确保迁移历史表存在 */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

/** 获取已执行的迁移文件名集合 */
async function getAppliedMigrations(client) {
  const { rows } = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  )
  return new Set(rows.map(r => r.filename))
}

async function migrate() {
  console.log('🔧 开始数据库迁移...')
  const client = await pool.connect()

  try {
    await client.query('SELECT 1')
    console.log('✅ 数据库连接成功')

    await ensureMigrationsTable(client)
    const applied = await getAppliedMigrations(client)

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort()  // 按文件名（编号）顺序执行

    let count = 0
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭️  [跳过] ${file}`)
        continue
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')
        console.log(`✅ [执行] ${file}`)
        count++
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`迁移 ${file} 失败: ${err.message}`)
      }
    }

    if (count === 0) {
      console.log('✨ 所有迁移均已应用，无需执行')
    } else {
      console.log(`\n🎉 迁移完成，本次执行了 ${count} 个文件`)
      console.log('💡 如需创建管理员账号，运行: node scripts/create-admin.js')
    }
  } catch (err) {
    console.error('❌ 迁移失败:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
