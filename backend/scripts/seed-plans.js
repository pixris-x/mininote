/**
 * Seed realistic plans and plan steps for one user.
 *
 * Usage:
 *   node scripts/seed-plans.js
 *   node scripts/seed-plans.js --count=40
 *   node scripts/seed-plans.js --user=admin --count=50
 *   node scripts/seed-plans.js --user=admin --count=50 --min-steps=8 --max-steps=16
 *   node scripts/seed-plans.js --user=admin --replace
 */
const pool = require('../config/db')
require('dotenv').config()
const { DEFAULT_PLAN_ICON, toPlanIconKey } = require('../utils/plan-icons')

const PLAN_STATUS = ['active', 'completed', 'paused']
const STEP_STATUS = ['pending', 'in_progress', 'completed', 'skipped']
const BADGE_COLORS = ['#FF8BA7', '#6AA9FF', '#6BCB77', '#F59E0B', '#A78BFA', '#22A6B3']
const EXTRA_STEP_POOL = [
  '补充资料',
  '跨团队同步',
  '风险跟踪',
  '阶段复盘',
  '经验沉淀',
  '结果归档',
  '资源确认',
  '待办清理'
]

const SCENARIOS = [
  {
    titles: ['MiniList 协作功能上线', '年度版本 2.0 发布', '移动端体验优化发布', '计划模块稳定性冲刺'],
    icons: ['rocket', 'flask', 'target', 'sparkles'],
    colors: ['#FFE8D6', '#FFF8D6', '#E4E8F8', '#D6EEFF'],
    summaries: ['聚焦版本交付与体验稳定。', '围绕关键路径推进，控制上线风险。'],
    goals: ['核心功能按期上线', '关键指标提升 10% 以上', '线上严重故障为 0'],
    focus: ['跨端一致性', '接口稳定性', '监控告警', '灰度观察'],
    risks: ['第三方接口限流', '跨团队排期冲突', '回归时间不足'],
    locations: ['线上会议', '深圳办公室', '上海研发中心', '远程协作'],
    stakeholders: ['产品经理', '前端负责人', '后端负责人', '测试同学', '运营同学'],
    deliverables: ['需求说明', '回归报告', '发布清单', '复盘纪要', '监控截图'],
    criteria: ['关键流程可用', '核心指标正常', '无 P0/P1 缺陷', '灰度反馈稳定'],
    steps: [
      '确认版本范围',
      '需求与排期对齐',
      '交互和视觉走查',
      '接口联调',
      '核心功能自测',
      '回归测试与缺陷修复',
      '发布前 checklist',
      '灰度发布',
      '上线监控',
      '收集反馈与复盘'
    ]
  },
  {
    titles: ['日本关西旅行计划', '云南深度游行程', '周末城市漫游清单', '亲子出行安排'],
    icons: ['globe', 'heart', 'sparkles'],
    colors: ['#D6EEFF', '#E4E8F8', '#FFE8D6', '#FFF8D6'],
    summaries: ['以轻松体验为主，兼顾交通和预算。', '优先保证行程可执行，减少临时变更。'],
    goals: ['行程顺畅不赶路', '预算控制在预期范围', '关键体验全部打卡'],
    focus: ['交通衔接', '住宿位置', '天气变化', '预算分配'],
    risks: ['航班延误', '热门景点排队', '天气波动'],
    locations: ['线上', '虹桥站', '浦东机场', '酒店', '景点周边'],
    stakeholders: ['同行伙伴', '家人', '酒店客服', '租车平台'],
    deliverables: ['行程表', '酒店预订单', '交通票据', '预算明细', '应急清单'],
    criteria: ['证件齐全', '交通安排完整', '住宿与景点匹配', '预算有余量'],
    steps: [
      '确定出行日期',
      '确认目的地与路线',
      '预订交通',
      '预订住宿',
      '整理景点清单',
      '安排每日行程',
      '准备证件和行李',
      '确认天气与穿搭',
      '出发前最终检查',
      '旅行后整理照片与花费'
    ]
  },
  {
    titles: ['半程马拉松备赛', '体脂管理 12 周计划', '增肌训练周期', '跑步习惯养成'],
    icons: ['dumbbell', 'trophy', 'heart', 'target'],
    colors: ['#D4F5E9', '#E2F0CB', '#D6EEFF', '#FFF8D6'],
    summaries: ['循序渐进提升体能，减少受伤风险。', '关注训练、饮食和恢复的平衡。'],
    goals: ['稳定完成训练周计划', '提升配速与耐力', '保持健康恢复'],
    focus: ['训练频率', '睡眠质量', '饮食结构', '心率控制'],
    risks: ['训练过量', '恢复不足', '临时中断'],
    locations: ['健身房', '小区跑道', '公园', '家中'],
    stakeholders: ['教练', '训练搭子', '营养师', '自己'],
    deliverables: ['训练记录', '体测数据', '饮食记录', '周复盘'],
    criteria: ['训练完成率 >= 80%', '无明显伤痛', '数据趋势改善'],
    steps: [
      '设定训练目标',
      '完成基础体测',
      '制定周训练安排',
      '安排力量训练',
      '安排耐力训练',
      '记录训练和心率',
      '调整饮食结构',
      '安排主动恢复',
      '每周复盘',
      '赛前减量与状态调整'
    ]
  },
  {
    titles: ['前端工程师求职冲刺', '春招面试计划', '简历与作品集升级', '技术面准备清单'],
    icons: ['target', 'lightbulb', 'book', 'rocket'],
    colors: ['#E4E8F8', '#D6EEFF', '#FFF8D6', '#FFE8D6'],
    summaries: ['围绕投递-面试-复盘形成闭环。', '兼顾八股、项目表达和实战题训练。'],
    goals: ['提升面试通过率', '完成高质量投递', '形成可复用面试素材'],
    focus: ['简历亮点', '项目表达', '算法基础', '行为面试'],
    risks: ['准备方向分散', '投递节奏不稳定', '复盘不及时'],
    locations: ['线上', '家中', '联合办公空间', '面试现场'],
    stakeholders: ['内推朋友', '面试官', '招聘 HR', '求职伙伴'],
    deliverables: ['简历版本', '作品集链接', '面试题库', '复盘文档'],
    criteria: ['每周投递达标', '面试复盘完整', '薄弱点有改进动作'],
    steps: [
      '梳理目标岗位',
      '更新简历',
      '整理项目亮点',
      '准备自我介绍',
      '刷算法和手写题',
      '复习基础知识',
      '模拟技术面',
      '投递与跟进',
      '面试复盘',
      '优化下一轮准备'
    ]
  },
  {
    titles: ['内容账号增长计划', '30 天短视频挑战', '知识专栏更新计划', '品牌内容运营'],
    icons: ['sparkles', 'palette', 'lightbulb', 'rocket'],
    colors: ['#FFE8D6', '#FFF8D6', '#E4E8F8', '#D6EEFF'],
    summaries: ['提高内容质量与更新节奏。', '建立选题、制作、发布、复盘闭环。'],
    goals: ['稳定周更节奏', '提升互动率', '形成内容方法论'],
    focus: ['选题质量', '封面标题', '发布时间', '评论互动'],
    risks: ['创作疲劳', '选题撞车', '发布节奏中断'],
    locations: ['家中', '咖啡馆', '工作室', '户外拍摄点'],
    stakeholders: ['剪辑同学', '设计同学', '运营同学', '合作方'],
    deliverables: ['选题库', '脚本', '封面素材', '数据复盘', '合作清单'],
    criteria: ['更新按计划完成', '内容完播率提升', '互动质量改善'],
    steps: [
      '搭建选题库',
      '确认内容方向',
      '撰写脚本',
      '拍摄素材',
      '剪辑与调色',
      '封面和标题优化',
      '排期发布',
      '评论互动',
      '数据复盘',
      '迭代下一轮选题'
    ]
  },
  {
    titles: ['新家入住准备', '老房改造计划', '周末家务升级', '厨房收纳优化'],
    icons: ['sprout', 'heart', 'target', 'palette'],
    colors: ['#D4F5E9', '#E2F0CB', '#FFE8D6', '#FFF8D6'],
    summaries: ['提升居住体验，控制预算和施工节奏。', '优先处理高频使用区域。'],
    goals: ['按期入住', '预算不超支', '关键功能区可用'],
    focus: ['施工进度', '材料采购', '收纳规划', '清洁维护'],
    risks: ['施工延期', '材料断货', '预算超支'],
    locations: ['新房', '建材市场', '线上采购', '仓储点'],
    stakeholders: ['施工队', '设计师', '家人', '家电安装师傅'],
    deliverables: ['采购清单', '预算表', '验收记录', '入住清单'],
    criteria: ['关键工序验收通过', '家电安装完成', '预算可控'],
    steps: [
      '确认改造范围',
      '制定预算',
      '选定材料',
      '安排施工节点',
      '跟进水电木瓦油',
      '采购家具家电',
      '安排安装与验收',
      '收纳与清洁',
      '软装调整',
      '入住复盘'
    ]
  },
  {
    titles: ['年度学习成长计划', '考证冲刺安排', '技术专题学习路线', '英语提升计划'],
    icons: ['book', 'lightbulb', 'target', 'trophy'],
    colors: ['#E4E8F8', '#D6EEFF', '#FFF8D6', '#D4F5E9'],
    summaries: ['以阶段目标驱动学习执行。', '把学习计划落到周任务和可验证输出。'],
    goals: ['形成稳定学习节奏', '按阶段完成目标', '输出可复用笔记'],
    focus: ['时间分配', '练习反馈', '知识整理', '弱项突破'],
    risks: ['学习中断', '目标过大', '复习不足'],
    locations: ['家中', '图书馆', '自习室', '线上课堂'],
    stakeholders: ['学习伙伴', '老师', '自己'],
    deliverables: ['学习计划表', '阶段笔记', '练习记录', '错题清单'],
    criteria: ['周学习时长达标', '阶段测试通过', '笔记体系完整'],
    steps: [
      '确定学习目标',
      '拆分阶段任务',
      '制定每周计划',
      '完成基础课程',
      '专题练习',
      '阶段测试',
      '整理错题与笔记',
      '查漏补缺',
      '模拟演练',
      '阶段复盘'
    ]
  },
  {
    titles: ['家庭财务整理计划', '年度预算与记账优化', '消费结构分析项目', '储蓄目标推进'],
    icons: ['target', 'book', 'lightbulb', 'heart'],
    colors: ['#FFF8D6', '#D6EEFF', '#E4E8F8', '#D4F5E9'],
    summaries: ['明确收支结构，优化资金使用效率。', '通过数据复盘改进消费决策。'],
    goals: ['建立清晰账本体系', '完成月度预算执行', '提升储蓄率'],
    focus: ['固定支出', '可变支出', '应急储备', '预算偏差'],
    risks: ['临时大额支出', '记账中断', '预算执行偏差大'],
    locations: ['家中', '线上', '银行网点', '理财平台'],
    stakeholders: ['家人', '自己', '理财顾问'],
    deliverables: ['收支台账', '预算表', '月度分析报告', '优化建议'],
    criteria: ['记账完整率 >= 95%', '预算偏差可解释', '储蓄目标达成'],
    steps: [
      '汇总历史账单',
      '分类固定和可变支出',
      '制定月度预算',
      '设置记账规则',
      '每周核对流水',
      '识别异常消费',
      '调整预算策略',
      '评估储蓄进度',
      '月末总结',
      '制定下月优化动作'
    ]
  }
]

