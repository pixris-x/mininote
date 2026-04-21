import dayjs from 'dayjs'

let Solar = null
let Lunar = null
let loader = null

const REMIND_OFFSET_OPTIONS = [7, 3, 0]

function pad(n) {
  return String(n).padStart(2, '0')
}

function validDate(value) {
  const text = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  const d = dayjs(text)
  if (!d.isValid()) return null
  return d
}

export async function preloadBirthdayEngine() {
  if (Solar && Lunar) return
  if (!loader) {
    loader = import('lunar-javascript')
      .then((mod) => {
        Solar = mod.Solar
        Lunar = mod.Lunar
      })
      .catch((err) => {
        loader = null
        throw err
      })
  }
  await loader
}

export function normalizeRemindOffsets(raw) {
  const source = Array.isArray(raw) ? raw : []
  const values = []

  for (const item of source) {
    const n = Number.parseInt(item, 10)
    if (REMIND_OFFSET_OPTIONS.includes(n) && !values.includes(n)) {
      values.push(n)
    }
  }

  values.sort((a, b) => b - a)
  return values
}

export function deriveLunarFromSolarDate(dateText) {
  if (!Solar) return null
  const date = validDate(dateText)
  if (!date) return null

  try {
    const solar = Solar.fromYmd(date.year(), date.month() + 1, date.date())
    const lunar = solar.getLunar()
    return {
      lunar_month: Math.abs(lunar.getMonth()),
      lunar_day: lunar.getDay(),
      lunar_is_leap: lunar.getMonth() < 0
    }
  } catch {
    return null
  }
}

export function formatLunarText(month, day, isLeap = false) {
  const monthNames = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
  const dayNames = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
  ]

  const m = Number.parseInt(month, 10)
  const d = Number.parseInt(day, 10)
  if (!Number.isInteger(m) || !Number.isInteger(d)) return '农历'

  const monthText = monthNames[m - 1] ? `${monthNames[m - 1]}月` : `${m}月`
  const dayText = dayNames[d - 1] || `${d}`
  return `${isLeap ? '闰' : ''}${monthText}${dayText}`
}

export function getBirthdayOccurrenceDate(birthday, year) {
  const baseDate = validDate(birthday?.solar_date)
  if (!baseDate) return null

  const repeatType = String(birthday?.repeat_type || 'yearly')
  const isLunar = Boolean(birthday?.is_lunar)

  if (repeatType === 'none') {
    return baseDate.year() === year ? baseDate.format('YYYY-MM-DD') : null
  }

  if (!isLunar) {
    const month = baseDate.month() + 1
    const day = baseDate.date()
    if (month === 2 && day === 29 && !dayjs(`${year}-02-29`).isValid()) {
      return `${year}-02-28`
    }
    return `${year}-${pad(month)}-${pad(day)}`
  }

  if (!Lunar) return null
  const month = Number.parseInt(birthday?.lunar_month, 10)
  const day = Number.parseInt(birthday?.lunar_day, 10)
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null

  const wantLeap = Boolean(birthday?.lunar_is_leap)
  const monthCandidates = wantLeap ? [-Math.abs(month), Math.abs(month)] : [Math.abs(month)]

  for (const lunarMonth of monthCandidates) {
    try {
      const solar = Lunar.fromYmd(year, lunarMonth, day).getSolar()
      return solar.toYmd()
    } catch {
      // 尝试下一个候选月份（例如闰月在某年不存在时）
    }
  }

  return null
}

export function getNextBirthdayOccurrenceDate(birthday, fromDate = dayjs()) {
  const start = dayjs(fromDate).startOf('day')
  if (!start.isValid()) return null

  const repeatType = String(birthday?.repeat_type || 'yearly')
  const baseDate = validDate(birthday?.solar_date)
  if (!baseDate) return null

  if (repeatType === 'none') {
    return baseDate.isBefore(start) ? null : baseDate.format('YYYY-MM-DD')
  }

  const currentYear = start.year()
  const candidates = [
    getBirthdayOccurrenceDate(birthday, currentYear),
    getBirthdayOccurrenceDate(birthday, currentYear + 1)
  ].filter(Boolean)

  let nearest = null
  for (const item of candidates) {
    const date = dayjs(item)
    if (!date.isValid() || date.isBefore(start)) continue
    if (!nearest || date.isBefore(nearest)) {
      nearest = date
    }
  }

  return nearest ? nearest.format('YYYY-MM-DD') : null
}

export function getReminderEntries(occurrenceDate, remindOffsets = []) {
  const date = dayjs(occurrenceDate)
  if (!date.isValid()) return []

  const offsets = normalizeRemindOffsets(remindOffsets)
  return offsets.map(offset => ({
    offset,
    reminder_date: date.subtract(offset, 'day').format('YYYY-MM-DD'),
    occurrence_date: date.format('YYYY-MM-DD')
  }))
}

