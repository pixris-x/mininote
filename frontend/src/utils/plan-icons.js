import {
  BookOpen,
  Dumbbell,
  FlaskConical,
  Globe,
  Heart,
  Lightbulb,
  Palette,
  Rocket,
  Sparkles,
  Sprout,
  Target,
  Trophy
} from 'lucide-vue-next'

export const DEFAULT_PLAN_ICON = 'target'

export const PLAN_ICON_COMPONENTS = {
  target: Target,
  rocket: Rocket,
  lightbulb: Lightbulb,
  book: BookOpen,
  dumbbell: Dumbbell,
  sprout: Sprout,
  sparkles: Sparkles,
  trophy: Trophy,
  palette: Palette,
  flask: FlaskConical,
  globe: Globe,
  heart: Heart
}

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

export const PLAN_ICON_OPTIONS = [
  { key: 'target', label: '目标', component: Target },
  { key: 'rocket', label: '冲刺', component: Rocket },
  { key: 'lightbulb', label: '灵感', component: Lightbulb },
  { key: 'book', label: '学习', component: BookOpen },
  { key: 'dumbbell', label: '锻炼', component: Dumbbell },
  { key: 'sprout', label: '成长', component: Sprout },
  { key: 'sparkles', label: '亮点', component: Sparkles },
  { key: 'trophy', label: '成就', component: Trophy },
  { key: 'palette', label: '创作', component: Palette },
  { key: 'flask', label: '探索', component: FlaskConical },
  { key: 'globe', label: '出行', component: Globe },
  { key: 'heart', label: '生活', component: Heart }
]

function resolveKnownPlanIcon(icon) {
  const raw = String(icon || '').trim()
  if (!raw) return ''
  if (PLAN_ICON_COMPONENTS[raw]) return raw
  return PLAN_EMOJI_ALIAS[raw] || ''
}

export function normalizePlanIcon(icon) {
  const raw = String(icon || '').trim()
  if (!raw) return ''
  return resolveKnownPlanIcon(raw) || raw
}

export function sanitizePlanIcon(icon, fallback = DEFAULT_PLAN_ICON) {
  return resolveKnownPlanIcon(icon) || fallback
}

export function getPlanIconComponent(icon) {
  const key = resolveKnownPlanIcon(icon)
  return key ? PLAN_ICON_COMPONENTS[key] : null
}

export function getPlanIconComponentOrDefault(icon) {
  return getPlanIconComponent(icon) || PLAN_ICON_COMPONENTS[DEFAULT_PLAN_ICON]
}
