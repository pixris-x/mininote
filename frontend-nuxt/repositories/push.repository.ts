export const pushRepository = {
  getVapidPublicKey: () => useApiClient()('/push/vapid-public-key'),
  subscribe: (subscription: Record<string, unknown>) =>
    useApiClient()('/push/subscribe', { method: 'POST', body: subscription }),
  unsubscribe: (endpoint: string) =>
    useApiClient()('/push/unsubscribe', { method: 'DELETE', body: { endpoint } }),
  getStatus: () => useApiClient()('/push/status'),
  sendTest: () => useApiClient()('/push/test', { method: 'POST' })
}

