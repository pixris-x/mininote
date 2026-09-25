import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import {
  formatLunarText,
  getBirthdayOccurrenceDate,
  getReminderEntries,
  getNextBirthdayOccurrenceDate,
  normalizeRemindOffsets
} from './birthdays'

describe('normalizeRemindOffsets', () => {
  it('过滤非法值、去重并倒序排列', () => {
    expect(normalizeRemindOffsets(['7', 0, 99, '3', 7, 0])).toEqual([7, 3, 0])
  })

  it('非数组输入返回空数组', () => {
    expect(normalizeRemindOffsets(null)).toEqual([])
    expect(normalizeRemindOffsets('7,3')).toEqual([])
  })
})

describe('formatLunarText', () => {
  it('正确拼接农历文案', () => {
    expect(formatLunarText(1, 1)).toBe('正月初一')
    expect(formatLunarText(12, 30)).toBe('腊月三十')
    expect(formatLunarText(11, 11)).toBe('冬月十一')
  })

  it('闰月带前缀', () => {
    expect(formatLunarText(5, 5, true)).toBe('闰五月初五')
  })

  it('非法输入返回占位符', () => {
    expect(formatLunarText('x', 'y')).toBe('农历')
    expect(formatLunarText(null, 10)).toBe('农历')
  })
})

describe('getBirthdayOccurrenceDate（公历，不依赖农历引擎）', () => {
  it('每年重复：返回指定年份的同月日', () => {
    const birthday = { solar_date: '2000-03-05', repeat_type: 'yearly', is_lunar: false }
    expect(getBirthdayOccurrenceDate(birthday, 2024)).toBe('2024-03-05')
  })

  it('2 月 29 日在平年回退到 2 月 28 日', () => {
    const birthday = { solar_date: '2000-02-29', repeat_type: 'yearly', is_lunar: false }
    expect(getBirthdayOccurrenceDate(birthday, 2024)).toBe('2024-02-29')
    expect(getBirthdayOccurrenceDate(birthday, 2023)).toBe('2023-02-28')
  })

  it('不重复：仅生日本身年份返回日期', () => {
    const birthday = { solar_date: '2024-05-01', repeat_type: 'none' }
    expect(getBirthdayOccurrenceDate(birthday, 2024)).toBe('2024-05-01')
    expect(getBirthdayOccurrenceDate(birthday, 2025)).toBe(null)
  })

  it('非法日期返回 null', () => {
    expect(getBirthdayOccurrenceDate({ solar_date: 'bad' }, 2024)).toBe(null)
    expect(getBirthdayOccurrenceDate(null, 2024)).toBe(null)
  })
})

describe('getNextBirthdayOccurrenceDate（公历）', () => {
  const birthday = { solar_date: '2000-03-05', repeat_type: 'yearly', is_lunar: false }

  it('今年未过：返回今年日期', () => {
    expect(getNextBirthdayOccurrenceDate(birthday, dayjs('2024-01-15'))).toBe('2024-03-05')
  })

  it('今年已过：返回明年日期', () => {
    expect(getNextBirthdayOccurrenceDate(birthday, dayjs('2024-04-01'))).toBe('2025-03-05')
  })
})

describe('getReminderEntries', () => {
  it('按偏移天数生成提醒条目（倒序）', () => {
    expect(getReminderEntries('2024-03-05', [7, 3, 0])).toEqual([
      { offset: 7, reminder_date: '2024-02-27', occurrence_date: '2024-03-05' },
      { offset: 3, reminder_date: '2024-03-02', occurrence_date: '2024-03-05' },
      { offset: 0, reminder_date: '2024-03-05', occurrence_date: '2024-03-05' }
    ])
  })

  it('无效日期返回空数组', () => {
    expect(getReminderEntries('bad', [7])).toEqual([])
  })
})
