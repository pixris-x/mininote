import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截：自动附加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('minilist_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截：处理 401 自动跳转登录
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 登录/注册/重置密码接口返回 401 是预期行为，不强制跳转
      const url = error.config?.url || ''
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/reset-password')
      if (!isAuthEndpoint) {
        const code = error.response?.data?.code
        const msg = code === 'SESSION_REPLACED'
          ? '你的账号已在其他设备登录，请重新登录'
          : null
        localStorage.removeItem('minilist_token')
        localStorage.removeItem('minilist_user')
        if (msg) {
          // 跳转时携带提示信息
          window.location.href = `/login?reason=replaced`
        } else {
          window.location.href = '/login'
        }
      }
    }
    const data = error.response?.data || {}
    const message = data.message || '网络错误，请稍后重试'
    const err = new Error(message)
    if (data.field) err.field = data.field
    return Promise.reject(err)
  }
)

// ====== 认证 API ======
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  sendRegisterCode: (email) => api.post('/auth/send-register-code', { email })
}

// ====== 用户 API ======
export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/password', data)
}

// ====== 记事 API ======
export const notesApi = {
  getAll: (params) => api.get('/notes', { params }),
  getById: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`)
}

// ====== 日历 API ======
export const calendarApi = {
  getMonth: (year, month) => api.get('/calendar/month', { params: { year, month } }),
  getDay: (date) => api.get('/calendar/day', { params: { date } }),
  linkNote: (noteId, date) => api.post('/calendar/link', { note_id: noteId, date }),
  unlinkNote: (noteId, date) => api.delete('/calendar/link', { data: { note_id: noteId, date } }),
  getPlanSteps: (year, month) => api.get('/calendar/plan-steps', { params: { year, month } })
}

// ====== 管理员 API ======
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getLogs: (params) => api.get('/admin/logs', { params }),
  cleanLogs: (days) => api.delete('/admin/logs/clean', { params: { days } }),
  getUsers: (params) => api.get('/admin/users', { params })
}

// ====== 记账 API ======
export const expenseApi = {
  getList: (params) => api.get('/expenses', { params }),
  getStats: (year, month) => api.get('/expenses/stats', { params: { year, month } }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`)
}

// ====== 消费分类 API ======
export const expenseCategoryApi = {
  getAll: () => api.get('/expense-categories'),
  create: (data) => api.post('/expense-categories', data),
  update: (id, data) => api.put(`/expense-categories/${id}`, data),
  delete: (id) => api.delete(`/expense-categories/${id}`)
}

// ====== 计划 API ======
export const planApi = {
  getAll:      (params) => api.get('/plans', { params }),
  getById:     (id)     => api.get(`/plans/${id}`),
  create:      (data)   => api.post('/plans', data),
  update:      (id, data) => api.put(`/plans/${id}`, data),
  delete:      (id)     => api.delete(`/plans/${id}`),
  share:       (id, data) => api.post(`/plans/${id}/share`, data),
  unshare:     (id)     => api.delete(`/plans/${id}/share`),
  importShare: (data)   => api.post('/plans/import-share', data),
  // 协作者
  addCollaborator:    (id, username) => api.post(`/plans/${id}/collaborators`, { username }),
  removeCollaborator: (id, userId)  => api.delete(`/plans/${id}/collaborators/${userId}`),
  leave:              (id)          => api.delete(`/plans/${id}/leave`),
  // 邀请
  getInvites:         ()            => api.get('/plans/invites'),
  acceptInvite:       (id)          => api.post(`/plans/${id}/collaborators/accept`),
  rejectInvite:       (id)          => api.post(`/plans/${id}/collaborators/reject`)
}

// ====== 计划步骤 API ======
export const planStepApi = {
  getByPlan: (plan_id)     => api.get('/plan-steps', { params: { plan_id } }),
  create:    (data)        => api.post('/plan-steps', data),
  update:    (id, data)    => api.put(`/plan-steps/${id}`, data),
  reorder:   (items)       => api.patch('/plan-steps/reorder', { items }),
  delete:    (id)          => api.delete(`/plan-steps/${id}`)
}

// ====== 上传 API ======
export const uploadApi = {
  image: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

// ====== Push 通知 API ======
export const pushApi = {
  getVapidPublicKey: ()           => api.get('/push/vapid-public-key'),
  subscribe:         (sub)        => api.post('/push/subscribe', sub),
  unsubscribe:       (endpoint)   => api.delete('/push/unsubscribe', { data: { endpoint } }),
  getStatus:         ()           => api.get('/push/status'),
  sendTest:          ()           => api.post('/push/test')
}

export default api
