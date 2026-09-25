import { describe, expect, it } from 'vitest'
import { BIRTHDAY_COLORS, NOTE_COLORS, PLAN_COLORS } from './colors'
import { PLAN_STATUS_LABELS, STEP_STATUS_ICONS, STEP_STATUS_LABELS } from './plan'

describe('constants/colors', () => {
  it('颜色板结构统一：label + value', () => {
    for (const c of [...NOTE_COLORS, ...BIRTHDAY_COLORS]) {
      expect(typeof c.label).toBe('string')
      expect(c.value).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('NOTE_COLORS 各值不重复', () => {
    const values = NOTE_COLORS.map(c => c.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('PLAN_COLORS 包含记事色板并多一个绿色', () => {
    for (const c of NOTE_COLORS) {
      expect(PLAN_COLORS).toContain(c.value)
    }
    expect(PLAN_COLORS).toContain('#DCEDC8')
  })
})

describe('constants/plan', () => {
  it('计划与步骤状态标签齐全', () => {
    expect(Object.keys(PLAN_STATUS_LABELS)).toEqual(['active', 'paused', 'completed'])
    expect(Object.keys(STEP_STATUS_LABELS)).toEqual(['pending', 'in_progress', 'completed', 'skipped'])
  })

  it('步骤状态图标与标签一一对应', () => {
    for (const key of Object.keys(STEP_STATUS_LABELS)) {
      expect(STEP_STATUS_ICONS[key]).toBeTruthy()
    }
  })
})