function parseArgs(argv) {
  const args = {
    count: 36,
    user: 'admin',
    replace: false,
    minSteps: 7,
    maxSteps: 14
  }

  for (const part of argv.slice(2)) {
    if (part === '--replace') args.replace = true
    else if (part.startsWith('--count=')) args.count = Number.parseInt(part.split('=')[1], 10)
    else if (part.startsWith('--plans=')) args.count = Number.parseInt(part.split('=')[1], 10)
    else if (part.startsWith('--user=')) args.user = part.split('=')[1] || ''
    else if (part.startsWith('--min-steps=')) args.minSteps = Number.parseInt(part.split('=')[1], 10)
    else if (part.startsWith('--max-steps=')) args.maxSteps = Number.parseInt(part.split('=')[1], 10)
  }

  if (!Number.isFinite(args.count)) args.count = 36
  if (!Number.isFinite(args.minSteps)) args.minSteps = 7
  if (!Number.isFinite(args.maxSteps)) args.maxSteps = 14

  args.count = Math.min(300, Math.max(1, args.count))
  args.minSteps = Math.min(30, Math.max(3, args.minSteps))
  args.maxSteps = Math.min(30, Math.max(3, args.maxSteps))
  if (args.minSteps > args.maxSteps) {
    const temp = args.minSteps
    args.minSteps = args.maxSteps
    args.maxSteps = temp
  }

  return args
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addHours(date, hours) {
  const next = new Date(date)
  next.setHours(next.getHours() + hours)
  return next
}

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function minDate(a, b) {
  return a < b ? a : b
}

function maxDate(a, b) {
  return a > b ? a : b
}

function shuffle(arr) {
  const copied = [...arr]
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copied[i]
    copied[i] = copied[j]
    copied[j] = tmp
  }
  return copied
}

