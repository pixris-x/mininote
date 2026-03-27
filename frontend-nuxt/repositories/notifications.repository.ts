export const notificationsRepository = {
  getList: (params?: Record<string, unknown>) => useApiClient()('/notifications', { query: params }),
  getSummary: () => useApiClient()('/notifications/summary'),
  markRead: (id: number | string) => useApiClient()(`/notifications/${id}/read`, { method: 'PATCH' }),
  markBatchRead: (ids: Array<number | string>) =>
    useApiClient()('/notifications/read/batch', { method: 'PATCH', body: { ids } }),
  markAllRead: (type = 'all') => useApiClient()('/notifications/read/all', { method: 'PATCH', body: { type } })
}

