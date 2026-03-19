const DEFAULT_EXPENSE_ICON = 'tag'

const EXPENSE_ICON_KEYS = new Set([
  'food',
  'noodles',
  'pizza',
  'fish',
  'salad',
  'drink',
  'dessert',
  'meat',
  'meal_box',
  'beer',
  'car',
  'bus',
  'subway',
  'plane',
  'bike',
  'fuel',
  'ship',
  'shopping',
  'clothes',
  'makeup',
  'gift',
  'jewel',
  'game',
  'movie',
  'music',
  'art',
  'study',
  'goal',
  'theater',
  'dice',
  'medicine',
  'hospital',
  'fitness',
  'sports',
  'home',
  'light',
  'phone',
  'laptop',
  'tool',
  'package',
  'clean',
  'money',
  'note',
  'flower',
  'pet',
  'tag'
])

const EXPENSE_EMOJI_ALIAS = {
  '🍔': 'food', '🍜': 'noodles', '🍕': 'pizza', '🍣': 'fish', '🥗': 'salad', '🧋': 'drink',
  '🍰': 'dessert', '🥩': 'meat', '🍱': 'meal_box', '🍺': 'beer',
  '🚗': 'car', '🚌': 'bus', '🚇': 'subway', '✈️': 'plane', '✈': 'plane', '🚕': 'car',
  '🛵': 'bike', '🚲': 'bike', '⛽': 'fuel', '🚢': 'ship', '🚁': 'plane',
  '🛒': 'shopping', '👗': 'clothes', '👟': 'clothes', '💄': 'makeup', '🧴': 'package',
  '🎁': 'gift', '💍': 'jewel', '🧸': 'gift', '🛍️': 'shopping', '🛍': 'shopping', '👔': 'clothes',
  '🎮': 'game', '🎬': 'movie', '🎵': 'music', '🎨': 'art', '📚': 'study', '🎯': 'goal',
  '🎳': 'dice', '🎭': 'theater', '🎠': 'theater', '🎲': 'dice',
  '💊': 'medicine', '🏥': 'hospital', '🦷': 'hospital', '💪': 'fitness', '🧘': 'sports',
  '🏃': 'sports', '⚽': 'sports', '🏊': 'sports', '🎾': 'sports', '🧗': 'sports',
  '🏠': 'home', '💡': 'light', '📱': 'phone', '💻': 'laptop', '🔧': 'tool', '📦': 'package',
  '🧹': 'clean', '💰': 'money', '📝': 'note', '🌸': 'flower', '🐾': 'pet', '🏷️': 'tag', '🏷': 'tag'
}

function toExpenseIconKey(icon) {
  const raw = String(icon || '').trim()
  if (!raw) return ''
  if (EXPENSE_ICON_KEYS.has(raw)) return raw
  return EXPENSE_EMOJI_ALIAS[raw] || ''
}

function isExpenseIconKey(icon) {
  return EXPENSE_ICON_KEYS.has(String(icon || '').trim())
}

function sanitizeExpenseIcon(icon, fallback = DEFAULT_EXPENSE_ICON) {
  return toExpenseIconKey(icon) || fallback
}

module.exports = {
  DEFAULT_EXPENSE_ICON,
  isExpenseIconKey,
  sanitizeExpenseIcon,
  toExpenseIconKey
}
