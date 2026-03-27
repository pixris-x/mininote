export const searchRepository = {
  global: (params?: Record<string, unknown>) => useApiClient()('/search/global', { query: params })
}

