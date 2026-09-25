// ====== 认证 API ======
import { api } from './client'

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  verifyLogin2FA: (data) => api.post('/auth/login/verify-2fa', data),
  resendLogin2FA: (challenge_id) => api.post('/auth/login/resend-2fa', { challenge_id }),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  sendRegisterCode: (email) => api.post('/auth/send-register-code', { email })
}
