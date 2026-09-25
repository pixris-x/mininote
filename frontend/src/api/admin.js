// ====== 管理员 API ======
import { api } from './client'

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
