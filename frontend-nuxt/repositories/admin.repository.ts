export const adminRepository = {
  getStats: () => useApiClient()('/admin/stats'),
  getLogs: (params?: Record<string, unknown>) => useApiClient()('/admin/logs', { query: params }),
  cleanLogs: (days: number) => useApiClient()('/admin/logs/clean', { method: 'DELETE', query: { days } }),
  getUsers: (params?: Record<string, unknown>) => useApiClient()('/admin/users', { query: params }),
  getPushNotifications: () => useApiClient()('/admin/push/notifications'),
  sendPushNow: (data: Record<string, unknown>) =>
    useApiClient()('/admin/push/send', { method: 'POST', body: data }),
  createPushNotification: (data: Record<string, unknown>) =>
    useApiClient()('/admin/push/notifications', { method: 'POST', body: data }),
  sendPushNotificationNow: (id: number | string) =>
    useApiClient()(`/admin/push/notifications/${id}/send-now`, { method: 'POST' })
}

