import { readSessionToken } from '~/utils/session'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const token = readSessionToken()
  if (!token) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
