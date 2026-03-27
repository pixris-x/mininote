export const userRepository = {
  getProfile: () => useApiClient()('/user/profile'),
  updateProfile: (data: Record<string, unknown>) =>
    useApiClient()('/user/profile', { method: 'PUT', body: data }),
  changePassword: (data: Record<string, unknown>) =>
    useApiClient()('/user/password', { method: 'PUT', body: data }),
  getSecurity: () => useApiClient()('/user/security'),
  sendTwoFactorCode: (action: string) =>
    useApiClient()('/user/security/2fa/send-code', { method: 'POST', body: { action } }),
  verifyTwoFactor: (action: string, code: string) =>
    useApiClient()('/user/security/2fa/verify', { method: 'POST', body: { action, code } }),
  sendEmailChangeCode: (newEmail: string, currentPassword: string) =>
    useApiClient()('/user/security/email/send-code', {
      method: 'POST',
      body: { new_email: newEmail, current_password: currentPassword }
    }),
  verifyEmailChange: (newEmail: string, code: string) =>
    useApiClient()('/user/security/email/verify', { method: 'POST', body: { new_email: newEmail, code } }),
  getSessions: () => useApiClient()('/user/sessions'),
  revokeSession: (sessionId: number | string) =>
    useApiClient()(`/user/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeOtherSessions: () => useApiClient()('/user/sessions', { method: 'DELETE' })
}

