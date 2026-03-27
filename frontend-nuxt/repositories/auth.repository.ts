export const authRepository = {
  login: (data: Record<string, unknown>) =>
    useApiClient()('/auth/login', { method: 'POST', body: data }),
  verifyLogin2FA: (data: Record<string, unknown>) =>
    useApiClient()('/auth/login/verify-2fa', { method: 'POST', body: data }),
  resendLogin2FA: (challengeId: string) =>
    useApiClient()('/auth/login/resend-2fa', { method: 'POST', body: { challenge_id: challengeId } }),
  logout: () => useApiClient()('/auth/logout', { method: 'POST' }),
  register: (data: Record<string, unknown>) =>
    useApiClient()('/auth/register', { method: 'POST', body: data }),
  sendRegisterCode: (email: string) =>
    useApiClient()('/auth/send-register-code', { method: 'POST', body: { email } }),
  forgotPassword: (email: string) =>
    useApiClient()('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload: { email: string; code: string; newPassword: string }) =>
    useApiClient()('/auth/reset-password', { method: 'POST', body: payload })
}
