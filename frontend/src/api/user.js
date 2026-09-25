// ====== 用户 API ======
import { api } from './client'

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/password', data),
  getSecurity: () => api.get('/user/security'),
  sendTwoFactorCode: (action) => api.post('/user/security/2fa/send-code', { action }),
  verifyTwoFactor: (action, code) => api.post('/user/security/2fa/verify', { action, code }),
  sendEmailChangeCode: (new_email, current_password) => api.post('/user/security/email/send-code', { new_email, current_password }),
  verifyEmailChange: (new_email, code) => api.post('/user/security/email/verify', { new_email, code }),
  getSessions: () => api.get('/user/sessions'),
  revokeSession: (sessionId) => api.delete(`/user/sessions/${sessionId}`),
  revokeOtherSessions: () => api.delete('/user/sessions')
}
