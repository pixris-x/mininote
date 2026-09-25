// ====== API 聚合出口 ======
// 实现按域拆分到本目录各文件（client 为 HTTP 核心封装）。
// 保留统一出口，现有 `import { xxxApi } from '@/api'` 用法不变。

export { api, default } from './client'
export { authApi } from './auth'
export { userApi } from './user'
export { notesApi, searchApi } from './notes'
export { calendarApi } from './calendar'
export { adminApi } from './admin'
export { expenseApi, expenseCategoryApi } from './expense'
export { planApi, planStepApi, shareApi } from './plan'
export { uploadApi } from './upload'
export { pushApi, notificationApi } from './notifications'
