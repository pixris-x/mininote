// ====== 记事 / 全局搜索 API ======
import { api } from './client'

export const notesApi = {
  getAll: (params) => api.get('/notes', { params }),
  getById: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`)
}

export const searchApi = {
  global: (params) => api.get('/search/global', { params })
}
