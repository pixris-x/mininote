import { clearSessionStorage, readSessionToken } from '~/utils/session'

const AUTH_401_WHITELIST = [
  '/auth/login',
  '/auth/login/verify-2fa',
  '/auth/login/resend-2fa',
  '/auth/logout',
  '/auth/register',
  '/auth/reset-password'
]

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: runtimeConfig.public.apiBase as string,
    timeout: 12000,
    onRequest({ options }) {
      if (!import.meta.client) return

      const token = readSessionToken()
      if (!token) return

      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Authorization', `Bearer ${token}`)
      options.headers = headers
    },
    onRequestError({ error }) {
      throw createError({
        statusCode: 500,
        statusMessage: (error as Error)?.message || '网络错误，请检查后端服务是否启动'
      })
    },
    onResponseError({ request, response }) {
      const data = (response?._data as { code?: string; message?: string; field?: string } | undefined) || {}

      if (import.meta.client && response?.status === 401) {
        const requestUrl = typeof request === 'string' ? request : String(request || '')
        const isAuthEndpoint = AUTH_401_WHITELIST.some((path) => requestUrl.includes(path))

        if (!isAuthEndpoint) {
          const reason =
            data.code === 'SESSION_REPLACED'
              ? 'replaced'
              : data.code === 'SESSION_REVOKED'
                ? 'revoked'
                : data.code === 'SESSION_INVALID'
                  ? 'invalid'
                  : ''

          clearSessionStorage()
          const target = reason ? `/login?reason=${reason}` : '/login'
          if (window.location.pathname + window.location.search !== target) {
            window.location.href = target
          }
        }
      }

      throw createError({
        statusCode: response?.status || 500,
        statusMessage: data.message || '网络错误，请稍后重试',
        data
      })
    }
  })

  return {
    provide: {
      api
    }
  }
})
