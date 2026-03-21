/**
 * 记事测试数据脚本（默认插入 50 条）
 * 用法：
 *   node scripts/seed-notes.js
 *   node scripts/seed-notes.js --count=50
 *   node scripts/seed-notes.js --user=testuser --count=50
 *   node scripts/seed-notes.js --user=testuser --count=50 --replace
 *
 * 默认写入用户：admin
 */
const pool = require('../config/db')
require('dotenv').config()

const NOTE_COLORS = ['#FFFFFF', '#FFD6E0', '#D4F5E9', '#E4E8F8', '#FFE8D6', '#FFF8D6', '#D6EEFF']

const SCENES = [
  {
    title: '项目周会纪要',
    tags: ['工作', '会议', '项目'],
    body: [
      '今日重点：确认本周版本范围，排除风险项。',
      '待办：',
      '1. 登录页交互优化（含移动端适配）',
      '2. 计划列表卡片信息密度调整',
      '3. 分享页按钮对齐问题复测',
      '备注：周五 17:00 前完成联调。'
    ]
  },
  {
    title: '出行准备清单',
    tags: ['生活', '出行', '清单'],
    body: [
      '目的地：杭州',
      '出发时间：周六 08:15',
      '需要准备：身份证、充电器、雨伞、常用药',
      '路线：地铁 2 号线 -> 高铁站 -> G 字头列车',
      '提醒：提前 40 分钟到站。'
    ]
  },
  {
    title: '本周健身记录',
    tags: ['健康', '运动'],
    body: [
      '周一：慢跑 5km，配速 6\'20"/km',
      '周三：力量训练 45 分钟（上肢）',
      '周五：跳绳 1200 次 + 拉伸 15 分钟',
      '目标：下周增加一次核心训练。'
    ]
  },
  {
    title: '家用采购清单',
    tags: ['家庭', '购物'],
    body: [
      '本次预算：300 元以内',
      '必买：纸巾、洗衣液、垃圾袋、鸡蛋、牛奶',
      '可选：收纳盒、厨房去油喷雾',
      '备注：优先补齐日用品库存。'
    ]
  },
  {
    title: '学习计划复盘',
    tags: ['学习', '复盘'],
    body: [
      '本周学习时长：11.5 小时',
      '完成内容：Vue 组件通信、Pinia 状态管理、接口错误处理',
      '问题：对缓存策略理解不够深入',
      '下周目标：阅读 PWA 缓存策略文档并实践一遍。'
    ]
  },
  {
    title: '报销资料整理',
    tags: ['工作', '财务'],
    body: [
      '待提交：交通票据、住宿发票、打车电子行程单',
      '金额汇总：1268.40 元',
      '提交截止：本月 25 日 18:00',
      '提醒：发票抬头与税号需再次核对。'
    ]
  },
  {
    title: '周末陪伴计划',
    tags: ['家庭', '周末'],
    body: [
      '周六上午：公园散步 + 亲子阅读',
      '周六下午：科技馆展览',
      '周日上午：家务整理',
      '周日下午：一起做晚餐（番茄牛腩 + 蔬菜沙拉）。'
    ]
  },
  {
    title: '读书摘录',
    tags: ['阅读', '灵感'],
    body: [
      '“持续的小步改进，往往比一次性的爆发更有价值。”',
      '“好的系统不是不出错，而是能快速恢复。”',
      '思考：把“可恢复性”原则加到个人任务管理中。'
    ]
  },
  {
    title: '客户沟通要点',
    tags: ['工作', '沟通'],
    body: [
      '客户关注：交付时间、移动端体验、报表导出稳定性',
      '已确认：本周先交付基础版，增量需求下周排期',
      '风险：第三方接口限流策略暂未完全验证',
      '行动项：明天补一轮高峰并发测试。'
    ]
  },
  {
    title: '饮食记录',
    tags: ['健康', '饮食'],
    body: [
      '早餐：全麦面包 + 鸡蛋 + 黑咖啡',
      '午餐：鸡胸肉沙拉 + 玉米',
      '晚餐：杂粮饭 + 清炒西兰花 + 三文鱼',
      '饮水：约 2200ml'
    ]
  }
]

const EXTRA_TAGS = ['重要', '待办', '复查', '灵感', '紧急', '可延期', '已确认']

