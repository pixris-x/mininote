// ====== 计划 / 步骤 / 分享 API ======
import { api } from './client'

export const planApi = {
  getAll: (params) => api.get('/plans', { params }),
  getById: (id) => api.get(`/plans/${id}`),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
  share: (id, data) => api.post(`/plans/${id}/share`, data),
  unshare: (id) => api.delete(`/plans/${id}/share`),
  importShare: (data) => api.post('/plans/import-share', data),
  addCollaborator: (id, username) => api.post(`/plans/${id}/collaborators`, { username }),
  removeCollaborator: (id, userId) => api.delete(`/plans/${id}/collaborators/${userId}`),
  leave: (id) => api.delete(`/plans/${id}/leave`),
  getInvites: () => api.get('/plans/invites'),
  acceptInvite: (id) => api.post(`/plans/${id}/collaborators/accept`),
  rejectInvite: (id) => api.post(`/plans/${id}/collaborators/reject`)
}

export const shareApi = {
  getByToken: (token) => api.get(`/share/${token}`),
  verify: (token, pin) => api.post(`/share/${token}/verify`, { pin }),
  updateStepStatus: (token, stepId, status, pin) => api.patch(`/share/${token}/steps/${stepId}/status`, { status, pin })
}

export const planStepApi = {
  getByPlan: (plan_id) => api.get('/plan-steps', { params: { plan_id } }),
  create: (data) => api.post('/plan-steps', data),
  generate: (data) => api.post('/plan-steps/generate', data),
  update: (id, data) => api.put(`/plan-steps/${id}`, data),
  reorder: (items) => api.patch('/plan-steps/reorder', { items }),
  delete: (id) => api.delete(`/plan-steps/${id}`),
  getTemplates: () => api.get('/plan-steps/templates'),
  createTemplate: (data) => api.post('/plan-steps/templates', data),
  deleteTemplate: (id) => api.delete(`/plan-steps/templates/${id}`)
}
