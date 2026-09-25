// ====== HTTP 客户端核心 ======
// 统一处理：URL 构建、超时、401 跳转、错误对象；各域 API 文件基于此封装。

const API_BASE_URL = '/api'
const API_TIMEOUT = 30000

function buildUrl(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)

  if (!params) return `${url.pathname}${url.search}`

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          url.searchParams.append(key, item)
        }
      })
      return
    }

    url.searchParams.append(key, value)
  })

  return `${url.pathname}${url.search}`
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

async function parseResponseBody(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  try {
    const text = await response.text()
    if (!text) return null

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  } catch {
    return null
  }
}

function createHttpError(message, { status = 0, data = null, url = '', field = undefined } = {}) {
  const error = new Error(message || '网络错误，请稍后重试')
  error.name = 'HttpError'
  error.status = status
  error.data = data
  error.response = { status, data, url }
  if (field) error.field = field
  return error
}

function isAuthEndpoint(url) {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/login/verify-2fa') ||
    url.includes('/auth/login/resend-2fa') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/register') ||
    url.includes('/auth/reset-password')
  )
}

function handleUnauthorized(url, data) {
  if (isAuthEndpoint(url)) return

  const code = data?.code
  const reason = code === 'SESSION_REPLACED'
    ? 'replaced'
    : code === 'SESSION_REVOKED'
      ? 'revoked'
      : code === 'SESSION_INVALID'
        ? 'invalid'
        : ''

  localStorage.removeItem('minilist_token')
  localStorage.removeItem('minilist_user')

  if (reason) {
    window.location.href = `/login?reason=${reason}`
  } else {
    window.location.href = '/login'
  }
}

async function request(method, path, config = {}) {
  const {
    params,
    data,
    headers = {},
    timeout = API_TIMEOUT
  } = config

  const url = buildUrl(path, params)
  const requestHeaders = new Headers(headers)
  const token = localStorage.getItem('minilist_token')

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  let body
  if (data !== undefined) {
    if (isFormData(data)) {
      body = data
      requestHeaders.delete('Content-Type')
    } else {
      body = JSON.stringify(data)
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json')
      }
    }
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body,
      signal: controller.signal,
      credentials: 'same-origin'
    })

    const responseData = await parseResponseBody(response)

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized(path, responseData)
      }

      throw createHttpError(
        responseData?.message || '网络错误，请稍后重试',
        {
          status: response.status,
          data: responseData,
          url,
          field: responseData?.field
        }
      )
    }

    return responseData
  } catch (error) {
    if (error?.name === 'HttpError') throw error

    if (error?.name === 'AbortError') {
      throw createHttpError('请求超时，请稍后重试', { url })
    }

    throw createHttpError('网络错误，请稍后重试', { url })
  } finally {
    window.clearTimeout(timer)
  }
}

export const api = {
  request,
  get: (url, config) => request('GET', url, config),
  post: (url, data, config = {}) => request('POST', url, { ...config, data }),
  put: (url, data, config = {}) => request('PUT', url, { ...config, data }),
  patch: (url, data, config = {}) => request('PATCH', url, { ...config, data }),
  delete: (url, config = {}) => request('DELETE', url, config)
}

export default api
