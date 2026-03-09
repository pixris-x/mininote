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
      localStorage.removeItem('minilist_token')
      localStorage.removeItem('minilist_user')
      window.location.href = '/login'
    }
    const message = error.response?.data?.message || '网络错误，请稍后重试'
    return Promise.reject(new Error(message))
  }
)

// ====== 认证 API ======
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data)
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
  unlinkNote: (noteId, date) => api.delete('/calendar/link', { data: { note_id: noteId, date } })
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

export default api
