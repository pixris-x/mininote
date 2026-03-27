import { readSessionToken, readSessionUser } from '~/utils/session'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const token = readSessionToken()
  if (!token) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const user = readSessionUser<{ is_admin?: boolean }>()
  if (!user?.is_admin) {
    return navigateTo('/notes')
  }
})
