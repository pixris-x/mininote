const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'mini-note-test-secret'
}

const app = require('../app')
const pool = require('../config/db')

let server = null
let baseUrl = ''
let dbReady = false

function uid(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

async function createUser(client, prefix) {
  const username = uid(prefix)
  const email = `${username}@example.com`
  const result = await client.query(
    `INSERT INTO users (username, email, password_hash, nickname, is_admin)
     VALUES ($1, $2, $3, $4, FALSE)
     RETURNING id, username`,
    [username, email, 'test_hash', `${prefix}_nick`]
  )
  return result.rows[0]
}

async function createSharedPlanWithSteps(client, userId, stepCount = 2) {
  const token = uid('sharetoken')
  const pin = '1234'

  const planRes = await client.query(
    `INSERT INTO plans (user_id, title, description, color, icon, status, share_token, share_pin)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
     RETURNING id, title`,
    [userId, `分享计划_${uid('title')}`, '测试导入', '#FFD6E0', 'target', token, pin]
  )
  const plan = planRes.rows[0]

  for (let i = 0; i < stepCount; i++) {
    await client.query(
      `INSERT INTO plan_steps
         (plan_id, user_id, title, description, status, badge, badge_color, due_date, start_date, sort_order, image_urls, location)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, CURRENT_DATE + INTERVAL '2 day', CURRENT_DATE + INTERVAL '1 day', $7, $8::jsonb, $9)`,
      [
        plan.id,
        userId,
        `源步骤_${i + 1}`,
        `源描述_${i + 1}`,
        i === 0 ? '重要' : '',
        i === 0 ? '#ff6b6b' : '',
        i + 1,
        JSON.stringify([`/uploads/images/demo_${i + 1}.png`]),
        `地点_${i + 1}`
      ]
    )
  }

  return { plan, token, pin }
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
}

async function cleanupUsers(client, userIds = []) {
  for (const id of userIds) {
    if (!id) continue
    await client.query('DELETE FROM users WHERE id = $1', [id])
  }
}

test.before(async () => {
  try {
    await pool.query('SELECT 1')
    dbReady = true
  } catch {
    dbReady = false
  }

  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
  await pool.end()
})

test('POST /api/plans/import-share: 成功导入计划与步骤', async (t) => {
  if (!dbReady) t.skip('数据库不可用，跳过集成测试')

  const client = await pool.connect()
  let sourceUser = null
  let targetUser = null
  try {
    sourceUser = await createUser(client, 'src_ok')
    targetUser = await createUser(client, 'dst_ok')
    const shared = await createSharedPlanWithSteps(client, sourceUser.id, 3)

    const token = makeToken(targetUser)
    const resp = await fetch(`${baseUrl}/api/plans/import-share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ token: shared.token, pin: shared.pin })
    })
    const body = await resp.json()

    assert.equal(resp.status, 200)
    assert.equal(body.success, true)

    const importedPlanRes = await client.query(
      'SELECT id FROM plans WHERE user_id = $1 AND title = $2 ORDER BY id DESC LIMIT 1',
      [targetUser.id, shared.plan.title]
    )
    assert.equal(importedPlanRes.rowCount, 1)

    const importedPlanId = importedPlanRes.rows[0].id
    const importedStepsRes = await client.query(
      'SELECT COUNT(*)::int AS count FROM plan_steps WHERE plan_id = $1 AND user_id = $2',
      [importedPlanId, targetUser.id]
    )
    assert.equal(importedStepsRes.rows[0].count, 3)
  } finally {
    await cleanupUsers(client, [sourceUser?.id, targetUser?.id])
    client.release()
  }
})

test('POST /api/plans/import-share: 步骤插入失败时回滚，不残留计划', async (t) => {
  if (!dbReady) t.skip('数据库不可用，跳过集成测试')

  const client = await pool.connect()
  let sourceUser = null
  let targetUser = null
  try {
    sourceUser = await createUser(client, 'src_fail')
    targetUser = await createUser(client, 'dst_fail')
    const shared = await createSharedPlanWithSteps(client, sourceUser.id, 2)
    const failFunction = uid('fn_fail_import_steps')
    const failTrigger = uid('trg_fail_import_steps')

    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION ${failFunction}()
        RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'forced failure for rollback test';
        END;
        $$ LANGUAGE plpgsql;
      `)
      await client.query(`
        CREATE TRIGGER ${failTrigger}
        BEFORE INSERT ON plan_steps
        FOR EACH ROW
        WHEN (NEW.user_id = ${targetUser.id})
        EXECUTE FUNCTION ${failFunction}();
      `)

      const token = makeToken(targetUser)
      const resp = await fetch(`${baseUrl}/api/plans/import-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token: shared.token, pin: shared.pin })
      })
      const body = await resp.json()

      assert.equal(resp.status, 500)
      assert.equal(body.success, false)

      const leakedPlanRes = await client.query(
        'SELECT COUNT(*)::int AS count FROM plans WHERE user_id = $1 AND title = $2',
        [targetUser.id, shared.plan.title]
      )
      assert.equal(leakedPlanRes.rows[0].count, 0)
    } finally {
      await client.query(`DROP TRIGGER IF EXISTS ${failTrigger} ON plan_steps`)
      await client.query(`DROP FUNCTION IF EXISTS ${failFunction}()`)
    }
  } finally {
    await cleanupUsers(client, [sourceUser?.id, targetUser?.id])
    client.release()
  }
})
