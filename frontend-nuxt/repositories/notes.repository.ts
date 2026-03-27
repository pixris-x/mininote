export const notesRepository = {
  getAll: (params?: Record<string, unknown>) => useApiClient()('/notes', { query: params }),
  getById: (id: number | string) => useApiClient()(`/notes/${id}`),
  create: (data: Record<string, unknown>) => useApiClient()('/notes', { method: 'POST', body: data }),
  update: (id: number | string, data: Record<string, unknown>) =>
    useApiClient()(`/notes/${id}`, { method: 'PUT', body: data }),
  delete: (id: number | string) => useApiClient()(`/notes/${id}`, { method: 'DELETE' })
}

