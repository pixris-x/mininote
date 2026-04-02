const API_BASE_URL = '/api'
const API_TIMEOUT = 30000

function buildUrl(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)

  if (!params) return `${url.pathname}${url.search}`

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          url.searchParams.append(key, item)
        }
      })
      return
    }

    url.searchParams.append(key, value)
  })

  return `${url.pathname}${url.search}`
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

async function parseResponseBody(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  try {
    const text = await response.text()
    if (!text) return null

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch {
    return null
  }
}

function createHttpError(message, { status = 0, data = null, url = '', field = undefined } = {}) {
  const error = new Error(message || '网络错误，请稍后重试')
  error.name = 'HttpError'
  error.status = status
  error.data = data
  error.response = { status, data, url }
  if (field) error.field = field
  return error
}

function isAuthEndpoint(url) {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/login/verify-2fa') ||
    url.includes('/auth/login/resend-2fa') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/register') ||
    url.includes('/auth/reset-password')
  )
}

function handleUnauthorized(url, data) {
  if (isAuthEndpoint(url)) return

  const code = data?.code
  const reason = code === 'SESSION_REPLACED'
    ? 'replaced'
    : code === 'SESSION_REVOKED'
      ? 'revoked'
      : code === 'SESSION_INVALID'
        ? 'invalid'
        : ''

  localStorage.removeItem('minilist_token')
  localStorage.removeItem('minilist_user')

  if (reason) {
    window.location.href = `/login?reason=${reason}`
  } else {
    window.location.href = '/login'
  }
}

async function request(method, path, config = {}) {
  const {
    params,
    data,
    headers = {},
    timeout = API_TIMEOUT
  } = config

  const url = buildUrl(path, params)
  const requestHeaders = new Headers(headers)
  const token = localStorage.getItem('minilist_token')

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  let body
  if (data !== undefined) {
    if (isFormData(data)) {
      body = data
      requestHeaders.delete('Content-Type')
    } else {
      body = JSON.stringify(data)
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json')
      }
    }
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body,
      signal: controller.signal,
      credentials: 'same-origin'
    })

    const responseData = await parseResponseBody(response)

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized(path, responseData)
      }

      throw createHttpError(
        responseData?.message || '网络错误，请稍后重试',
        {
          status: response.status,
          data: responseData,
          url,
          field: responseData?.field
        }
      )
    }

    return responseData
  } catch (error) {
    if (error?.name === 'HttpError') throw error

    if (error?.name === 'AbortError') {
      throw createHttpError('请求超时，请稍后重试', { url })
    }

    throw createHttpError('网络错误，请稍后重试', { url })
  } finally {
    window.clearTimeout(timer)
  }
}

const api = {
  request,
  get: (url, config) => request('GET', url, config),
  post: (url, data, config = {}) => request('POST', url, { ...config, data }),
  put: (url, data, config = {}) => request('PUT', url, { ...config, data }),
  patch: (url, data, config = {}) => request('PATCH', url, { ...config, data }),
  delete: (url, config = {}) => request('DELETE', url, config)
}

// ====== 认证 API ======
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  verifyLogin2FA: (data) => api.post('/auth/login/verify-2fa', data),
  resendLogin2FA: (challenge_id) => api.post('/auth/login/resend-2fa', { challenge_id }),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  sendRegisterCode: (email) => api.post('/auth/send-register-code', { email })
}

// ====== 用户 API ======
export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/password', data),
  getSecurity: () => api.get('/user/security'),
  sendTwoFactorCode: (action) => api.post('/user/security/2fa/send-code', { action }),
  verifyTwoFactor: (action, code) => api.post('/user/security/2fa/verify', { action, code }),
  sendEmailChangeCode: (new_email, current_password) => api.post('/user/security/email/send-code', { new_email, current_password }),
  verifyEmailChange: (new_email, code) => api.post('/user/security/email/verify', { new_email, code }),
  getSessions: () => api.get('/user/sessions'),
  revokeSession: (sessionId) => api.delete(`/user/sessions/${sessionId}`),
  revokeOtherSessions: () => api.delete('/user/sessions')
}

// ====== 记事 API ======
export const notesApi = {
  getAll: (params) => api.get('/notes', { params }),
  getById: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`)
}

// ====== 全局搜索 API ======
export const searchApi = {
  global: (params) => api.get('/search/global', { params })
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
  getUsers: (params) => api.get('/admin/users', { params }),
  getPushNotifications: () => api.get('/admin/push/notifications'),
  sendPushNow: (data) => api.post('/admin/push/send', data),
  createPushNotification: (data) => api.post('/admin/push/notifications', data),
  sendPushNotificationNow: (id) => api.post(`/admin/push/notifications/${id}/send-now`)
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
  getAll: (params) => api.get('/plans', { params }),
  getById: (id) => api.get(`/plans/${id}`),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
  share: (id, data) => api.post(`/plans/${id}/share`, data),
  unshare: (id) => api.delete(`/plans/${id}/share`),
  importShare: (data) => api.post('/plans/import-share', data),
  addCollaborator: (id, username) => api.post(`/plans/${id}/collaborators`, { username }),
  removeCollaborator: (id, userId) => api.delete(`/plans/${id}/collaborators/${userId}`),
  leave: (id) => api.delete(`/plans/${id}/leave`),
  getInvites: () => api.get('/plans/invites'),
  acceptInvite: (id) => api.post(`/plans/${id}/collaborators/accept`),
  rejectInvite: (id) => api.post(`/plans/${id}/collaborators/reject`)
}

// ====== 分享 API ======
export const shareApi = {
  getByToken: (token) => api.get(`/share/${token}`),
  verify: (token, pin) => api.post(`/share/${token}/verify`, { pin }),
  updateStepStatus: (token, stepId, status, pin) => api.patch(`/share/${token}/steps/${stepId}/status`, { status, pin })
}

// ====== 计划步骤 API ======
export const planStepApi = {
  getByPlan: (plan_id) => api.get('/plan-steps', { params: { plan_id } }),
  create: (data) => api.post('/plan-steps', data),
  generate: (data) => api.post('/plan-steps/generate', data),
  update: (id, data) => api.put(`/plan-steps/${id}`, data),
  reorder: (items) => api.patch('/plan-steps/reorder', { items }),
  delete: (id) => api.delete(`/plan-steps/${id}`),
  getTemplates: () => api.get('/plan-steps/templates'),
  createTemplate: (data) => api.post('/plan-steps/templates', data),
  deleteTemplate: (id) => api.delete(`/plan-steps/templates/${id}`)
}

// ====== 上传 API ======
export const uploadApi = {
  image: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/upload/image', form)
  }
}

// ====== Push 通知 API ======
export const pushApi = {
  getVapidPublicKey: () => api.get('/push/vapid-public-key'),
  subscribe: (sub) => api.post('/push/subscribe', sub),
  unsubscribe: (endpoint, config = {}) => api.delete('/push/unsubscribe', { ...config, data: { endpoint } }),
  getStatus: () => api.get('/push/status'),
  sendTest: () => api.post('/push/test')
}

// ====== 通知中心 API ======
export const notificationApi = {
  getList: (params) => api.get('/notifications', { params }),
  getSummary: () => api.get('/notifications/summary'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markBatchRead: (ids) => api.patch('/notifications/read/batch', { ids }),
  markAllRead: (type = 'all') => api.patch('/notifications/read/all', { type })
}

export default api
