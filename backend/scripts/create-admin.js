/**
 * 创建/重置管理员账号
 * 运行: node scripts/create-admin.js
 * 可通过 ADMIN_USER / ADMIN_PASS 环境变量自定义
 */
const pool = require('../config/db')
const bcrypt = require('bcryptjs')
require('dotenv').config()

async function createAdmin() {
  const username = process.env.ADMIN_USER || 'admin'
  const password = process.env.ADMIN_PASS || 'admin123456'
  const email = process.env.ADMIN_EMAIL || 'admin@minilist.app'

  console.log('👑 创建管理员账号...')
  console.log(`   用户名: ${username}`)
  console.log(`   邮箱:   ${email}`)

  try {
    await pool.query('SELECT 1')
    const hash = await bcrypt.hash(password, 10)

    await pool.query(`
      INSERT INTO users (username, email, password_hash, nickname, is_admin)
      VALUES ($1, $2, $3, '管理员', TRUE)
      ON CONFLICT (username) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            is_admin = TRUE,
            nickname = '管理员'
    `, [username, email, hash])

    console.log('✅ 管理员账号创建/更新成功！')
    console.log(`   登录账号: ${username}`)
    console.log(`   登录密码: ${password}`)
    console.log('⚠️  请登录后及时修改默认密码！')
  } catch (err) {
    console.error('❌ 创建失败:', err.message)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

createAdmin()
