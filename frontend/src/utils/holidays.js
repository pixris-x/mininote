/**
 * 节假日 & 节气工具
 * 使用 lunar-javascript 动态计算任意年份农历节日、节气
 * type: 'holiday'(法定节假日) | 'festival'(传统节日) | 'solar'(节气)
 */
let Solar = null
let solarLoadPromise = null

// ===== 公历固定节日（每年相同）=====
const SOLAR_HOLIDAYS = {
  '01-01': { name: '元旦', type: 'holiday' },
  '02-14': { name: '情人节', type: 'festival' },
  '03-08': { name: '妇女节', type: 'holiday' },
  '03-12': { name: '植树节', type: 'festival' },
  '03-15': { name: '消费者日', type: 'festival' },
  '04-01': { name: '愚人节', type: 'festival' },
  '04-22': { name: '地球日', type: 'festival' },
  '05-01': { name: '劳动节', type: 'holiday' },
  '05-04': { name: '青年节', type: 'holiday' },
  '05-20': { name: '520', type: 'festival' },
  '06-01': { name: '儿童节', type: 'holiday' },
  '07-01': { name: '建党节', type: 'holiday' },
  '08-01': { name: '建军节', type: 'holiday' },
  '09-10': { name: '教师节', type: 'holiday' },
  '10-01': { name: '国庆节', type: 'holiday' },
  '10-02': { name: '国庆节', type: 'holiday' },
  '10-03': { name: '国庆节', type: 'holiday' },
  '12-25': { name: '圣诞节', type: 'festival' },
}

// ===== 农历节日（按农历月日匹配）=====
// key 格式: '农历月-农历日'
const LUNAR_FESTIVALS = {
  '1-1':  { name: '春节', type: 'holiday' },
  '1-15': { name: '元宵节', type: 'festival' },
  '2-2':  { name: '龙抬头', type: 'festival' },
  '5-5':  { name: '端午节', type: 'holiday' },
  '7-7':  { name: '七夕节', type: 'festival' },
  '7-15': { name: '中元节', type: 'festival' },
  '8-15': { name: '中秋节', type: 'holiday' },
  '9-9':  { name: '重阳节', type: 'festival' },
}

// ===== 节气名称（lunar-javascript 返回的标准名）=====
// 清明同时是法定节假日，优先级更高
const SOLAR_TERM_TYPES = {
  '清明': 'holiday',
  '冬至': 'festival',
  '小寒': 'solar', '大寒': 'solar',
  '立春': 'solar', '雨水': 'solar',
  '惊蛰': 'solar', '春分': 'solar',
  '谷雨': 'solar', '立夏': 'solar',
  '小满': 'solar', '芒种': 'solar',
  '夏至': 'solar', '小暑': 'solar',
  '大暑': 'solar', '立秋': 'solar',
  '处暑': 'solar', '白露': 'solar',
  '秋分': 'solar', '寒露': 'solar',
  '霜降': 'solar', '立冬': 'solar',
  '小雪': 'solar', '大雪': 'solar',
}

// 缓存避免重复计算
const _cache = new Map()

function pad(n) {
  return String(n).padStart(2, '0')
}

/**
 * 预加载节日计算引擎（lunar-javascript）
 * 通过动态导入把相关包从首批代码中拆出
 */
export async function preloadHolidayEngine() {
  if (Solar) return
  if (!solarLoadPromise) {
    solarLoadPromise = import('lunar-javascript')
      .then((mod) => {
        Solar = mod.Solar
      })
      .catch((err) => {
        solarLoadPromise = null
        throw err
      })
  }
  await solarLoadPromise
}

/**
 * 获取指定日期的节日/节气信息（动态计算，支持任意年份）
 * 优先级：法定节假日 > 农历传统节日 > 节气
 * @returns {{ name: string, type: string } | null}
 */
export function getHoliday(year, month, day) {
  const cacheKey = `${year}-${month}-${day}`
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)

  let result = null

  // 1. 公历固定节日（最高优先级，如国庆节直接返回）
  const solarKey = `${pad(month)}-${pad(day)}`
  if (SOLAR_HOLIDAYS[solarKey]) {
    result = SOLAR_HOLIDAYS[solarKey]
    _cache.set(cacheKey, result)
    return result
  }

  try {
    if (!Solar) return result

    const solar = Solar.fromYmd(year, month, day)
    const lunar = solar.getLunar()

    // 2. 节气（清明节气 = 法定节假日，其余为 solar 类型）
    const jieQi = lunar.getJieQi()
    if (jieQi && SOLAR_TERM_TYPES[jieQi]) {
      result = { name: jieQi, type: SOLAR_TERM_TYPES[jieQi] }
    }

    // 3. 农历节日（覆盖节气，优先级更高）
    const lunarMonth = lunar.getMonth() // 负数表示闰月
    const lunarDay = lunar.getDay()
    const lunarKey = `${Math.abs(lunarMonth)}-${lunarDay}`
    if (LUNAR_FESTIVALS[lunarKey]) {
      result = LUNAR_FESTIVALS[lunarKey]
    }

    // 4. 除夕：判断明天是否是正月初一
    if (!result) {
      const tomorrow = solar.next(1)
      const tomorrowLunar = tomorrow.getLunar()
      if (tomorrowLunar.getMonth() === 1 && tomorrowLunar.getDay() === 1) {
        result = { name: '除夕', type: 'holiday' }
      }
    }
  } catch (_e) {
    // 计算异常时降级，不影响页面
  }

  _cache.set(cacheKey, result)
  return result
}

/**
 * 获取从今天起未来 N 天内即将到来的节日（最多返回 5 个）
 * @param {number} daysAhead - 往后看多少天，默认 90
 * @returns {Array<{ date, month, day, name, type, daysLeft, weekDay }>}
 */
export function getUpcomingHolidays(daysAhead = 90) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result = []
  const seenNames = new Set()

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()

    const holiday = getHoliday(y, m, day)
    if (holiday && !seenNames.has(holiday.name)) {
      seenNames.add(holiday.name)
      result.push({
        date: `${y}-${pad(m)}-${pad(day)}`,
        month: m,
        day,
        name: holiday.name,
        type: holiday.type,
        daysLeft: i,
        weekDay: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
      })
      if (result.length >= 5) break
    }
  }

  return result
}

/**
 * 获取某天农历文案（初一显示月份名，其余显示日期）
 */
export function getLunarDayLabel(year, month, day) {
  if (!Solar) return ''
  try {
    const lunar = Solar.fromYmd(year, month, day).getLunar()
    const lunarDay = lunar.getDay()
    if (lunarDay === 1) {
      return lunar.getMonthInChinese() + '月'
    }
    return lunar.getDayInChinese()
  } catch {
    return ''
  }
}
