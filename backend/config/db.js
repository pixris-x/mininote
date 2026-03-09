const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
})

pool.on('connect', () => {
  console.log('✅ PostgreSQL 数据库连接成功')
})

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 连接错误:', err)
})

module.exports = pool
