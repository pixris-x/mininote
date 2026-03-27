export const expenseRepository = {
  getList: (params?: Record<string, unknown>) => useApiClient()('/expenses', { query: params }),
  getStats: (year: number, month: number) => useApiClient()('/expenses/stats', { query: { year, month } }),
  create: (data: Record<string, unknown>) => useApiClient()('/expenses', { method: 'POST', body: data }),
  update: (id: number | string, data: Record<string, unknown>) =>
    useApiClient()(`/expenses/${id}`, { method: 'PUT', body: data }),
  delete: (id: number | string) => useApiClient()(`/expenses/${id}`, { method: 'DELETE' })
}

export const expenseCategoryRepository = {
  getAll: () => useApiClient()('/expense-categories'),
  create: (data: Record<string, unknown>) =>
    useApiClient()('/expense-categories', { method: 'POST', body: data }),
  update: (id: number | string, data: Record<string, unknown>) =>
    useApiClient()(`/expense-categories/${id}`, { method: 'PUT', body: data }),
  delete: (id: number | string) => useApiClient()(`/expense-categories/${id}`, { method: 'DELETE' })
}