function pickPlanStatus() {
  const r = Math.random()
  if (r < 0.62) return 'active'
  if (r < 0.87) return 'completed'
  return 'paused'
}

function pickBaseStart(now, planStatus) {
  if (planStatus === 'completed') return addDays(now, -randomInt(220, 45))
  if (planStatus === 'paused') return addDays(now, -randomInt(140, 20))
  return addDays(now, -randomInt(90, 7))
}

function pickProgressRatio(planStatus) {
  if (planStatus === 'completed') return randomFloat(0.88, 1.0)
  if (planStatus === 'paused') return randomFloat(0.18, 0.45)
  return randomFloat(0.35, 0.72)
}

function pickBadge(title, index, total) {
  if (index === 0) return { badge: '启动', badgeColor: '#6AA9FF' }
  if (index === total - 1) return { badge: '复盘', badgeColor: '#A78BFA' }

  if (/(上线|发布|出发|考试|入住|验收|交付)/.test(title)) {
    return { badge: '里程碑', badgeColor: '#F59E0B' }
  }

  if (Math.random() < 0.24) {
    return { badge: pick(['重点', '关注', '待确认', '阻塞风险']), badgeColor: pick(BADGE_COLORS) }
  }

  return { badge: '', badgeColor: '' }
}

function selectStepsForPlan(stepTitles, targetCount) {
  if (targetCount <= 0) return []
  if (stepTitles.length === 0) return []

  if (targetCount >= stepTitles.length) {
    const selected = [...stepTitles]
    let remain = targetCount - stepTitles.length
    while (remain > 0) {
      selected.push(pick(EXTRA_STEP_POOL))
      remain--
    }
    return selected
  }

  if (targetCount === 1) return [stepTitles[0]]
  if (targetCount === 2) return [stepTitles[0], stepTitles[stepTitles.length - 1]]

  const middle = stepTitles.slice(1, -1).map((title, idx) => ({ title, idx }))
  const middlePicked = shuffle(middle)
    .slice(0, targetCount - 2)
    .sort((a, b) => a.idx - b.idx)
    .map(item => item.title)

  return [stepTitles[0], ...middlePicked, stepTitles[stepTitles.length - 1]]
}