function parseArgs(argv) {
  const args = { count: 50, user: 'admin', replace: false }
  for (const part of argv.slice(2)) {
    if (part.startsWith('--count=')) {
      const n = parseInt(part.split('=')[1], 10)
      if (Number.isFinite(n)) args.count = n
    } else if (part.startsWith('--user=')) {
      args.user = part.split('=')[1] || ''
    } else if (part === '--replace') {
      args.replace = true
    }
  }
  args.count = Math.min(200, Math.max(1, args.count || 50))
  return args
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDateBetween(start, end) {
  const time = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  return new Date(time)
}

function fmtDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function uniqueArray(arr) {
  return [...new Set(arr)]
}

function buildNote(index, now) {
  const scene = pick(SCENES)
  const titleSuffix = ['跟进', '记录', '整理', '备忘', '计划', '复盘']
  const title = `${scene.title}-${pick(titleSuffix)} ${index + 1}`

  const extraLine = [
    `更新于 ${fmtDate(now)}，需要在下次例会前确认。`,
    '状态：进行中，存在少量待确认项。',
    '备注：如有变更请同步到群公告。',
    '已与相关同事沟通，等待最终反馈。'
  ]

  const content = [...scene.body, '', pick(extraLine)].join('\n')

  const tags = uniqueArray([
    ...scene.tags,
    Math.random() < 0.6 ? pick(EXTRA_TAGS) : null,
    Math.random() < 0.35 ? pick(EXTRA_TAGS) : null
  ].filter(Boolean)).slice(0, 5)

  const isPinned = Math.random() < 0.18
  const isArchived = !isPinned && Math.random() < 0.14
  const color = pick(NOTE_COLORS)

  const start = new Date(now)
  start.setDate(start.getDate() - 120)
  const createdAt = randomDateBetween(start, now)

  const updatedAt = new Date(createdAt)
  updatedAt.setDate(updatedAt.getDate() + randomInt(0, 18))
  if (updatedAt > now) updatedAt.setTime(now.getTime())

  const calendarDates = []
  const calendarCount = Math.random() < 0.5 ? randomInt(1, 3) : 0
  for (let i = 0; i < calendarCount; i++) {
    const d = new Date(createdAt)
    d.setDate(d.getDate() + randomInt(-5, 8))
    calendarDates.push(fmtDate(d))
  }

  return {
    title,
    content,
    color,
    tags,
    isPinned,
    isArchived,
    createdAt,
    updatedAt,
    calendarDates: uniqueArray(calendarDates)
  }
}

async function resolveUser(client, username) {
  if (username) {
    const byName = await client.query(
      'SELECT id, username, nickname FROM users WHERE username = $1 LIMIT 1',
      [username]
    )
    return byName.rows[0] || null
  }

  const nonAdmin = await client.query(
    'SELECT id, username, nickname FROM users WHERE is_admin = FALSE ORDER BY id ASC LIMIT 1'
  )
  if (nonAdmin.rows[0]) return nonAdmin.rows[0]

  const anyUser = await client.query(
    'SELECT id, username, nickname FROM users ORDER BY id ASC LIMIT 1'
  )
  return anyUser.rows[0] || null
}

async function seedNotes() {
  const args = parseArgs(process.argv)
  console.log('🌱 开始写入记事测试数据...')
  console.log(`   数量: ${args.count}`)
  console.log(`   用户: ${args.user}`)
  console.log(`   覆盖: ${args.replace ? '是（先清空该用户记事）' : '否（追加插入）'}`)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const user = await resolveUser(client, args.user)
    if (!user) {
      throw new Error('未找到可用用户，请先注册一个账号后再执行')
    }

    if (args.replace) {
      await client.query('DELETE FROM notes WHERE user_id = $1', [user.id])
    }

    const now = new Date()
    let linkedCalendarRows = 0
    let pinnedCount = 0
    let archivedCount = 0

    for (let i = 0; i < args.count; i++) {
      const n = buildNote(i, now)
      if (n.isPinned) pinnedCount++
      if (n.isArchived) archivedCount++

      const inserted = await client.query(
        `INSERT INTO notes (
          user_id, title, content, color, tags, is_pinned, is_archived, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          user.id,
          n.title,
          n.content,
          n.color,
          n.tags,
          n.isPinned,
          n.isArchived,
          n.createdAt,
          n.updatedAt
        ]
      )

      const noteId = inserted.rows[0].id
      for (const d of n.calendarDates) {
        await client.query(
          `INSERT INTO calendar_notes (user_id, note_id, calendar_date)
           VALUES ($1, $2, $3)
           ON CONFLICT (note_id, calendar_date) DO NOTHING`,
          [user.id, noteId, d]
        )
        linkedCalendarRows++
      }
    }

    await client.query('COMMIT')
    console.log('✅ 测试数据写入成功')
    console.log(`   目标用户: @${user.username}${user.nickname ? `（${user.nickname}）` : ''}`)
    console.log(`   新增记事: ${args.count}`)
    console.log(`   置顶数量: ${pinnedCount}`)
    console.log(`   归档数量: ${archivedCount}`)
    console.log(`   日历关联: ${linkedCalendarRows}`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ 写入失败:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

seedNotes()
