// ====== 记账 / 消费分类 API ======
import { api } from './client'

export const expenseApi = {
  getList: (params) => api.get('/expenses', { params }),
  getStats: (year, month) => api.get('/expenses/stats', { params: { year, month } }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`)
}

export const expenseCategoryApi = {
  getAll: () => api.get('/expense-categories'),
  create: (data) => api.post('/expense-categories', data),
  update: (id, data) => api.put(`/expense-categories/${id}`, data),
  delete: (id) => api.delete(`/expense-categories/${id}`)
}