function buildStepDescription(stepTitle, scenario) {
  const lines = [
    `围绕「${stepTitle}」推进，确保节点按计划落地。`,
    `输出物：${pick(scenario.deliverables)}`,
    `协作对象：${pick(scenario.stakeholders)}`,
    `验收标准：${pick(scenario.criteria)}`
  ]

  if (Math.random() < 0.35) {
    lines.push(`当前关注：${pick(scenario.focus)}`)
  }

  return lines.join('\n')
}

function buildPlanDescription(scenario, status) {
  const statusLabel = status === 'active'
    ? '进行中'
    : status === 'completed'
      ? '已完成'
      : '已暂停'

  return [
    pick(scenario.summaries),
    `当前状态：${statusLabel}`,
    `关键目标：${pick(scenario.goals)}`,
    `当前关注：${pick(scenario.focus)}`,
    `潜在风险：${pick(scenario.risks)}`
  ].join('\n')
}

function safeIcon(icon) {
  return toPlanIconKey(icon) || DEFAULT_PLAN_ICON
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

function buildPlanPayload(index, args, now) {
  const scenario = pick(SCENARIOS)
  const status = pickPlanStatus()
  const baseStart = pickBaseStart(now, status)
  const planCreatedAt = addDays(baseStart, -randomInt(3, 20))
  const targetStepCount = randomInt(args.minSteps, args.maxSteps)
  const selectedStepTitles = selectStepsForPlan(scenario.steps, targetStepCount)
  const progressRatio = pickProgressRatio(status)

  const doneCount = Math.max(
    status === 'completed' ? 1 : 0,
    Math.min(
      selectedStepTitles.length,
      Math.floor(selectedStepTitles.length * progressRatio)
    )
  )

  const inProgressIndex = status === 'active' && doneCount < selectedStepTitles.length
    ? doneCount
    : -1

  let pointer = new Date(baseStart)
  const steps = []
  let lastStepUpdateAt = new Date(planCreatedAt)

  for (let i = 0; i < selectedStepTitles.length; i++) {
    const title = selectedStepTitles[i]
    const durationDays = randomInt(1, 6)
    const gapDays = randomInt(0, 3)
    const startDate = new Date(pointer)
    const dueDate = addDays(startDate, durationDays)
    pointer = addDays(dueDate, gapDays)

    let stepStatus = 'pending'
    if (status === 'completed') {
      stepStatus = i < doneCount ? (Math.random() < 0.1 ? 'skipped' : 'completed') : 'skipped'
    } else if (status === 'paused') {
      if (i < doneCount) stepStatus = Math.random() < 0.08 ? 'skipped' : 'completed'
      else stepStatus = Math.random() < 0.05 ? 'skipped' : 'pending'
    } else {
      if (i < doneCount) stepStatus = Math.random() < 0.07 ? 'skipped' : 'completed'
      else if (i === inProgressIndex && Math.random() < 0.86) stepStatus = 'in_progress'
      else stepStatus = 'pending'
    }

    if (!STEP_STATUS.includes(stepStatus)) stepStatus = 'pending'
    const { badge, badgeColor } = pickBadge(title, i, selectedStepTitles.length)

    const stepCreatedAt = maxDate(addDays(startDate, -randomInt(1, 6)), planCreatedAt)
    let completedAt = null
    let stepUpdatedAt = new Date(stepCreatedAt)

    if (stepStatus === 'completed') {
      const completionUpperBound = minDate(addHours(dueDate, randomInt(2, 30)), now)
      const completionLowerBound = addHours(startDate, randomInt(3, 12))
      const lower = minDate(completionLowerBound, completionUpperBound)
      const upper = maxDate(completionLowerBound, completionUpperBound)
      const randomSpan = Math.max(1, upper.getTime() - lower.getTime())
      completedAt = new Date(lower.getTime() + Math.random() * randomSpan)
      stepUpdatedAt = completedAt
    } else if (stepStatus === 'in_progress') {
      stepUpdatedAt = minDate(now, addDays(startDate, randomInt(0, 2)))
    } else {
      stepUpdatedAt = minDate(now, addDays(stepCreatedAt, randomInt(0, 5)))
    }

    if (stepUpdatedAt < stepCreatedAt) stepUpdatedAt = new Date(stepCreatedAt)
    if (stepUpdatedAt > now) stepUpdatedAt = new Date(now)
    if (stepUpdatedAt > lastStepUpdateAt) lastStepUpdateAt = stepUpdatedAt

    const hasImage = Math.random() < 0.13
    const imageUrls = hasImage
      ? [`https://picsum.photos/seed/minilist-plan-${index + 1}-step-${i + 1}/960/640`]
      : []

    steps.push({
      title,
      description: buildStepDescription(title, scenario),
      status: stepStatus,
      badge,
      badgeColor,
      dueDate: toYMD(dueDate),
      startDate: toYMD(startDate),
      sortOrder: i + 1,
      imageUrls,
      location: pick(scenario.locations),
      createdAt: stepCreatedAt,
      updatedAt: stepUpdatedAt,
      completedAt
    })
  }

  let planUpdatedAt = new Date(lastStepUpdateAt)
  if (status === 'active') planUpdatedAt = maxDate(planUpdatedAt, addDays(now, -randomInt(0, 4)))
  if (status === 'paused') planUpdatedAt = maxDate(planUpdatedAt, addDays(now, -randomInt(7, 45)))
  if (planUpdatedAt > now) planUpdatedAt = now
  if (planUpdatedAt < planCreatedAt) planUpdatedAt = new Date(planCreatedAt)

  const monthLabel = `${baseStart.getFullYear()}-${String(baseStart.getMonth() + 1).padStart(2, '0')}`
  return {
    title: `${pick(scenario.titles)} · ${monthLabel}`,
    description: buildPlanDescription(scenario, status),
    color: pick(scenario.colors),
    icon: safeIcon(pick(scenario.icons)),
    status,
    createdAt: planCreatedAt,
    updatedAt: planUpdatedAt,
    steps
  }
}

async function seedPlans() {
  const args = parseArgs(process.argv)
  console.log('Start seeding plans...')
  console.log(`  user: ${args.user}`)
  console.log(`  plans: ${args.count}`)
  console.log(`  steps per plan: ${args.minSteps}-${args.maxSteps}`)
  console.log(`  replace: ${args.replace ? 'yes' : 'no'}`)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const user = await resolveUser(client, args.user)
    if (!user) {
      throw new Error('No user found. Please create or register a user first.')
    }

    if (args.replace) {
      await client.query('DELETE FROM plans WHERE user_id = $1', [user.id])
    }

    const maxSortRes = await client.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS max FROM plans WHERE user_id = $1',
      [user.id]
    )
    let nextPlanSortOrder = Number.parseInt(maxSortRes.rows[0].max, 10) + 1

    const now = new Date()
    const summary = {
      plans: 0,
      steps: 0,
      planStatus: { active: 0, completed: 0, paused: 0 },
      stepStatus: { pending: 0, in_progress: 0, completed: 0, skipped: 0 }
    }

    for (let i = 0; i < args.count; i++) {
      const payload = buildPlanPayload(i, args, now)

      const planInsert = await client.query(
        `INSERT INTO plans
           (user_id, title, description, color, icon, status, sort_order, created_at, updated_at)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, status`,
        [
          user.id,
          payload.title,
          payload.description,
          payload.color,
          payload.icon,
          payload.status,
          nextPlanSortOrder++,
          payload.createdAt,
          payload.updatedAt
        ]
      )

      const planId = planInsert.rows[0].id
      summary.plans++
      summary.planStatus[planInsert.rows[0].status]++

      for (const step of payload.steps) {
        await client.query(
          `INSERT INTO plan_steps
             (plan_id, user_id, title, description, status, badge, badge_color,
              due_date, start_date, sort_order, image_urls, location, created_at, updated_at, completed_at)
           VALUES
             ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15)`,
          [
            planId,
            user.id,
            step.title,
            step.description,
            step.status,
            step.badge,
            step.badgeColor,
            step.dueDate,
            step.startDate,
            step.sortOrder,
            JSON.stringify(step.imageUrls),
            step.location,
            step.createdAt,
            step.updatedAt,
            step.completedAt
          ]
        )
        summary.steps++
        summary.stepStatus[step.status]++
      }
    }

    await client.query('COMMIT')

    console.log('Seed completed.')
    console.log(`  target user: @${user.username}${user.nickname ? ` (${user.nickname})` : ''}`)
    console.log(`  inserted plans: ${summary.plans}`)
    console.log(`  inserted steps: ${summary.steps}`)
    console.log(`  plan status: active=${summary.planStatus.active}, completed=${summary.planStatus.completed}, paused=${summary.planStatus.paused}`)
    console.log(
      `  step status: pending=${summary.stepStatus.pending}, in_progress=${summary.stepStatus.in_progress}, completed=${summary.stepStatus.completed}, skipped=${summary.stepStatus.skipped}`
    )
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Seed failed:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

seedPlans()
