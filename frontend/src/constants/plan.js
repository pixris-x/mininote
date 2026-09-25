// ===== 计划 / 步骤状态常量 =====
import { CheckCircle2, Circle, Clock3, SkipForward } from 'lucide-vue-next'

// 计划状态标签（PlanView）
export const PLAN_STATUS_LABELS = {
  active: '进行中',
  paused: '已暂停',
  completed: '已完成'
}

// 步骤状态标签（CalendarView）
export const STEP_STATUS_LABELS = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  skipped: '已跳过'
}

// 步骤状态图标（PlanView）
export const STEP_STATUS_ICONS = {
  pending: Circle,
  in_progress: Clock3,
  completed: CheckCircle2,
  skipped: SkipForward
}
