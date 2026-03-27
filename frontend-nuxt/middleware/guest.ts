import { readSessionToken } from '~/utils/session'

export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const token = readSessionToken()
  if (token) {
    return navigateTo('/notes')
  }
})
