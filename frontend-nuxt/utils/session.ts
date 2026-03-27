export const SESSION_TOKEN_KEY = 'minilist_token'
export const SESSION_USER_KEY = 'minilist_user'

export function readSessionToken() {
  if (!import.meta.client) return ''
  return localStorage.getItem(SESSION_TOKEN_KEY) || ''
}

export function readSessionUser<T = Record<string, unknown>>() {
  if (!import.meta.client) return null
  try {
    return JSON.parse(localStorage.getItem(SESSION_USER_KEY) || 'null') as T | null
  } catch {
    return null
  }
}

export function clearSessionStorage() {
  if (!import.meta.client) return
  localStorage.removeItem(SESSION_TOKEN_KEY)
  localStorage.removeItem(SESSION_USER_KEY)
}

