// ====== Push 订阅 / 通知中心 API ======
import { api } from './client'

export const pushApi = {
  getVapidPublicKey: () => api.get('/push/vapid-public-key'),
  subscribe: (sub) => api.post('/push/subscribe', sub),
  unsubscribe: (endpoint, config = {}) => api.delete('/push/unsubscribe', { ...config, data: { endpoint } }),
  getStatus: () => api.get('/push/status'),
  sendTest: () => api.post('/push/test')
}

export const notificationApi = {
  getList: (params) => api.get('/notifications', { params }),
  getSummary: () => api.get('/notifications/summary'),
  syncBirthdayReminders: (entries = []) => api.post('/notifications/birthday/sync', { entries }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markBatchRead: (ids) => api.patch('/notifications/read/batch', { ids }),
  markAllRead: (type = 'all') => api.patch('/notifications/read/all', { type })
}
