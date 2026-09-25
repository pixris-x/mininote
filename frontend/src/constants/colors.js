// ===== 全局共享颜色常量 =====
// 颜色板唯一定义处，视图与 store 不得再各自维护一份。

// 记事卡片颜色板（NotesView / NoteDetailView / CalendarView 共用）
export const NOTE_COLORS = [
  { label: '白色', value: '#FFFFFF' },
  { label: '粉色', value: '#FFD6E0' },
  { label: '薄荷', value: '#D4F5E9' },
  { label: '薰衣草', value: '#E4E8F8' },
  { label: '蜜桃', value: '#FFE8D6' },
  { label: '柠檬', value: '#FFF8D6' },
  { label: '天蓝', value: '#D6EEFF' }
]

// 生日标记颜色板（CalendarView）
export const BIRTHDAY_COLORS = [
  { label: '珊瑚红', value: '#FF6B6B' },
  { label: '玫瑰粉', value: '#FF8AAE' },
  { label: '紫罗兰', value: '#A78BFA' },
  { label: '天空蓝', value: '#60A5FA' },
  { label: '薄荷绿', value: '#34D399' },
  { label: '橙色', value: '#FB923C' }
]

// 计划卡片颜色板（PlanView；在记事色板基础上多一个绿色）
export const PLAN_COLORS = ['#FFFFFF', '#FFD6E0', '#D4F5E9', '#E4E8F8', '#FFE8D6', '#FFF8D6', '#D6EEFF', '#DCEDC8']
