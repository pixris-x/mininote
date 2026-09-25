import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLAN_ICON,
  PLAN_ICON_COMPONENTS,
  PLAN_ICON_OPTIONS,
  getPlanIconComponent,
  getPlanIconComponentOrDefault,
  normalizePlanIcon,
  sanitizePlanIcon
} from './plan-icons'

describe('plan-icons', () => {
  it('默认图标为 target 且存在于组件表中', () => {
    expect(DEFAULT_PLAN_ICON).toBe('target')
    expect(PLAN_ICON_COMPONENTS[DEFAULT_PLAN_ICON]).toBeTruthy()
  })

  it('PLAN_ICON_OPTIONS 与组件表一一对应', () => {
    for (const opt of PLAN_ICON_OPTIONS) {
      expect(PLAN_ICON_COMPONENTS[opt.key]).toBeTruthy()
      expect(typeof opt.label).toBe('string')
    }
  })

  it('sanitizePlanIcon 对合法 key 原样返回', () => {
    expect(sanitizePlanIcon('rocket')).toBe('rocket')
    expect(sanitizePlanIcon(' heart ')).toBe('heart')
  })

  it('sanitizePlanIcon 将 emoji 别名归一化', () => {
    expect(sanitizePlanIcon('🎯')).toBe('target')
    expect(sanitizePlanIcon('❤')).toBe('heart')
    expect(sanitizePlanIcon('❤️')).toBe('heart')
  })

  it('sanitizePlanIcon 对非法输入回退到默认图标', () => {
    expect(sanitizePlanIcon(null)).toBe('target')
    expect(sanitizePlanIcon('')).toBe('target')
    expect(sanitizePlanIcon('not-exist')).toBe('target')
    expect(sanitizePlanIcon('not-exist', 'rocket')).toBe('rocket')
  })

  it('normalizePlanIcon 归一化已知值、保留未知原始值', () => {
    expect(normalizePlanIcon(' 🏆 ')).toBe('trophy')
    expect(normalizePlanIcon('custom-key')).toBe('custom-key')
    expect(normalizePlanIcon(null)).toBe('')
  })

  it('getPlanIconComponent 返回组件或 null', () => {
    expect(getPlanIconComponent('rocket')).toBeTruthy()
    expect(getPlanIconComponent('❓')).toBe(null)
    expect(getPlanIconComponent('')).toBe(null)
  })

  it('getPlanIconComponentOrDefault 永远返回组件', () => {
    expect(getPlanIconComponentOrDefault('❓')).toBe(PLAN_ICON_COMPONENTS.target)
    expect(getPlanIconComponentOrDefault('book')).toBe(PLAN_ICON_COMPONENTS.book)
  })
})
