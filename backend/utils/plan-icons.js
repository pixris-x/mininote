const DEFAULT_PLAN_ICON = 'target'

const PLAN_ICON_KEYS = new Set([
  'target',
  'rocket',
  'lightbulb',
  'book',
  'dumbbell',
  'sprout',
  'sparkles',
  'trophy',
  'palette',
  'flask',
  'globe',
  'heart'
])

const PLAN_EMOJI_ALIAS = {
  '🎯': 'target',
  '🚀': 'rocket',
  '💡': 'lightbulb',
  '📚': 'book',
  '💪': 'dumbbell',
  '🌱': 'sprout',
  '✨': 'sparkles',
  '🏆': 'trophy',
  '🎨': 'palette',
  '🔬': 'flask',
  '🌍': 'globe',
  '❤️': 'heart',
  '❤': 'heart'
}

function toPlanIconKey(icon) {
  const raw = String(icon || '').trim()
  if (!raw) return ''
  if (PLAN_ICON_KEYS.has(raw)) return raw
  return PLAN_EMOJI_ALIAS[raw] || ''
}

function isPlanIconKey(icon) {
  return PLAN_ICON_KEYS.has(String(icon || '').trim())
}

function normalizePlanIcon(icon) {
  const raw = String(icon || '').trim()
  if (!raw) return ''
  return toPlanIconKey(raw) || raw
}

function sanitizePlanIcon(icon, fallback = DEFAULT_PLAN_ICON) {
  return toPlanIconKey(icon) || fallback
}

module.exports = {
  DEFAULT_PLAN_ICON,
  isPlanIconKey,
  normalizePlanIcon,
  sanitizePlanIcon,
  toPlanIconKey
}
