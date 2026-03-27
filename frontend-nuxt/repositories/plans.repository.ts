export const plansRepository = {
  getAll: (params?: Record<string, unknown>) => useApiClient()('/plans', { query: params }),
  getById: (id: number | string) => useApiClient()(`/plans/${id}`),
  create: (data: Record<string, unknown>) => useApiClient()('/plans', { method: 'POST', body: data }),
  update: (id: number | string, data: Record<string, unknown>) =>
    useApiClient()(`/plans/${id}`, { method: 'PUT', body: data }),
  delete: (id: number | string) => useApiClient()(`/plans/${id}`, { method: 'DELETE' }),
  share: (id: number | string, data: Record<string, unknown>) =>
    useApiClient()(`/plans/${id}/share`, { method: 'POST', body: data }),
  unshare: (id: number | string) => useApiClient()(`/plans/${id}/share`, { method: 'DELETE' }),
  importShare: (data: Record<string, unknown>) =>
    useApiClient()('/plans/import-share', { method: 'POST', body: data }),
  addCollaborator: (id: number | string, username: string) =>
    useApiClient()(`/plans/${id}/collaborators`, { method: 'POST', body: { username } }),
  removeCollaborator: (id: number | string, userId: number | string) =>
    useApiClient()(`/plans/${id}/collaborators/${userId}`, { method: 'DELETE' }),
  leave: (id: number | string) => useApiClient()(`/plans/${id}/leave`, { method: 'DELETE' }),
  getInvites: () => useApiClient()('/plans/invites'),
  acceptInvite: (id: number | string) =>
    useApiClient()(`/plans/${id}/collaborators/accept`, { method: 'POST' }),
  rejectInvite: (id: number | string) =>
    useApiClient()(`/plans/${id}/collaborators/reject`, { method: 'POST' })
}

export const planStepsRepository = {
  getByPlan: (planId: number | string) => useApiClient()('/plan-steps', { query: { plan_id: planId } }),
  create: (data: Record<string, unknown>) => useApiClient()('/plan-steps', { method: 'POST', body: data }),
  generate: (data: Record<string, unknown>) =>
    useApiClient()('/plan-steps/generate', { method: 'POST', body: data }),
  update: (id: number | string, data: Record<string, unknown>) =>
    useApiClient()(`/plan-steps/${id}`, { method: 'PUT', body: data }),
  reorder: (items: unknown[]) => useApiClient()('/plan-steps/reorder', { method: 'PATCH', body: { items } }),
  delete: (id: number | string) => useApiClient()(`/plan-steps/${id}`, { method: 'DELETE' }),
  getTemplates: () => useApiClient()('/plan-steps/templates'),
  createTemplate: (data: Record<string, unknown>) =>
    useApiClient()('/plan-steps/templates', { method: 'POST', body: data }),
  deleteTemplate: (id: number | string) =>
    useApiClient()(`/plan-steps/templates/${id}`, { method: 'DELETE' })
}

export const shareRepository = {
  getShareInfo: (token: string) => useApiClient()(`/share/${token}`),
  verifySharePin: (token: string, pin: string) =>
    useApiClient()(`/share/${token}/verify`, { method: 'POST', body: { pin } }),
  updateShareStepStatus: (token: string, stepId: number | string, status: string, pin: string) =>
    useApiClient()(`/share/${token}/steps/${stepId}/status`, {
      method: 'PATCH',
      body: { status, pin }
    })
}

